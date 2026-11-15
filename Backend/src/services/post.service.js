const postModel = require("../models/post.model");
const mediaModel = require("../models/media.model");
const userModel = require("../models/user.model");
const notificationModel = require("../models/notification.model");

const KINDS = ["trip", "moment", "question"];
const CATEGORIES = ["beach", "island", "mountain", "city", "nature", "culture", "food", "other"];
const MAX_STOPS = 15;

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const optionalInt = (value, min, max) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const parseStop = (raw, index) => {
    const name = text(raw?.name, 100);
    const latitude = Number(raw?.latitude);
    const longitude = Number(raw?.longitude);
    if (!name) throw httpError(400, `Location ${index + 1} needs a name.`);
    if (!(Math.abs(latitude) <= 90) || !(Math.abs(longitude) <= 180)) {
        throw httpError(400, `Location ${index + 1} needs a pin on the map.`);
    }
    return {
        name,
        caption: text(raw?.caption, 1000) || null,
        mediaId: toId(raw?.mediaId),
        latitude,
        longitude,
        fromPhoto: raw?.fromPhoto === true,
    };
};

// Validates the body the app sends and returns rows ready to insert
const parsePost = (body) => {
    const kind = KINDS.includes(body?.kind) ? body.kind : null;
    if (!kind) throw httpError(400, "Unknown post type.");

    const caption = text(body.caption, 2000) || null;
    const category = CATEGORIES.includes(body.category) ? body.category : "other";
    const rawStops = Array.isArray(body.stops) ? body.stops : [];
    const stops = kind === "question" ? [] : rawStops.slice(0, MAX_STOPS).map(parseStop);

    const post = {
        kind,
        title: kind === "trip" ? text(body.title, 120) : null,
        caption,
        category,
        placeName: text(body.place?.name, 150) || stops[0]?.name || null,
        countryName: text(body.place?.country, 100) || null,
        countryCode: /^[A-Za-z]{2}$/.test(body.place?.countryCode ?? "") ? body.place.countryCode.toUpperCase() : null,
        coverMediaId: toId(body.coverMediaId),
        tripDays: kind === "trip" ? optionalInt(body.tripDays, 1, 365) : null,
        tripDay: optionalInt(body.tripDay, 1, 365),
        // Verified only when every pin is the photo's own GPS. Recomputed here, not taken from the client.
        verified: stops.length > 0 && stops.every((s) => s.fromPhoto),
    };

    if (kind === "trip") {
        if (!post.title) throw httpError(400, "A trip needs a title.");
        if (!post.coverMediaId) throw httpError(400, "A trip needs a cover photo.");
        if (stops.length === 0) throw httpError(400, "A trip needs at least one location.");
        if (stops.some((s) => !s.mediaId)) throw httpError(400, "Every location needs a photo.");
    }
    if (kind === "moment") {
        // Moments are live: one photo pinned by the device GPS at capture time
        if (stops.length !== 1 || !stops[0].fromPhoto || !stops[0].mediaId) {
            throw httpError(400, "A moment needs one photo taken with your current location.");
        }
        post.coverMediaId = stops[0].mediaId;
        if (!caption) throw httpError(400, "Add a caption to your moment.");
    }
    if (kind === "question") {
        if (!caption) throw httpError(400, "Write your question.");
        if (!post.placeName) throw httpError(400, "Which place is your question about?");
    }
    return { post, stops };
};

const createPost = async (user, body, toUrl) => {
    const { post, stops } = parsePost(body);

    // Photos must be the author's own uploads
    const mediaIds = [post.coverMediaId, ...stops.map((s) => s.mediaId)].filter(Boolean);
    const owned = await mediaModel.findOwnedMediaIds(user.id, mediaIds);
    if (mediaIds.some((id) => !owned.has(id))) throw httpError(400, "One of the photos could not be found.");

    const id = await postModel.createPost(user.id, post, stops);
    return getPost(user, id, toUrl);
};

