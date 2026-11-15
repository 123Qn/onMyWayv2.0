const pool = require("../config/database");

const createSession = async ({ userId, refreshTokenHash, expiresAt, deviceName, userAgent, ipAddress }) => {
  const { rows } = await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, device_name, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, refreshTokenHash, expiresAt, deviceName, userAgent, ipAddress]
  );
  return rows[0];
};

const findSessionByHash = async (refreshTokenHash) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, expires_at, revoked_at
     FROM sessions WHERE refresh_token_hash = $1`,
    [refreshTokenHash]
  );
  return rows[0];
};

// Swap the refresh token of an active session (rotation). Returns false if it was already revoked/rotated.
const rotateSession = async (id, oldHash, newHash, expiresAt) => {
  const { rowCount } = await pool.query(
    `UPDATE sessions
     SET refresh_token_hash = $3, expires_at = $4, last_used_at = NOW()
     WHERE id = $1 AND refresh_token_hash = $2 AND revoked_at IS NULL`,
    [id, oldHash, newHash, expiresAt]
  );
  return rowCount === 1;
};

const revokeSessionByHash = async (refreshTokenHash) => {
  await pool.query(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
    [refreshTokenHash]
  );
};

const revokeSession = async (id) => {
  await pool.query(
    `UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
    [id]
  );
};

module.exports = {
  createSession,
  findSessionByHash,
  rotateSession,
  revokeSessionByHash,
  revokeSession,
};
