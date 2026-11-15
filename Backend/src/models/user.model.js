const pool = require("../config/database");

const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash AS password
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0];
};

const findUserById = async (id) => {
  if (!Number.isInteger(Number(id))) return undefined;
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash AS password
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
};

const createUser = async (user) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, password_hash AS password`,
    [user.name, user.email.toLowerCase(), user.password]
  );
  return rows[0];
};

const findUserByIdentity = async (provider, providerUserId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash AS password
     FROM auth_identities i JOIN users u ON u.id = i.user_id
     WHERE i.provider = $1 AND i.provider_user_id = $2`,
    [provider, providerUserId]
  );
  return rows[0];
};

const linkIdentity = async (userId, { provider, providerUserId, email }) => {
  await pool.query(
    `INSERT INTO auth_identities (user_id, provider, provider_user_id, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_user_id) DO NOTHING`,
    [userId, provider, providerUserId, email]
  );
};

// Third-party sign-up: user has no password, only the linked identity
const createUserWithIdentity = async (user, identity) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO users (name, email, avatar_url)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, password_hash AS password`,
      [user.name, user.email.toLowerCase(), user.avatarUrl]
    );
    await client.query(
      `INSERT INTO auth_identities (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)`,
      [rows[0].id, identity.provider, identity.providerUserId, identity.email]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Sessions, identities, trips, posts... are removed by ON DELETE CASCADE
const deleteUser = async (id) => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findUserByIdentity,
  linkIdentity,
  createUserWithIdentity,
  deleteUser,
};