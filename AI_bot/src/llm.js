// Talks to the local model served by Ollama (https://github.com/ollama/ollama/blob/main/docs/api.md)
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const TIMEOUT_MS = 90_000; // the first call also loads the model into memory
// While the assistant runs, the model stays in GPU memory (-1); server.js unloads it on exit.
// Loading takes ~3 s from the OS cache and up to ~45 s right after a reboot.
// "-1" / "0" from .env must be numbers; durations like "30m" stay strings
const rawKeepAlive = process.env.OLLAMA_KEEP_ALIVE ?? "-1";
const KEEP_ALIVE = /^-?\d+$/.test(rawKeepAlive) ? Number(rawKeepAlive) : rawKeepAlive;
// Replies are short (~120 words); the cap bounds the worst case if the model rambles
const MAX_TOKENS = 320;

// The model must answer in this shape, so the app can show the places it picked as cards
const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    place_ids: { type: "array", items: { type: "integer" } },
    post_ids: { type: "array", items: { type: "integer" } },
  },
  required: ["reply", "place_ids", "post_ids"],
};

/**
 * @param {{ role: "system"|"user"|"assistant", content: string }[]} messages
 * @returns {Promise<{ answer: { reply: string, place_ids: number[], post_ids: number[] }, model: string, inputTokens: number, outputTokens: number }>}
 */
async function chat(messages) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      format: ANSWER_SCHEMA,
      keep_alive: KEEP_ALIVE,
      // Low temperature: stick to the given facts
      options: { temperature: 0.3, num_ctx: 4096, num_predict: MAX_TOKENS },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return {
    answer: JSON.parse(data.message.content),
    model: data.model ?? MODEL,
    inputTokens: data.prompt_eval_count ?? null,
    outputTokens: data.eval_count ?? null,
  };
}

/** Load the model into memory ahead of the first question (an empty prompt only loads it) */
async function warmUp() {
  const started = Date.now();
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({ model: MODEL, keep_alive: KEEP_ALIVE }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  await res.json();
  return Date.now() - started;
}

/** Free the GPU memory when the assistant stops */
async function unload() {
  await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ model: MODEL, keep_alive: 0 }),
  }).catch(() => {});
}

/** Is Ollama up and is the model downloaded? */
async function health() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const { models = [] } = await res.json();
    return { ollama: true, model: MODEL, modelReady: models.some((m) => m.name === MODEL || m.model === MODEL) };
  } catch {
    return { ollama: false, model: MODEL, modelReady: false };
  }
}

module.exports = { chat, health, warmUp, unload, MODEL };
