const { test } = require("node:test");
const assert = require("node:assert/strict");
const { understand } = require("../src/understand");

const NOV = new Date("2026-11-17T12:00:00Z");

test("Vietnamese: month, category and country", () => {
  const q = understand("Tháng 12 nên đi biển ở Việt Nam chỗ nào đẹp nhất?", NOV);
  assert.deepEqual(q.months, [12]);
  assert.deepEqual(q.categories, ["beach"]);
  assert.deepEqual(q.countries, ["VN"]);
  assert.equal(q.language, "vi");
});

test("'nhất' (most) is not Japan, 'chưa' (not yet) is not a temple, 'đến' (to) is not a temple", () => {
  const q = understand("Mình chưa đến Đà Lạt, chỗ nào đẹp nhất?", NOV);
  assert.deepEqual(q.countries, []);
  assert.deepEqual(q.categories, []);
});

test("Accented country names still work", () => {
  assert.deepEqual(understand("Đi Nhật mùa thu có gì hay?", NOV).countries, ["JP"]);
  assert.deepEqual(understand("Đi Nhật mùa thu có gì hay?", NOV).months, [9, 10, 11]);
  assert.deepEqual(understand("Du lịch Mỹ tháng 4", NOV).countries, ["US"]);
});

test("English: season words, 'now', tags", () => {
  const q = understand("Where should I go hiking with kids right now?", NOV);
  assert.deepEqual(q.months, [11]);
  assert.ok(q.categories.includes("mountain"));
  assert.ok(q.tags.includes("family"));
  assert.ok(q.tags.includes("hiking"));
  assert.equal(q.language, "en");
});

test("'may' only counts as May with in/during", () => {
  assert.deepEqual(understand("What may I bring to Bali?", NOV).months, []);
  assert.deepEqual(understand("Bali in May?", NOV).months, [5]);
});

test("Unaccented Vietnamese is detected as Vietnamese", () => {
  assert.equal(understand("thang 3 nen di dau o thai lan", NOV).language, "vi");
  assert.deepEqual(understand("thang 3 nen di dau o thai lan", NOV).countries, ["TH"]);
});

test("plurals match their keyword", () => {
  const q = understand("Where to see cherry blossoms?", NOV);
  assert.deepEqual(q.months, [3, 4]);
  assert.ok(q.tags.includes("cherry-blossom"));
  assert.deepEqual(understand("Any good temples in Japan?", NOV).categories, ["culture"]);
});
