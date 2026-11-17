// Turns a traveler's question (Vietnamese or English) into search filters:
// which months, place categories, countries and tags it is about.
// Plain keyword matching on purpose: fast, predictable, and it works without the model.
//
// Keywords are matched without accents ("viet nam" finds "Việt Nam"), except the ones written
// "~with accents": short Vietnamese words that become ambiguous once accents are dropped
// ("nhất" = most vs "Nhật" = Japan, "chưa" = not yet vs "chùa" = temple, "đến" = to vs "đền" = temple).

/** Lowercase without accents, so "Việt Nam", "viet nam" and "VIET NAM" all match */
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word (or phrase) match; "~word" is matched with its accents against the raw text */
function makeMatcher(question) {
  const plain = normalize(question);
  const raw = question.toLowerCase().normalize("NFC");
  return (word) =>
    word.startsWith("~")
      ? new RegExp(`(^|[^\\p{L}])${escape(word.slice(1).normalize("NFC"))}($|[^\\p{L}])`, "u").test(raw)
      : // also the plural: "cherry blossoms", "temples", "beaches"
        new RegExp(`(^|\\s)${escape(word)}(s|es)?(\\s|$)`).test(plain);
}

const MONTH_NAMES = [
  ["january", "jan"], ["february", "feb"], ["march", "mar"], ["april", "apr"], [], ["june", "jun"],
  ["july", "jul"], ["august", "aug"], ["september", "sep", "sept"], ["october", "oct"], ["november", "nov"], ["december", "dec"],
];

const SEASONS = [
  { words: ["summer", "~mùa hè", "~hè"], months: [6, 7, 8] },
  { words: ["winter", "~mùa đông"], months: [12, 1, 2] },
  { words: ["spring", "~mùa xuân"], months: [3, 4, 5] },
  { words: ["autumn", "fall", "~mùa thu"], months: [9, 10, 11] },
  { words: ["~tết", "lunar new year"], months: [1, 2] },
  { words: ["christmas", "giang sinh", "noel", "xmas"], months: [12] },
  { words: ["cherry blossom", "sakura", "hoa anh dao"], months: [3, 4] },
];

const NOW_WORDS = ["now", "this month", "this season", "right now", "bay gio", "luc nay", "thang nay", "mua nay", "hien tai", "dip nay"];
const NEXT_WORDS = ["next month", "thang sau", "thang toi"];

const CATEGORIES = {
  beach: ["beach", "beaches", "bien", "bai bien", "sea", "seaside", "tam bien"],
  island: ["island", "islands", "~đảo", "hon dao"],
  mountain: ["mountain", "mountains", "nui", "leo nui", "hike", "hiking", "trek", "trekking", "cao nguyen", "highland"],
  city: ["city", "cities", "thanh pho", "urban", "do thi"],
  culture: ["culture", "van hoa", "temple", "temples", "~chùa", "~đền", "history", "lich su", "old town", "pho co", "museum", "bao tang"],
  food: ["food", "eat", "eating", "am thuc", "an uong", "mon an", "street food", "an vat", "dac san", "an gi", "quan an", "do an", "~ngon"],
  nature: ["nature", "thien nhien", "waterfall", "thac", "lake", "~hồ", "cave", "hang dong", "national park", "~rừng", "forest"],
};

const COUNTRIES = {
  VN: ["vietnam", "viet nam"],
  TH: ["thailand", "thai lan"],
  ID: ["indonesia", "bali"],
  JP: ["japan", "nhat ban", "~nhật"],
  KR: ["korea", "south korea", "han quoc", "~hàn"],
  FR: ["france", "phap", "paris"],
  IT: ["italy", "italia", "~ý", "rome"],
  DE: ["germany", "~đức", "berlin"],
  CH: ["switzerland", "thuy si", "thuy sy"],
  GB: ["uk", "united kingdom", "england", "scotland", "britain", "london", "anh quoc", "~nước anh"],
  US: ["usa", "america", "united states", "new york", "~mỹ", "hoa ky"],
  BR: ["brazil", "brasil"],
  CL: ["chile", "patagonia"],
  AU: ["australia", "~úc", "sydney"],
  MV: ["maldives"],
  // Common Vietnamese names of other countries; English names come from the full ISO list below
  CN: ["~trung quốc"],
  IN: ["~ấn độ"],
  LA: ["~lào"],
  KH: ["campuchia"],
  TW: ["dai loan"],
  RU: ["~nga"],
  ES: ["tay ban nha"],
  PT: ["bo dao nha"],
  NL: ["ha lan"],
  GR: ["hy lap"],
  TR: ["tho nhi ky"],
  EG: ["ai cap"],
  NZ: ["new zealand"],
  CA: ["canada"],
};

