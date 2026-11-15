const pool = require("../config/database");

const createMedia = async ({ ownerId, key, mimeType, sizeBytes }) => {
  const { rows } = await pool.query(
    `INSERT INTO media (owner_id, s3_key, mime_type, size_bytes, status)
     VALUES ($1, $2, $3, $4, 'ready')
     RETURNING id, s3_key AS key`,
    [ownerId, key, mimeType, sizeBytes]
  );
  return rows[0];
};

// Ids from the list that exist, are ready and belong to the owner
const findOwnedMediaIds = async (ownerId, ids) => {
  if (ids.length === 0) return new Set();
  const { rows } = await pool.query(
    `SELECT id FROM media WHERE owner_id = $1 AND status = 'ready' AND id = ANY($2::bigint[])`,
    [ownerId, ids]
  );
  return new Set(rows.map((r) => Number(r.id)));
};

module.exports = { createMedia, findOwnedMediaIds };
