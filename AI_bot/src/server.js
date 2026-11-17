// HTTP API for the travel assistant. Internal: the Backend calls it (AI_BOT_URL), the app never does.
//   POST /chat    { messages: [{ role: "user"|"assistant", content }] }
//              -> { reply, placeIds, postIds, places, model, inputTokens, outputTokens, filters }
//   GET  /health  -> { ok, ollama, model, modelReady }
const http = require("node:http");
const { answer } = require("./assistant");
const llm = require("./llm");

const PORT = Number(process.env.AI_BOT_PORT) || 3100;
const HOST = process.env.AI_BOT_HOST || "127.0.0.1"; // only reachable from this machine
const MAX_BODY = 64 * 1024;

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) reject(Object.assign(new Error("Message too long."), { status: 413 }));
      else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, ...(await llm.health()) });
    }
    if (req.method === "POST" && req.url === "/chat") {
      const body = await readJson(req);
      const messages = (Array.isArray(body.messages) ? body.messages : [])
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
      return send(res, 200, await answer(messages));
    }
    send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("[ai_bot]", err);
    send(res, err.status || 500, { error: err.status ? err.message : "The assistant had a problem." });
  }
});

server.listen(PORT, HOST, async () => {
  const h = await llm.health();
  console.log(`[ai_bot] listening on http://${HOST}:${PORT} · model ${h.model} · ollama ${h.ollama ? "up" : "DOWN"}${h.ollama && !h.modelReady ? " (model not pulled)" : ""}`);
  // Load the model now so the first traveler doesn't wait for it
  if (h.ollama && h.modelReady) {
    llm
      .warmUp()
      .then((ms) => console.log(`[ai_bot] model loaded in ${(ms / 1000).toFixed(1)}s`))
      .catch((err) => console.warn("[ai_bot] warm-up failed:", err.message));
  }
});

// Give the GPU memory back when the assistant stops
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await llm.unload();
    process.exit(0);
  });
}
