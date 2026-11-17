// Travel assistant conversations. The answers come from the AI_bot service (local model via Ollama);
// this side keeps the history per user and turns suggested ids into place / post cards.
const pool = require("../config/database");
const postService = require("./post.service");
const { countryName } = require("./community.service");

const AI_BOT_URL = process.env.AI_BOT_URL || "http://127.0.0.1:3100";
const HISTORY_TURNS = 8;
const MAX_QUESTION = 1000;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Destination cards for the app */
async function placeCards(ids) {
  if (!ids.length) return new Map();
  const { rows } = await pool.query(
    `SELECT id, name, description, category, tags, country_code, city, latitude, longitude, best_months, season_notes
     FROM places WHERE id = ANY($1::bigint[])`,
    [ids]
  );
  return new Map(
    rows.map((r) => [
      Number(r.id),
      {
        id: Number(r.id),
        name: r.name,
        description: r.description,
        category: r.category,
        tags: r.tags,
        countryCode: r.country_code,
        country: countryName(r.country_code),
        city: r.city,
        latitude: r.latitude === null ? null : Number(r.latitude),
        longitude: r.longitude === null ? null : Number(r.longitude),
        bestMonths: r.best_months,
        seasonNotes: r.season_notes,
      },
    ])
  );
}

/** Messages with their place and post cards, oldest first */
async function withCards(user, rows, toUrl) {
  const placeIds = [...new Set(rows.flatMap((r) => r.place_ids.map(Number)))];
  const postIds = [...new Set(rows.flatMap((r) => r.post_ids.map(Number)))];
  const [places, posts] = await Promise.all([placeCards(placeIds), postService.getPostsById(user, postIds, toUrl)]);
  return rows.map((r) => ({
    id: Number(r.id),
    role: r.role,
    content: r.content,
    createdAt: r.created_at.toISOString(),
    places: r.place_ids.map(Number).map((id) => places.get(id)).filter(Boolean),
    posts: r.post_ids.map(Number).map((id) => posts.get(id)).filter(Boolean),
  }));
}

async function findConversation(userId, conversationId) {
  const { rows } = await pool.query(`SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2`, [conversationId, userId]);
  if (!rows[0]) throw httpError(404, "Conversation not found.");
  return rows[0];
}

async function askBot(messages) {
  let res;
  try {
    res = await fetch(`${AI_BOT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw httpError(503, "The travel assistant is offline right now.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status === 400 ? 400 : 502, body.error || "The travel assistant had a problem.");
  return body;
}

/**
 * Ask the assistant. Starts a conversation when conversationId is missing.
 * Returns the conversation id and the assistant's message with its cards.
 */
async function chat(user, body, toUrl) {
  const question = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_QUESTION) : "";
  if (!question) throw httpError(400, "Ask a question first.");

  let conversation;
  if (body?.conversationId != null) {
    const id = toId(body.conversationId);
    if (!id) throw httpError(404, "Conversation not found.");
    conversation = await findConversation(user.id, id);
  } else {
    const { rows } = await pool.query(
      `INSERT INTO ai_conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
      [user.id, question.slice(0, 150)]
    );
    conversation = rows[0];
  }

  const { rows: earlier } = await pool.query(
    `SELECT role, content FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
    [conversation.id, HISTORY_TURNS]
  );
  const answer = await askBot([...earlier.reverse(), { role: "user", content: question }]);

  const client = await pool.connect();
  let saved;
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`, [conversation.id, question]);
    const { rows } = await client.query(
      `INSERT INTO ai_messages (conversation_id, role, content, place_ids, post_ids, model, input_tokens, output_tokens)
       VALUES ($1, 'assistant', $2, $3, $4, $5, $6, $7) RETURNING *`,
      [conversation.id, answer.reply, answer.placeIds ?? [], answer.postIds ?? [], answer.model ?? null, answer.inputTokens ?? null, answer.outputTokens ?? null]
    );
    await client.query(`UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1`, [conversation.id]);
    await client.query("COMMIT");
    saved = rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const [message] = await withCards(user, [saved], toUrl);
  return { conversationId: Number(conversation.id), message };
}

/** My conversations, latest first */
async function listConversations(user) {
  const { rows } = await pool.query(
    `SELECT id, title, created_at, updated_at FROM ai_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50`,
    [user.id]
  );
  return rows.map((r) => ({ id: Number(r.id), title: r.title, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() }));
}

async function getConversation(user, conversationId, toUrl) {
  const id = toId(conversationId);
  if (!id) throw httpError(404, "Conversation not found.");
  const conversation = await findConversation(user.id, id);
  const { rows } = await pool.query(`SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at, id`, [id]);
  return { id, title: conversation.title, messages: await withCards(user, rows, toUrl) };
}

async function deleteConversation(user, conversationId) {
  const id = toId(conversationId);
  if (!id) throw httpError(404, "Conversation not found.");
  await findConversation(user.id, id);
  await pool.query(`DELETE FROM ai_conversations WHERE id = $1`, [id]);
}

module.exports = { chat, listConversations, getConversation, deleteConversation };