// Database rows -> the shape the app renders
const serialize = (row, stops, toUrl) => ({
    id: Number(row.id),
    kind: row.kind,
    title: row.title ?? undefined,
    author: { id: row.author_id, name: row.author_name, avatarUrl: row.author_avatar ?? undefined },
    place: { name: row.place_name ?? "", country: row.country_name ?? "", countryCode: row.country_code ?? "" },
    category: row.category,
    imageUrl: toUrl(row.cover_key) ?? "",
    caption: row.caption ?? "",
    tripDays: row.trip_days ?? undefined,
    tripDay: row.trip_day ?? undefined,
    verified: row.verified,
    createdAt: row.created_at.toISOString(),
    likes: row.likes,
    comments: row.comments,
    wantToGo: row.saves,
    liked: row.liked,
    saved: row.saved,
    followingAuthor: row.following,
    stops: stops.map((s) => ({
        id: String(s.id),
        name: s.name,
        caption: s.caption ?? "",
        imageUrl: toUrl(s.media_key) ?? "",
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        fromPhoto: s.from_photo,
    })),
});

const withStops = async (rows, toUrl) => {
    const stops = await postModel.findStops(rows.map((r) => r.id));
    return rows.map((row) => serialize(row, stops.filter((s) => s.post_id === row.id), toUrl));
};

const listFeed = async (user, query, toUrl) => {
    const limit = optionalInt(query.limit, 1, 50) ?? 20;
    const before = query.before && !Number.isNaN(Date.parse(query.before)) ? query.before : null;
    const authorId = toId(query.author);
    const rows = await postModel.listFeed(user.id, { before, limit, authorId });
    return withStops(rows, toUrl);
};

const getPost = async (user, postId, toUrl) => {
    const id = toId(postId);
    const row = id && (await postModel.findPost(user.id, id));
    if (!row) throw httpError(404, "This post is no longer available.");
    const [post] = await withStops([row], toUrl);
    return post;
};

const requirePost = async (postId) => {
    const id = toId(postId);
    const row = id && (await postModel.findOwner(id));
    if (!row) throw httpError(404, "This post is no longer available.");
    return { id, owner: row.user_id, kind: row.kind };
};

const deletePost = async (user, postId) => {
    const { id, owner } = await requirePost(postId);
    if (owner !== user.id) throw httpError(403, "You can only delete your own posts.");
    await postModel.deletePost(id);
};

const setLike = async (user, postId, on) => {
    const { id, owner } = await requirePost(postId);
    const { count, changed } = await postModel.setLike(id, user.id, on);
    if (changed) {
        const n = { userId: owner, actorId: user.id, type: "like", postId: id };
        await (on ? notificationModel.create(n) : notificationModel.remove(n));
    }
    return { liked: on, likes: count };
};

const setSave = async (user, postId, on) => {
    const { id } = await requirePost(postId);
    return { saved: on, wantToGo: (await postModel.setSave(id, user.id, on)).count };
};

const serializeComment = (row) => ({
    id: String(row.id),
    author: { id: row.author_id, name: row.author_name },
    text: row.body,
    createdAt: row.created_at.toISOString(),
});

const listComments = async (postId) => {
    const { id } = await requirePost(postId);
    return (await postModel.listComments(id)).map(serializeComment);
};

const addComment = async (user, postId, body) => {
    const { id, owner, kind } = await requirePost(postId);
    const comment = text(body?.text, 2000);
    if (!comment) throw httpError(400, "Write a comment first.");
    const row = await postModel.addComment(id, user.id, comment);
    await notificationModel.create({
        userId: owner,
        actorId: user.id,
        type: kind === "question" ? "answer" : "comment",
        postId: id,
        commentId: row.id,
    });
    return serializeComment(row);
};

const setFollow = async (user, targetId, on) => {
    const id = toId(targetId);
    if (!id || !(await userModel.findUserById(id))) throw httpError(404, "User not found.");
    if (id === user.id) throw httpError(400, "You can't follow yourself.");
    if (await postModel.setFollow(user.id, id, on)) {
        const n = { userId: id, actorId: user.id, type: "follow" };
        await (on ? notificationModel.create(n) : notificationModel.remove(n));
    }
    return { following: on };
};

module.exports = {
    parsePost,
    createPost,
    listFeed,
    getPost,
    deletePost,
    setLike,
    setSave,
    listComments,
    addComment,
    setFollow,
};
