const pool = require("../config/database");

const PERIODS = { week: 7, month: 30, all: null };
const METRICS = ["km", "countries", "trips"];
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

const countryName = (code) => {
    if (!code) return null;
    try {
        return countryNames.of(code) ?? code;
    } catch {
        return code;
    }
};

const limitOf = (value, fallback) => Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), 50);

// A traveler as the Community lists show them
const TRAVELER_SELECT = `
  SELECT u.id, u.name, u.avatar_frame, u.avatar_url, u.country_code, u.bio,
         (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id)::int AS followers,
         (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.status = 'published')::int AS posts,
         EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id) AS following`;

const serializeTraveler = (row) => ({
    id: row.id,
    name: row.name,
    frame: row.avatar_frame,
    avatarUrl: row.avatar_url ?? null,
    countryCode: row.country_code ?? null,
    country: countryName(row.country_code),
    bio: row.bio ?? null,
    followers: row.followers,
    posts: row.posts,
    following: row.following,
});

/** Everyone who has posted, most followed first; ?q= matches a name or a country (code or name) */
const listTravelers = async (viewer, query) => {
    const q = typeof query?.q === "string" ? query.q.trim().slice(0, 50) : "";
    // Countries whose English name matches, so "japan" finds JP travelers
    const codes = q
        ? [...new Set(
              (await pool.query(`SELECT DISTINCT country_code FROM users WHERE country_code IS NOT NULL`)).rows
                  .map((r) => r.country_code)
                  .filter((code) => code.toLowerCase() === q.toLowerCase() || countryName(code).toLowerCase().includes(q.toLowerCase()))
          )]
        : [];
    const { rows } = await pool.query(
        `${TRAVELER_SELECT}
         FROM users u
         WHERE u.id <> $1
           AND EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.status = 'published')
           AND ($2 = '' OR u.name ILIKE '%' || $2 || '%' OR u.country_code = ANY($3::char(2)[]))
         ORDER BY followers DESC, u.name
         LIMIT $4`,
        [viewer.id, q, codes, limitOf(query?.limit, 30)]
    );
    return rows.map(serializeTraveler);
};

/**
 * People to follow: ones followed by people I follow first, then travelers from my country,
 * then the most followed. Never someone I already follow.
 */
const suggestTravelers = async (viewer, query) => {
    const { rows } = await pool.query(
        `${TRAVELER_SELECT},
                (SELECT COUNT(*) FROM follows mine JOIN follows theirs ON theirs.follower_id = mine.following_id
                 WHERE mine.follower_id = $1 AND theirs.following_id = u.id)::int AS mutual,
                (u.country_code IS NOT NULL AND u.country_code = (SELECT country_code FROM users WHERE id = $1)) AS same_country
         FROM users u
         WHERE u.id <> $1
           AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id)
           AND EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.status = 'published')
         ORDER BY mutual DESC, same_country DESC, followers DESC, u.id
         LIMIT $2`,
        [viewer.id, limitOf(query?.limit, 10)]
    );
    return rows.map((row) => ({
        ...serializeTraveler(row),
        reason: row.mutual > 0 ? { type: "friends", count: row.mutual } : row.same_country ? { type: "country" } : { type: "popular" },
    }));
};

// Per-user score for each leaderboard. $1 = start of the period (NULL = all time).
const SCORES = {
    // Kilometres actually recorded with the in-app map
    km: `SELECT user_id, SUM(distance_km)::float AS value FROM trip_runs
         WHERE ($1::timestamptz IS NULL OR started_at >= $1) GROUP BY user_id HAVING SUM(distance_km) > 0`,
    // Countries from verified posts (the same source as the profile stats)
    countries: `SELECT user_id, COUNT(DISTINCT country_code)::float AS value FROM posts
                WHERE verified AND status = 'published' AND country_code IS NOT NULL
                  AND ($1::timestamptz IS NULL OR created_at >= $1) GROUP BY user_id`,
    // Finished trips that actually went somewhere
    trips: `SELECT user_id, COUNT(*)::float AS value FROM trip_runs
            WHERE ended_at IS NOT NULL AND (distance_km > 0 OR cardinality(visited_stops) > 0)
              AND ($1::timestamptz IS NULL OR started_at >= $1) GROUP BY user_id`,
};

const leaderboard = async (viewer, query) => {
    const metric = METRICS.includes(query?.metric) ? query.metric : "km";
    const period = query?.period in PERIODS ? query.period : "month";
    const days = PERIODS[period];
    const since = days ? new Date(Date.now() - days * 24 * 3600 * 1000) : null;

    const { rows } = await pool.query(
        `WITH scores AS (${SCORES[metric]}),
              ranked AS (SELECT user_id, value, RANK() OVER (ORDER BY value DESC) AS rank FROM scores)
         SELECT r.rank::int, r.value, u.id, u.name, u.avatar_frame, u.avatar_url, u.country_code
         FROM ranked r JOIN users u ON u.id = r.user_id
         WHERE r.rank <= $2 OR u.id = $3
         ORDER BY r.rank, u.name`,
        [since, limitOf(query?.limit, 20), viewer.id]
    );
    const entry = (row) => ({
        rank: row.rank,
        value: Math.round(row.value * 10) / 10,
        user: { id: row.id, name: row.name, frame: row.avatar_frame, avatarUrl: row.avatar_url ?? null, countryCode: row.country_code ?? null },
    });
    const top = rows.filter((r) => r.rank <= limitOf(query?.limit, 20));
    const mine = rows.find((r) => r.id === viewer.id);
    return { metric, period, entries: top.map(entry), me: mine ? entry(mine) : null };
};

const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

/** Who follows a traveler (followers) or whom they follow (following), most recent first */
const listFollows = async (viewer, userId, which) => {
    const id = toId(userId);
    if (!id) return [];
    const [match, other] = which === "followers" ? ["following_id", "follower_id"] : ["follower_id", "following_id"];
    const { rows } = await pool.query(
        `${TRAVELER_SELECT}
         FROM follows x JOIN users u ON u.id = x.${other}
         WHERE x.${match} = $2
         ORDER BY x.created_at DESC
         LIMIT 200`,
        [viewer.id, id]
    );
    return rows.map(serializeTraveler);
};

// Every ISO 3166 country the runtime knows a name for (no regions like EU or test codes)
const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ", "AC", "CP", "CQ", "DG", "EA", "IC", "TA", "XK"]);
let countries = null;
const listCountries = () => {
    if (!countries) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        countries = [];
        for (const a of letters) {
            for (const b of letters) {
                const code = a + b;
                const name = countryName(code);
                // Old codes (VD, UK, SU...) canonicalize to today's code and would show twice
                const current = Intl.getCanonicalLocales(`und-${code}`)[0] === `und-${code}`;
                if (current && !NOT_COUNTRIES.has(code) && name && name !== code && !/unknown/i.test(name)) countries.push({ code, name });
            }
        }
        countries.sort((x, y) => x.name.localeCompare(y.name));
    }
    return countries;
};

module.exports = { listTravelers, suggestTravelers, leaderboard, listFollows, listCountries, countryName };
