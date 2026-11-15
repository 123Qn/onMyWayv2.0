const pool = require("../config/database");

// Self-actions never notify (also enforced by the table's CHECK)
const create = async ({ userId, actorId, type, postId = null, commentId = null }) => {
  if (!userId || userId === actorId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES ($1, $2, $3, $4, $5)`,
    [userId, actorId, type, postId, commentId]
  );
};

// Undo a like/follow: its notification disappears too
const remove = ({ userId, actorId, type, postId = null }) =>
  pool.query(
    `DELETE FROM notifications
     WHERE user_id = $1 AND actor_id = $2 AND type = $3 AND post_id IS NOT DISTINCT FROM $4`,
    [userId, actorId, type, postId]
  );

const list = async (userId, { before, limit }) => {
  const { rows } = await pool.query(
    `SELECT n.id, n.type, n.post_id, n.read_at, n.created_at,
            a.id AS actor_id, a.name AS actor_name, a.avatar_frame AS actor_frame,
            p.kind AS post_kind, p.title AS post_title, p.caption AS post_caption, m.s3_key AS post_cover_key,
            c.body AS comment_body
     FROM notifications n
     JOIN users a ON a.id = n.actor_id
     LEFT JOIN posts p ON p.id = n.post_id
     LEFT JOIN media m ON m.id = p.cover_media_id
     LEFT JOIN comments c ON c.id = n.comment_id
     WHERE n.user_id = $1 AND ($2::timestamptz IS NULL OR n.created_at < $2)
     ORDER BY n.created_at DESC
     LIMIT $3`,
    [userId, before ?? null, limit]
  );
  return rows;
};

const unreadCount = async (userId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return rows[0].count;
};

const markAllRead = (userId) =>
  pool.query(`UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`, [userId]);

module.exports = { create, remove, list, unreadCount, markAllRead };
