const pool = require("../config/database");

const findProfileUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT id, name, avatar_url, avatar_frame, pinned_badges, created_at FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0];
};

const countSocial = async (userId, viewerId) => {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND status = 'published')::int AS posts,
       (SELECT COUNT(*) FROM follows WHERE following_id = $1)::int AS followers,
       (SELECT COUNT(*) FROM follows WHERE follower_id = $1)::int AS following,
       (SELECT COUNT(*) FROM post_likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = $1)::int AS likes,
       -- Real distance recorded with the in-app trip map
       (SELECT COALESCE(SUM(distance_km), 0) FROM trip_runs WHERE user_id = $1)::float AS run_km,
       -- Other travelers who actually followed one of my trips (reached a stop or moved 1 km+)
       (SELECT COUNT(DISTINCT r.user_id) FROM trip_runs r JOIN posts p ON p.id = r.post_id
         WHERE p.user_id = $1 AND r.user_id <> $1
           AND (cardinality(r.visited_stops) > 0 OR r.distance_km >= 1))::int AS took_trip,
       EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) AS followed_by_viewer`,
    [userId, viewerId]
  );
  return rows[0];
};

// Verified posts with their pins: the only thing that counts toward badges
const findVerifiedPosts = async (userId) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.kind, p.category, p.country_code, p.trip_days, p.created_at,
            COALESCE(json_agg(json_build_object('lat', s.latitude, 'lng', s.longitude) ORDER BY s.position)
                     FILTER (WHERE s.id IS NOT NULL), '[]') AS stops
     FROM posts p
     LEFT JOIN post_stops s ON s.post_id = p.id
     WHERE p.user_id = $1 AND p.status = 'published' AND p.verified
     GROUP BY p.id`,
    [userId]
  );
  return rows;
};

const updateRewards = async (userId, { frame, pinnedBadges }) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET avatar_frame = COALESCE($2, avatar_frame), pinned_badges = COALESCE($3, pinned_badges)
     WHERE id = $1
     RETURNING avatar_frame, pinned_badges`,
    [userId, frame ?? null, pinnedBadges ?? null]
  );
  return rows[0];
};

module.exports = { findProfileUser, countSocial, findVerifiedPosts, updateRewards };