// Every country's English name (from the runtime's ISO 3166 data), e.g. "peru" -> PE
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const ALL_COUNTRY_NAMES = (() => {
  const out = [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of letters)
    for (const b of letters) {
      const code = a + b;
      if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue;
      let name;
      try {
        name = regionNames.of(code);
      } catch {
        continue;
      }
      if (!name || name === code || /unknown|world|europe|union|nations|outlying/i.test(name)) continue;
      // "Myanmar (Burma)" -> "myanmar"; "Congo - Kinshasa" -> "congo"
      out.push({ code, name: normalize(name.replace(/\(.*\)| - .*$/g, "")) });
    }
  return out.filter((c) => c.name.length >= 4);
})();

// Words that point at a place tag
const TAGS = {
  family: ["family", "kids", "children", "gia dinh", "tre em", "tre con", "con nho", "em be"],
  snorkeling: ["snorkel", "snorkeling", "lan ngam", "~lặn biển"],
  diving: ["dive", "diving", "scuba", "~lặn"],
  surfing: ["surf", "surfing", "luot song"],
  hiking: ["hike", "hiking", "trek", "trekking", "leo nui", "~đi bộ đường dài"],
  honeymoon: ["honeymoon", "romantic", "trang mat", "lang man", "cap doi"],
  nightlife: ["nightlife", "party", "bars", "ve dem", "cuoc song dem"],
  "street-food": ["street food", "an vat", "via he", "an duong pho"],
  temples: ["temple", "temples", "~chùa", "~đền"],
  quiet: ["quiet", "peaceful", "yen tinh", "it nguoi", "~vắng"],
  "road-trip": ["road trip", "phuot", "xe may", "lai xe"],
  skiing: ["ski", "skiing", "truot tuyet"],
  "cherry-blossom": ["cherry blossom", "sakura", "hoa anh dao"],
  "autumn-leaves": ["autumn leaves", "la phong", "~lá đỏ"],
};

/**
 * @param {string} question
 * @param {Date} today
 * @returns {{ months: number[], categories: string[], countries: string[], tags: string[], language: "vi"|"en" }}
 */
function understand(question, today = new Date()) {
  const has = makeMatcher(question);
  const plain = normalize(question);
  const months = new Set();

  // "tháng 12", "thang 3"
  for (const m of plain.matchAll(/thang (1[0-2]|[1-9])(?!\d)/g)) months.add(Number(m[1]));
  MONTH_NAMES.forEach((names, i) => {
    if (names.some(has)) months.add(i + 1);
  });
  // "may" is also an everyday English word: only count it as May next to in/during/early/late
  if (/\b(in|during|late|early|mid) may\b/.test(plain)) months.add(5);
  for (const s of SEASONS) if (s.words.some(has)) s.months.forEach((m) => months.add(m));
  const current = today.getMonth() + 1;
  if (NOW_WORDS.some(has)) months.add(current);
  if (NEXT_WORDS.some(has)) months.add((current % 12) + 1);

  const pick = (table) => Object.keys(table).filter((key) => table[key].some(has));
  const countries = new Set(pick(COUNTRIES));
  for (const c of ALL_COUNTRY_NAMES) if (has(c.name)) countries.add(c.code);

  return {
    months: [...months].sort((a, b) => a - b),
    categories: pick(CATEGORIES),
    countries: [...countries],
    tags: pick(TAGS),
    // Vietnamese has accents (or typical unaccented phrases); otherwise answer in English
    language:
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(question) ||
      /\b(thang|o dau|nen di|di dau|cho nao|khong)\b/.test(plain)
        ? "vi"
        : "en",
  };
}

// Generic words in place names that don't identify a place on their own
const GENERIC = new Set(["street", "beach", "island", "islands", "mount", "mountain", "mountains", "lake", "town", "city", "ancient",
  "valley", "national", "park", "food", "night", "market", "highlands", "scottish", "grand", "canyon", "coast", "gold", "blue", "bay"]);

/**
 * Ways a question can name a place: its full name or city ("phu quoc", "ho chi minh city"), the same without
 * spaces ("dalat"), and distinctive single words of 5+ letters ("saigon", "kyoto", "dolomites").
 */
function placeKeys(place) {
  const keys = new Set();
  for (const raw of [place.name, place.city].filter(Boolean)) {
    const n = normalize(raw);
    if (n.length >= 4) keys.add(n);
    if (n.includes(" ")) keys.add(n.replace(/ /g, ""));
    for (const word of n.split(" ")) if (word.length >= 5 && !GENERIC.has(word)) keys.add(word);
  }
  return [...keys];
}

/** Normalized text plus adjacent words joined ("sai gon" -> "saigon"), padded for whole-word checks */
function matchText(text) {
  const words = normalize(text).split(" ");
  const joined = words.slice(1).map((w, i) => words[i] + w);
  return ` ${words.join(" ")} ${joined.join(" ")} `;
}

/** Position of the first mention of a place in prepared text, or -1 */
function mentionAt(prepared, place) {
  const hits = placeKeys(place).map((k) => prepared.indexOf(` ${k} `)).filter((i) => i >= 0);
  return hits.length ? Math.min(...hits) : -1;
}

module.exports = { understand, normalize, placeKeys, matchText, mentionAt };
