// Try the assistant from the terminal, without the Backend or the app:
//   npm run ask -- "Tháng 12 nên đi biển ở đâu?"
const { answer } = require("../src/assistant");
const { pool } = require("../src/db");

(async () => {
  const question = process.argv.slice(2).join(" ") || "Where should I go for a beach trip this month?";
  const started = Date.now();
  const result = await answer([{ role: "user", content: question }]);
  console.log(`\nQ: ${question}\n`);
  console.log(result.reply);
  console.log(`\nfilters: ${JSON.stringify(result.filters)}`);
  console.log(`places: ${result.places.map((p) => `${p.id} ${p.name}`).join(" | ") || "-"}`);
  console.log(`posts: ${result.postIds.join(", ") || "-"}`);
  console.log(`model: ${result.model} · tokens ${result.inputTokens ?? "-"}/${result.outputTokens ?? "-"} · ${((Date.now() - started) / 1000).toFixed(1)}s`);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
