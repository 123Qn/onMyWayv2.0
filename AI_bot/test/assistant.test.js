const { test } = require("node:test");
const assert = require("node:assert/strict");

// assistant.js loads the DB pool; give it a dummy URL so tests need no database
process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1:1/test";
const { monthRanges, systemPrompt } = require("../src/assistant");

test("month ranges wrap over the new year", () => {
  assert.equal(monthRanges([11, 12, 1, 2, 3, 4]), "November to April");
  assert.equal(monthRanges([1, 2, 3, 6, 7, 8, 9]), "January to March and June to September");
  assert.equal(monthRanges([3, 4, 10, 11]), "March to April and October to November");
  assert.equal(monthRanges([12]), "December");
  assert.equal(monthRanges([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "all year");
});

const phuQuoc = {
  id: 1, name: "Phu Quoc", category: "island", city: "Phu Quoc", countryCode: "VN", tags: ["beach"],
  description: "Island.", seasonNotes: "Dry season Nov-Apr; rainy Jun-Oct.", bestMonths: [11, 12, 1, 2, 3, 4],
};
const base = { posts: [], today: new Date("2026-11-17"), missingCountries: [] };

test("the prompt carries a ready-made verdict for the months asked", () => {
  const july = systemPrompt({ ...base, filters: { language: "vi", months: [7] }, places: [{ ...phuQuoc, inSeason: false }] });
  assert.match(july, /Timing for July: BAD time to go \(off season\)\. Go in November to April instead/);
  assert.match(july, /Always answer in Vietnamese/);
  const dec = systemPrompt({ ...base, filters: { language: "en", months: [12] }, places: [{ ...phuQuoc, inSeason: true }] });
  assert.match(dec, /Timing for December: good time to go/);
});

test("countries without data are named so the model does not describe them", () => {
  const prompt = systemPrompt({ ...base, filters: { language: "en", months: [] }, places: [], missingCountries: ["PE"] });
  assert.match(prompt, /NO destinations in Peru/);
});

const { cleanReply, placesInReply } = require("../src/assistant");

test("ids leaked into the text are removed", () => {
  assert.equal(cleanReply("Try Phuket (place 12) or Bangkok [place 32]."), "Try Phuket or Bangkok.");
  assert.equal(cleanReply("See the trip (post 222)!"), "See the trip!");
  assert.equal(cleanReply("Paris is lovely. Check out posts 256 and 247 for more details."), "Paris is lovely.");
});

test("cards follow the places the reply talks about", () => {
  const places = [{ id: 6, name: "Mui Ne", city: "Phan Thiet" }, { id: 1, name: "Phu Quoc", city: "Phu Quoc" }];
  assert.deepEqual(placesInReply("Tháng 12 nên đi Phú Quốc.", places, [6]), [1]);
  assert.deepEqual(placesInReply("Phu Quoc first, then Mui Ne.", places, []), [1, 6]);
  assert.deepEqual(placesInReply("Hello there!", places, [6]), [6]);
});

const { inheritFilters } = require("../src/assistant");
const { understand } = require("../src/understand");

test("follow-ups keep the month / place type / country from earlier questions", () => {
  const today = new Date("2026-11-17");
  const messages = [
    { role: "user", content: "Where should I go for a beach trip in December?" },
    { role: "assistant", content: "Try Mui Ne." },
    { role: "user", content: "Which one is good for kids?" },
  ];
  const f = inheritFilters(understand(messages[2].content, today), messages, today);
  assert.deepEqual(f.months, [12]);
  assert.deepEqual(f.categories, ["beach"]);
  assert.ok(f.tags.includes("family"));
});

test("footnote digits are dropped but real numbers stay", () => {
  assert.equal(cleanReply("Resorts near Phan Thiet2 are nice."), "Resorts near Phan Thiet are nice.");
  assert.equal(cleanReply("See it on day 2 of 4."), "See it on day 2 of 4.");
});

const { notesFor, monthsIn } = require("../src/assistant");

test("month ranges are read from season notes", () => {
  assert.deepEqual(monthsIn("rainy and rough seas Jun-Oct"), [6, 7, 8, 9, 10]);
  assert.deepEqual(monthsIn("Cherry blossom late Mar-early Apr"), [3, 4]);
  assert.deepEqual(monthsIn("Dry season Nov-Apr"), [11, 12, 1, 2, 3, 4]);
  assert.deepEqual(monthsIn("Very busy then."), []);
});

test("only season notes about the asked months are kept", () => {
  const kyoto = "Cherry blossom late Mar-early Apr; autumn colors mid-Nov. Very busy then.";
  assert.equal(notesFor(kyoto, [4]), "Cherry blossom late Mar-early Apr; Very busy then.");
  assert.equal(notesFor("Crowded and hot Jul-Aug; many locals away in August.", [12]), "");
  assert.equal(notesFor("Dry season Nov-Apr; rainy and rough seas Jun-Oct.", [7]), "rainy and rough seas Jun-Oct.");
  assert.equal(notesFor(kyoto, []), kyoto);
});

const { matchText, mentionAt, placeKeys } = require("../src/understand");

test("place names match with or without spaces and by distinctive words", () => {
  const saigon = { name: "Saigon street food", city: "Ho Chi Minh City" };
  assert.ok(placeKeys(saigon).includes("saigon"));
  assert.ok(mentionAt(matchText("Ăn gì ngon ở Sài Gòn?"), saigon) >= 0);
  assert.ok(mentionAt(matchText("Đi Dalat tháng mấy?"), { name: "Da Lat", city: "Da Lat" }) >= 0);
  // generic words alone don't name a place
  assert.equal(mentionAt(matchText("any good street food?"), saigon), -1);
});

const { describeFor, verdictSentence, withVerdict } = require("../src/assistant");

test("out-of-season sights are removed from descriptions", () => {
  const kyoto = "Temples, shrines and geisha districts; famous for cherry blossom and autumn leaves.";
  assert.equal(describeFor(kyoto, [4]), "Temples, shrines and geisha districts; famous for cherry blossom.");
  assert.equal(describeFor(kyoto, [11]), "Temples, shrines and geisha districts; famous for autumn leaves.");
  assert.equal(describeFor(kyoto, []), kyoto);
});

test("timing questions lead with the data's verdict in the traveler's language", () => {
  const pq = { name: "Phu Quoc", bestMonths: [11, 12, 1, 2, 3, 4], inSeason: false };
  assert.equal(verdictSentence(pq, { months: [7], language: "vi" }), "Tháng 7 không phải thời điểm tốt để đi Phu Quoc; nên đi từ tháng 11 đến tháng 4.");
  assert.equal(verdictSentence({ ...pq, inSeason: true }, { months: [12], language: "en" }), "December is a good time to visit Phu Quoc.");
  const fixed = withVerdict("Tháng 7 là thời điểm tốt để đến Phu Quoc. Biển đẹp và nhiều hoạt động.", "Tháng 7 không phải thời điểm tốt để đi Phu Quoc.");
  assert.equal(fixed, "Tháng 7 không phải thời điểm tốt để đi Phu Quoc. Biển đẹp và nhiều hoạt động.");
});
