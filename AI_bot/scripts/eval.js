// Measures the assistant on fixed questions: right language, right places, correct timing,
// nothing invented, speed. Run before/after a change to see whether it helped:
//   npm run eval                    (uses OLLAMA_MODEL)
//   OLLAMA_MODEL=qwen2.5:7b npm run eval
const { answer } = require("../src/assistant");
const { pool } = require("../src/db");
const { normalize } = require("../src/understand");

const TODAY = new Date("2026-11-17T09:00:00Z");

// any: the reply or cards must mention at least one of these places
// none: must never appear (made-up or wrong places/facts)
// verdict: for "is it good in month X?" questions, the reply must say yes / no
const CASES = [
  { q: "Tháng 12 nên đi biển ở Việt Nam chỗ nào đẹp?", lang: "vi", any: ["Phu Quoc", "Mui Ne", "Quy Nhon"], none: ["Nha Trang", "My Khe"] },
  { q: "Phú Quốc tháng 7 có nên đi không?", lang: "vi", verdict: "no", any: ["Phu Quoc"] },
  { q: "Is Kyoto good in April?", lang: "en", verdict: "yes", any: ["Kyoto"], none: ["autumn"] },
  { q: "Is Kyoto good in August?", lang: "en", verdict: "no", any: ["Kyoto"] },
  { q: "Where can I go hiking right now?", lang: "en", any: ["Torres del Paine", "Blue Mountains", "Da Lat"], none: ["Dolomites", "Chamonix"] },
  { q: "Best place in Peru for July?", lang: "en", none: ["Machu Picchu", "Cusco", "Lima"] },
  { q: "Thailand or Peru in December?", lang: "en", any: ["Phuket", "Bangkok", "Chiang Mai"], none: ["Machu Picchu", "Cusco"] },
  { q: "Đi Hàn Quốc mùa xuân có gì hay?", lang: "vi", any: ["Seoul", "Jeju"] },
  { q: "Đi Nhật mùa thu có gì đẹp?", lang: "vi", any: ["Kyoto", "Tokyo", "Mount Fuji", "Osaka"] },
  { q: "Mình muốn đi du lịch cùng gia đình có con nhỏ, nên đi đâu?", lang: "vi", any: ["Phu Quoc", "My Khe", "Gold Coast"], none: ["Saigon street food"] },
  { q: "Is Paris nice in December?", lang: "en", verdict: "no", any: ["Paris"] },
  { q: "Where to see cherry blossoms?", lang: "en", any: ["Kyoto", "Seoul", "Tokyo"] },
  { q: "Đà Lạt có lạnh không, nên đi tháng mấy?", lang: "vi", any: ["Da Lat"] },
  { q: "Suggest a city break in Europe in May", lang: "en", any: ["Paris", "Rome", "Berlin", "London"], none: ["Bangkok", "Tokyo"] },
  { q: "hello", lang: "en" },
  { q: "Ăn gì ngon ở Sài Gòn?", lang: "vi", any: ["Saigon"] },
  // Traveler spots: places that exist only in posts (no curated destination)
  { q: "Should I visit the Eiffel Tower?", lang: "en", any: ["Eiffel"], none: ["doesn't have", "does not have"], posts: true },
  { q: "Colosseum có đẹp không?", lang: "vi", any: ["Colosseum"], none: ["Cinque Terre"], posts: true },
  { q: "Is the Eiffel Tower good in December?", lang: "en", verdict: "no", any: ["Eiffel"] },
  { q: "Kyoto có gì chơi?", lang: "vi", any: ["Pontocho", "Yasaka"] },
];

const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const SAYS_NO = /\b(not|no|isn t|avoid|better (in|to)|instead)\b|không (phải|nên)|chưa phải|không tốt|tránh|nên đi vào|tốt hơn/i;
const SAYS_YES = /\b(yes|good time|great time|perfect|ideal|best time)\b|thời điểm (tốt|đẹp|lý tưởng)|rất (hợp|đẹp)|nên đi/i;

function check(c, r) {
  const fails = [];
  const reply = r.reply;
  const text = ` ${normalize(reply)} ${normalize(r.places.map((p) => p.name).join(" "))} `;
  const isVi = VIETNAMESE.test(reply);
  if (c.lang === "vi" && !isVi) fails.push("not Vietnamese");
  if (c.lang === "en" && isVi) fails.push("not English");
  if (c.any && !c.any.some((p) => text.includes(` ${normalize(p)} `) || text.includes(normalize(p)))) fails.push(`none of ${c.any.join("/")}`);
  for (const bad of c.none ?? []) if (normalize(reply).includes(normalize(bad))) fails.push(`mentions ${bad}`);
  if (c.verdict === "no" && (!SAYS_NO.test(reply) || /\bis a (good|great) time\b/i.test(reply))) fails.push("should say no");
  if (c.verdict === "yes" && (!SAYS_YES.test(reply) || /\bnot a good\b/i.test(reply))) fails.push("should say yes");
  if (/\b(place|post)\s*\d+/i.test(reply)) fails.push("leaked id");
  if (c.posts && !r.postIds.length) fails.push("no traveler posts");
  if (reply.split(/\s+/).length > 160) fails.push("too long");
  return fails;
}

(async () => {
  const verbose = process.argv.includes("-v");
  let passed = 0;
  const times = [];
  // Warm-up so model loading doesn't count as answer time
  await answer([{ role: "user", content: "hi" }], TODAY);
  for (const c of CASES) {
    const started = Date.now();
    const r = await answer([{ role: "user", content: c.q }], TODAY);
    const ms = Date.now() - started;
    times.push(ms);
    const fails = check(c, r);
    if (!fails.length) passed++;
    console.log(`${fails.length ? "FAIL" : " ok "} ${(ms / 1000).toFixed(1)}s  ${c.q}${fails.length ? `\n       -> ${fails.join("; ")}` : ""}`);
    if (verbose || fails.length) console.log(`       ${r.reply.replace(/\n/g, " ")}\n       [${r.model}] cards: ${r.places.map((p) => p.name).join(", ") || "-"}`);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\n${process.env.OLLAMA_MODEL || "qwen2.5:3b"}: ${passed}/${CASES.length} passed · avg ${(avg / 1000).toFixed(2)}s · p90 ${(times[Math.floor(times.length * 0.9)] / 1000).toFixed(2)}s`);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
