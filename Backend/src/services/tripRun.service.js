const pool = require("../config/database");
const postService = require("./post.service");

const ROUTING_URL = process.env.ROUTING_URL || "https://router.project-osrm.org";
const VISIT_RADIUS_KM = 0.25;
const MAX_ACCURACY_M = 100;    // ignore fixes worse than this
const MIN_STEP_KM = 0.03;      // ignore GPS jitter
const MAX_SPEED_KMH = 250;     // faster than this between two fixes is not a real move
const MAX_POINTS_PER_BATCH = 200;

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const haversine = (a, b) => {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
};

// ---------------------------------------------------------------------------
// Road route through points (proxied so the provider can change without an app update)
// ---------------------------------------------------------------------------
const routeCache = new Map();
const CACHE_SIZE = 200;

const getRoute = async (pointsParam) => {
    const points = String(pointsParam || "")
        .split(";")
        .map((p) => p.split(",").map(Number))
        .filter(([lat, lng]) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
    if (points.length < 2 || points.length > 25) throw httpError(400, "Send between 2 and 25 points.");

    // ~10 m grid so tiny GPS changes reuse the cached route
    const key = points.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join(";");
    if (routeCache.has(key)) return routeCache.get(key);

    const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const res = await fetch(`${ROUTING_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`, {
        signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    const json = res && res.ok ? await res.json().catch(() => null) : null;
    const route = json?.code === "Ok" ? json.routes[0] : null;
    if (!route) throw httpError(502, "Couldn't find a route right now.");

    const result = {
        // [lat, lng] pairs, the order the app's map uses
        coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distanceKm: Math.round(route.distance / 100) / 10,
        durationMin: Math.round(route.duration / 60),
    };
    if (routeCache.size >= CACHE_SIZE) routeCache.delete(routeCache.keys().next().value);
    routeCache.set(key, result);
    return result;
};

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
const serialize = (row) => ({
    id: Number(row.id),
    postId: row.post_id ? Number(row.post_id) : null,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
    distanceKm: Number(row.distance_km),
    visitedStops: row.visited_stops.map(String),
    lastPosition: row.last_lat !== null ? { latitude: Number(row.last_lat), longitude: Number(row.last_lng), at: row.last_at.toISOString() } : null,
});

const findRun = async (userId, runId) => {
    const { rows } = await pool.query(`SELECT * FROM trip_runs WHERE id = $1 AND user_id = $2`, [runId, userId]);
    if (!rows[0]) throw httpError(404, "Trip not found.");
    return rows[0];
};

const startRun = async (user, body) => {
    const postId = toId(body?.postId);
    if (!postId) throw httpError(400, "Which trip are you starting?");
    const { rows: posts } = await pool.query(`SELECT id FROM posts WHERE id = $1 AND status = 'published'`, [postId]);
    if (!posts[0]) throw httpError(404, "This post is no longer available.");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Starting a new trip ends the previous one
        await client.query(`UPDATE trip_runs SET ended_at = NOW() WHERE user_id = $1 AND ended_at IS NULL`, [user.id]);
        const { rows } = await client.query(
            `INSERT INTO trip_runs (user_id, post_id) VALUES ($1, $2) RETURNING *`,
            [user.id, postId]
        );
        await client.query("COMMIT");
        return serialize(rows[0]);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const activeRun = async (user) => {
    const { rows } = await pool.query(`SELECT * FROM trip_runs WHERE user_id = $1 AND ended_at IS NULL`, [user.id]);
    return rows[0] ? serialize(rows[0]) : null;
};

const addPoints = async (user, runId, body) => {
    const run = await findRun(user.id, toId(runId));
    if (run.ended_at) throw httpError(409, "This trip has already ended.");

    const incoming = (Array.isArray(body?.points) ? body.points : [])
        .slice(0, MAX_POINTS_PER_BATCH)
        .map((p) => ({
            lat: Number(p?.latitude),
            lng: Number(p?.longitude),
            accuracy: p?.accuracy == null ? null : Number(p.accuracy),
            at: new Date(p?.recordedAt),
        }))
        .filter((p) => Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !Number.isNaN(p.at.getTime()))
        // A first fix can be a cached one from just before Start: allow 2 minutes of slack
        .filter((p) => p.at <= new Date(Date.now() + 60_000) && p.at >= new Date(run.started_at.getTime() - 120_000))
        .filter((p) => p.accuracy === null || p.accuracy <= MAX_ACCURACY_M)
        .sort((a, b) => a.at - b.at);

    let last = run.last_lat !== null ? { lat: Number(run.last_lat), lng: Number(run.last_lng), at: run.last_at } : null;
    let distance = Number(run.distance_km);
    const accepted = [];

    for (const p of incoming) {
        if (last && p.at <= last.at) continue;
        if (last) {
            const km = haversine(last, p);
            const hours = (p.at - last.at) / 3_600_000;
            if (hours > 0 && km / hours > MAX_SPEED_KMH) continue;  // teleport / fake GPS
            if (km < MIN_STEP_KM) continue;                         // standing still
            distance += km;
        }
        accepted.push(p);
        last = p;
    }

    // Stops of the followed trip that this batch came close to
    const { rows: stops } = run.post_id
        ? await pool.query(`SELECT id, latitude, longitude FROM post_stops WHERE post_id = $1`, [run.post_id])
        : { rows: [] };
    const visited = new Set(run.visited_stops.map(Number));
    for (const s of stops) {
        const stop = { lat: Number(s.latitude), lng: Number(s.longitude) };
        if (accepted.some((p) => haversine(p, stop) <= VISIT_RADIUS_KM)) visited.add(Number(s.id));
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const p of accepted) {
            await client.query(
                `INSERT INTO trip_run_points (run_id, recorded_at, latitude, longitude, accuracy_m)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                [run.id, p.at, p.lat, p.lng, p.accuracy]
            );
        }
        const { rows } = await client.query(
            `UPDATE trip_runs
             SET distance_km = $2, visited_stops = $3,
                 last_lat = COALESCE($4, last_lat), last_lng = COALESCE($5, last_lng), last_at = COALESCE($6, last_at)
             WHERE id = $1 RETURNING *`,
            [run.id, distance, [...visited], last?.lat ?? null, last?.lng ?? null, last?.at ?? null]
        );
        await client.query("COMMIT");
        return { ...serialize(rows[0]), accepted: accepted.length };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const endRun = async (user, runId) => {
    const run = await findRun(user.id, toId(runId));
    const { rows } = await pool.query(
        `UPDATE trip_runs SET ended_at = COALESCE(ended_at, NOW()) WHERE id = $1 RETURNING *`,
        [run.id]
    );
    return serialize(rows[0]);
};

// Finished trips, newest first, each with the post it followed
const listRuns = async (user, query, toUrl) => {
    const limit = Math.min(Math.max(Number.parseInt(query?.limit, 10) || 30, 1), 50);
    const { rows } = await pool.query(
        `SELECT * FROM trip_runs WHERE user_id = $1 AND ended_at IS NOT NULL ORDER BY started_at DESC LIMIT $2`,
        [user.id, limit]
    );
    const posts = await postService.getPostsById(user, [...new Set(rows.map((r) => r.post_id).filter(Boolean))], toUrl);
    return rows.map((row) => {
        const run = serialize(row);
        return { ...run, post: (run.postId && posts.get(run.postId)) || null };
    });
};

const getTrack = async (user, runId) => {
    const run = await findRun(user.id, toId(runId));
    const { rows } = await pool.query(
        `SELECT latitude, longitude FROM trip_run_points WHERE run_id = $1 ORDER BY recorded_at`,
        [run.id]
    );
    return rows.map((r) => [Number(r.latitude), Number(r.longitude)]);
};

module.exports = { getRoute, startRun, activeRun, listRuns, addPoints, endRun, getTrack, haversine };
