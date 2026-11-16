const pool = require("../config/database");

// Counts and the viewer's own state, shared by the feed and single-post queries
const POST_SELECT = `
  SELECT p.id, p.kind, p.title, p.caption, p.category, p.place_name, p.country_name, p.country_code,
         p.trip_days, p.trip_day, p.verified, p.created_at,
         u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar, u.avatar_frame AS author_frame,
         cm.s3_key AS cover_key,
         (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)::int AS likes,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comments,
         (SELECT COUNT(*) FROM post_saves s WHERE s.post_id = p.id)::int AS saves,
         EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked,
         EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = $1) AS saved,
         EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = p.user_id) AS following,
         -- "Liked by ...": someone the viewer follows first, otherwise the latest liker
         (SELECT lu.name FROM post_likes l JOIN users lu ON lu.id = l.user_id
          WHERE l.post_id = p.id AND l.user_id <> $1
          ORDER BY EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = l.user_id) DESC,
                   l.created_at DESC
          LIMIT 1) AS liked_by,
         -- Faces of the latest people who commented (answered, for questions)
         ARRAY(SELECT cu.name FROM comments c JOIN users cu ON cu.id = c.user_id
               WHERE c.post_id = p.id GROUP BY cu.id, cu.name ORDER BY MAX(c.created_at) DESC LIMIT 3) AS commenters,
         -- Other travelers who followed this trip with the in-app map
         (SELECT COUNT(DISTINCT r.user_id) FROM trip_runs r WHERE r.post_id = p.id AND r.user_id <> p.user_id)::int AS took_trip
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN media cm ON cm.id = p.cover_media_id`;

const createPost = async (userId, post, stops) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO posts (user_id, kind, title, caption, category, place_name, country_name, country_code,
                          cover_media_id, trip_days, trip_day, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [userId, post.kind, post.title, post.caption, post.category, post.placeName, post.countryName,
       post.countryCode, post.coverMediaId, post.tripDays, post.tripDay, post.verified]
    );
    const postId = rows[0].id;
    for (const [position, s] of stops.entries()) {
      await client.query(
        `INSERT INTO post_stops (post_id, position, name, caption, media_id, latitude, longitude, from_photo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [postId, position, s.name, s.caption, s.mediaId, s.latitude, s.longitude, s.fromPhoto]
      );
    }
    await client.query("COMMIT");
    return postId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Newest first; "before" is the createdAt of the last post already loaded
const listFeed = async (viewerId, { before, limit, authorId }) => {
  const { rows } = await pool.query(
    `${POST_SELECT}
     WHERE p.status = 'published' AND p.visibility = 'public'
       AND ($2::timestamptz IS NULL OR p.created_at < $2)
       AND ($4::int IS NULL OR p.user_id = $4)
     ORDER BY p.created_at DESC
     LIMIT $3`,
    [viewerId, before ?? null, limit, authorId ?? null]
  );
  return rows;
};

// The viewer's "want to go" list, most recently saved first
const listSaved = async (viewerId, limit) => {
  const { rows } = await pool.query(
    `${POST_SELECT}
     JOIN post_saves mine ON mine.post_id = p.id AND mine.user_id = $1
     WHERE p.status = 'published'
     ORDER BY mine.created_at DESC
     LIMIT $2`,
    [viewerId, limit]
  );
  return rows;
};

const findPosts = async (viewerId, postIds) => {
  if (postIds.length === 0) return [];
  const { rows } = await pool.query(
    `${POST_SELECT} WHERE p.id = ANY($2::bigint[]) AND p.status = 'published'`,
    [viewerId, postIds]
  );
  return rows;
};

const findPost = async (viewerId, postId) => {
  const { rows } = await pool.query(`${POST_SELECT} WHERE p.id = $2 AND p.status = 'published'`, [viewerId, postId]);
  return rows[0];
};

const findStops = async (postIds) => {
  if (postIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT s.id, s.post_id, s.name, s.caption, s.latitude, s.longitude, s.from_photo, m.s3_key AS media_key
     FROM post_stops s LEFT JOIN media m ON m.id = s.media_id
     WHERE s.post_id = ANY($1::bigint[])
     ORDER BY s.post_id, s.position`,
    [postIds]
  );
  return rows;
};

// Author and type of a post, or undefined when it doesn't exist
const findOwner = async (postId) => {
  const { rows } = await pool.query(`SELECT user_id, kind FROM posts WHERE id = $1`, [postId]);
  return rows[0];
};

const deletePost = (postId) => pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);

// Likes and "want to go" saves share the same shape: (post_id, user_id).
// changed = whether a row was actually added/removed (repeat taps change nothing).
const setFlag = async (table, postId, userId, on) => {
  const result = on
    ? await pool.query(`INSERT INTO ${table} (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, userId])
    : await pool.query(`DELETE FROM ${table} WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE post_id = $1`, [postId]);
  return { count: rows[0].count, changed: result.rowCount > 0 };
};
const setLike = (postId, userId, on) => setFlag("post_likes", postId, userId, on);
const setSave = (postId, userId, on) => setFlag("post_saves", postId, userId, on);

const listComments = async (postId) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.body, c.created_at, c.parent_id, u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
            r.id AS reply_to_id, r.name AS reply_to_name
     FROM comments c JOIN users u ON u.id = c.user_id LEFT JOIN users r ON r.id = c.reply_to_user_id
     WHERE c.post_id = $1
     ORDER BY c.created_at`,
    [postId]
  );
  return rows;
};

// The comment being replied to: its author and which thread it belongs to
const findComment = async (postId, commentId) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, parent_id FROM comments WHERE id = $1 AND post_id = $2`,
    [commentId, postId]
  );
  return rows[0];
};

const addComment = async (postId, userId, body, { parentId = null, replyToUserId = null } = {}) => {
  const { rows } = await pool.query(
    `WITH c AS (
       INSERT INTO comments (post_id, user_id, body, parent_id, reply_to_user_id) VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT c.id, c.body, c.created_at, c.parent_id, u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
            r.id AS reply_to_id, r.name AS reply_to_name
     FROM c JOIN users u ON u.id = c.user_id LEFT JOIN users r ON r.id = c.reply_to_user_id`,
    [postId, userId, body, parentId, replyToUserId]
  );
  return rows[0];
};

// Returns whether the follow was actually added/removed
const setFollow = async (followerId, followingId, on) => {
  const result = on
    ? await pool.query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [followerId, followingId]
      )
    : await pool.query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [followerId, followingId]);
  return result.rowCount > 0;
};

module.exports = {
  createPost,
  listFeed,
  listSaved,
  findPosts,
  findPost,
  findStops,
  findOwner,
  deletePost,
  setLike,
  setSave,
  listComments,
  findComment,
  addComment,
  setFollow,
};
