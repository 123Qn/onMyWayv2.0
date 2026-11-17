const profileModel = require("../models/profile.model");
const { countryName } = require("./community.service");

const FRAMES = ["none", "classic", "road", "wave", "summit", "compass", "stamp", "sunrise", "jet", "tropical", "aurora", "laurel"];
const CATEGORIES = ["beach", "island", "mountain", "city", "food", "nature", "culture"];
const BETA_ENDS = new Date("2027-01-01T00:00:00Z");

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Great-circle distance in km
const haversine = (a, b) => {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
};

/**
 * Travel stats from verified posts only, in the shape of the app's badge metrics.
 * "helpful" has no data source yet and stays 0.
 */
const computeStats = (posts, social, joinedAt, now = new Date()) => {
    const countries = new Set();
    const places = new Set();
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    const specials = new Set();
    let km = 0;
    let trips = 0;
    let moments = 0;
    let north = false;
    let south = false;

    for (const post of posts) {
        if (post.country_code) countries.add(post.country_code);
        if (post.category in byCategory) byCategory[post.category] += 1;
        if (post.kind === "trip") trips += 1;
        if (post.kind === "moment") moments += 1;

        const stops = post.stops.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }));
        let tripKm = 0;
        stops.forEach((s, i) => {
            // ~1 km grid so the same spot posted twice counts once
            places.add(`${s.lat.toFixed(2)},${s.lng.toFixed(2)}`);
            if (s.lat > 0) north = true;
            if (s.lat < 0) south = true;
            if (s.lat >= 66.5) specials.add("arctic");
            if (i > 0) tripKm += haversine(stops[i - 1], s);
        });
        km += tripKm;

        if (post.kind === "trip") {
            if (post.trip_days === 2) specials.add("weekend");
            if (post.trip_days >= 14) specials.add("long_haul");
            if (tripKm >= 1000) specials.add("road_trip");
        }
        const created = new Date(post.created_at);
        if (created.getUTCMonth() === 0 && created.getUTCDate() === 1) specials.add("new_year");
    }
    if (north && south) specials.add("equator");
    if (joinedAt < BETA_ENDS) specials.add("founder");

    const months = Math.max(0, Math.floor((now - joinedAt) / (30.44 * 24 * 3600 * 1000)));

    return {
        countries: countries.size,
        places: places.size,
        // Pin-to-pin distance of verified posts plus GPS distance recorded during trip runs
        km: Math.round(km + (social.run_km ?? 0)),
        ...byCategory,
        trips,
        moments,
        followers: social.followers,
        tookTrip: social.took_trip ?? 0,
        likes: social.likes,
        helpful: 0,
        months,
        specials: [...specials],
    };
};

const getProfile = async (viewer, userId) => {
    const id = toId(userId);
    const user = id && (await profileModel.findProfileUser(id));
    if (!user) throw httpError(404, "User not found.");

    const [social, posts] = await Promise.all([
        profileModel.countSocial(id, viewer.id),
        profileModel.findVerifiedPosts(id),
    ]);

    return {
        user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatar_url ?? null,
            frame: user.avatar_frame,
            pinnedBadges: user.pinned_badges,
            bio: user.bio ?? null,
            countryCode: user.country_code ?? null,
            country: countryName(user.country_code),
            joinedAt: user.created_at.toISOString(),
        },
        counts: { posts: social.posts, followers: social.followers, following: social.following },
        followedByViewer: social.followed_by_viewer,
        // official: the app unlocks every badge (and so the top level) for onMyWay team accounts
        stats: { ...computeStats(posts, social, user.created_at), official: user.role === "official" },
    };
};

const updateRewards = async (user, body) => {
    const frame = body?.frame;
    const pinned = body?.pinnedBadges;
    if (frame !== undefined && !FRAMES.includes(frame)) throw httpError(400, "Unknown frame.");
    if (
        pinned !== undefined &&
        (!Array.isArray(pinned) || pinned.length > 3 || pinned.some((b) => typeof b !== "string" || !/^[a-z0-9_]{1,40}$/.test(b)))
    ) {
        throw httpError(400, "You can pin up to 3 badges.");
    }
    const row = await profileModel.updateRewards(user.id, {
        frame,
        pinnedBadges: pinned === undefined ? undefined : [...new Set(pinned)],
    });
    return { frame: row.avatar_frame, pinnedBadges: row.pinned_badges };
};

/**
 * Edit my profile: name, bio, country and photo. Only the fields sent change;
 * avatarMediaId must be one of my uploads, null removes the photo.
 */
const updateProfile = async (user, body, toUrl) => {
    const patch = {};
    if (body?.name !== undefined) {
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
        if (!name) throw httpError(400, "Your name can't be empty.");
        patch.name = name;
    }
    if (body?.bio !== undefined) {
        patch.bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim().slice(0, 300) : null;
    }
    if (body?.countryCode !== undefined) {
        const code = typeof body.countryCode === "string" ? body.countryCode.toUpperCase() : null;
        if (code && !/^[A-Z]{2}$/.test(code)) throw httpError(400, "Unknown country.");
        patch.country_code = code || null;
    }
    if (body?.avatarMediaId !== undefined) {
        if (body.avatarMediaId === null) patch.avatar_url = null;
        else {
            const key = await profileModel.findOwnedMediaKey(user.id, toId(body.avatarMediaId));
            if (!key) throw httpError(400, "That photo could not be found.");
            patch.avatar_url = toUrl(key);
        }
    }
    await profileModel.updateProfile(user.id, patch);
    return getProfile(user, user.id);
};

module.exports = { computeStats, getProfile, updateRewards, updateProfile };
