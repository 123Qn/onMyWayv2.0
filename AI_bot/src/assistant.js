// The travel assistant: understand the question -> look up onMyWay data -> let the local model
// write the answer from that data only -> keep just the places/posts that really exist.
const { understand, matchText, mentionAt } = require("./understand");
const { retrieve } = require("./retrieve");
const llm = require("./llm");

const MAX_HISTORY = 8; // earlier turns sent with the question (keeps the small model focused)

// Recent answers to first questions (no earlier turns), e.g. the suggestion chips everyone taps.
// Short-lived so new places and posts show up soon.
const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const answers = new Map();

function cached(key) {
  const hit = answers.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    answers.delete(key);
    return null;
  }
  return hit.value;
}

function remember(key, value) {
  if (answers.size >= CACHE_MAX) answers.delete(answers.keys().next().value);
  answers.set(key, { at: Date.now(), value });
}

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  vi: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
};
const countryName = new Intl.DisplayNames(["en"], { type: "region" });
const country = (code) => {
  try {
    return countryName.of(code) ?? code;
  } catch {
    return code;
  }
};
const monthList = (months, lang = "en") => months.map((m) => MONTHS[lang][m - 1]).join(", ");

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Months as readable ranges, wrapping over the new year: [11,12,1,2,3,4] -> "November to April",
 * [1,2,3,6,7,8,9] -> "January to March and June to September". Small models misread raw lists.
 */
function monthRanges(months) {
  const set = new Set(months);
  if (set.size === 12) return "all year";
  if (!set.size) return "no particular season";
  // Start each run at a month whose previous month is not included
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((a, b) => a - b);
  return starts
    .map((start) => {
      let end = start;
      while (set.has(end === 12 ? 1 : end + 1)) end = end === 12 ? 1 : end + 1;
      return start === end ? FULL_MONTHS[start - 1] : `${FULL_MONTHS[start - 1]} to ${FULL_MONTHS[end - 1]}`;
    })
    .join(" and ");
}

const MONTH_TOKENS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Months a piece of text talks about: "rainy Jun-Oct" -> [6..10], "late Mar-early Apr" -> [3, 4] */
function monthsIn(text) {
  const found = [];
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b(?:\s*(?:-|–|to)\s*(?:early |mid |late )?\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)?/gi;
  for (const m of text.matchAll(re)) {
    const a = MONTH_TOKENS.indexOf(m[1].toLowerCase()) + 1;
    const b = m[2] ? MONTH_TOKENS.indexOf(m[2].toLowerCase()) + 1 : a;
    for (let x = a; ; x = (x % 12) + 1) {
      found.push(x);
      if (x === b) break;
    }
  }
  return found;
}

/**
 * Only the season notes about the months asked (or notes with no month at all):
 * "Cherry blossom late Mar-early Apr; autumn colors mid-Nov" asked for April -> "Cherry blossom late Mar-early Apr".
 * Small models otherwise repeat facts about the wrong month.
 */
function notesFor(notes, months) {
  if (!notes || !months.length) return notes ?? "";
  return notes
    .split(/(?<=[.;])\s+/)
    .filter((clause) => {
      const ms = monthsIn(clause);
      return !ms.length || ms.some((m) => months.includes(m));
    })
    .join(" ")
    .trim();
}

// Seasonal sights named in descriptions; removed when the traveler asks about other months
const SEASONAL_PHRASES = [
  { phrase: "autumn (?:leaves|colou?rs)", months: [10, 11] },
  { phrase: "cherry blossoms?", months: [3, 4] },
  { phrase: "christmas markets?", months: [12] },
];

/** Remove a phrase with one joining "and"/"or": "A and X" -> "A", "X and B" -> "B", "X" -> "" */
function removePhrase(text, phrase) {
  const before = new RegExp(String.raw`,?\s+\b(?:and|or)\s+${phrase}\b`, "gi");
  if (before.test(text)) return text.replace(before, "");
  const after = new RegExp(String.raw`\b${phrase}\s+(?:and|or)\s+`, "gi");
  if (after.test(text)) return text.replace(after, "");
  return text.replace(new RegExp(String.raw`\b${phrase}\b`, "gi"), "");
}

/** "famous for cherry blossom and autumn leaves" asked for April -> "famous for cherry blossom" */
function describeFor(description, months) {
  if (!description || !months.length) return description ?? "";
  let text = description;
  for (const { phrase, months: when } of SEASONAL_PHRASES) if (!when.some((m) => months.includes(m))) text = removePhrase(text, phrase);
  // Tidy what a removal can leave behind: "famous for ;" / "for ."
  return text.replace(/\b(famous for|known for)\s*([;.,])/gi, "$2").replace(/\s+([;.,])/g, "$1").replace(/;\s*\./g, ".").trim();
}

// Tags that only hold in some months; dropped outside them so they aren't promised
const SEASONAL_TAGS = { "cherry-blossom": [3, 4], "autumn-leaves": [10, 11], skiing: [12, 1, 2, 3], "christmas-market": [12], whales: [6, 7, 8, 9, 10] };
const tagsFor = (tags, months) =>
  months.length ? tags.filter((t) => !SEASONAL_TAGS[t] || SEASONAL_TAGS[t].some((m) => months.includes(m))) : tags;

/** Why this place was picked, in plain words, so the model sees the match */
function whyItFits(p, filters) {
  const reasons = [];
  if (p.named) reasons.push("asked about by name");
  if ((filters.categories ?? []).includes(p.category)) reasons.push(`is a ${p.category} destination`);
  const tags = p.tags.filter((t) => (filters.tags ?? []).includes(t));
  if (tags.length) reasons.push(`known for ${tags.join(", ")}`);
  if (filters.months.length && p.inSeason) reasons.push("in season then");
  return reasons.length ? ` Matches the request: ${reasons.join("; ")}.` : "";
}

function systemPrompt({ filters, places, spots = [], posts, today, missingCountries = [] }) {
  const offered = new Set(posts.map((p) => p.id));
  const language = filters.language === "vi" ? "Vietnamese" : "English";
  const asked = filters.months.map((m) => FULL_MONTHS[m - 1]).join(", ");
  // The verdict is computed here so the model only has to explain it, not work it out
  const verdict = (p) =>
    filters.months.length
      ? p.inSeason
        ? ` Timing for ${asked}: good time to go.`
        : ` Timing for ${asked}: BAD time to go (off season). Go in ${monthRanges(p.bestMonths)} instead.`
      : "";
  const placeLines = places.length
    ? places
        .map((p) => {
          const notes = notesFor(p.seasonNotes, filters.months);
          return (
            `[place ${p.id}] ${p.name} (${p.category}, ${[p.city, country(p.countryCode)].filter(Boolean).join(", ")}).` +
            `${whyItFits(p, filters)} Best time to visit: ${monthRanges(p.bestMonths)}.${verdict(p)} ` +
            `${describeFor(p.description, filters.months)}${notes ? ` Season: ${notes}` : ""} Tags: ${tagsFor(p.tags, filters.months).join(", ")}.`
          );
        })
        .join("\n")
    : "(none matched)";
  const spotLines = spots
    .map((s) => {
      const where = [s.area, country(s.countryCode)].filter(Boolean).join(", ");
      const why = s.named ? " Asked about by name." : s.near ? " Near a place asked about." : "";
      const linked = s.postIds.filter((id) => offered.has(id)).map((id) => `post ${id}`);
      return (
        `- ${s.name} (${s.category}, ${where}).${why} Visited in ${s.postIds.length} traveler post${s.postIds.length > 1 ? "s" : ""}` +
        `${linked.length ? ` (${linked.join(", ")})` : ""}.${s.notes.length ? ` Travelers say: ${s.notes.map((n) => `"${n}"`).join(" ")}` : ""}`
      );
    })
    .join("\n");
  const postLines = posts.length
    ? posts
        .map((p) => `[post ${p.id}] ${p.kind} "${p.title}" in ${p.place ?? ""}, ${country(p.countryCode)} by ${p.author} (${p.likes} likes)`)
        .join("\n")
    : "(none)";

  return [
    "You are the onMyWay travel assistant, inside a travel app where travelers share trips.",
    `Today is ${today.toISOString().slice(0, 10)}.`,
    `Always answer in ${language}. Be warm and concise: at most 120 words, short paragraphs or a short list.`,
    "Recommend ONLY destinations from PLACES, spots from TRAVELER SPOTS and trips from COMMUNITY POSTS below. Never invent places, prices, distances or facts that are not given.",
    ...(spots.length
      ? [
          "TRAVELER SPOTS are real places onMyWay travelers visited and posted. You may recommend them and describe them only with what travelers say.",
          "TRAVELER SPOTS have NO season data: never say whether a month is good or bad for them; for timing, use the PLACES entry in the same area if there is one.",
          "When the traveler asks about a spot by name, answer about that spot first and put its posts in post_ids.",
        ]
      : []),
    "PLACES are already chosen to fit the question, best match first. Recommend the first ones; do not say onMyWay lacks something a listed place matches.",
    "Only if the traveler names a place or country that is in neither PLACES nor TRAVELER SPOTS, say onMyWay does not have it yet instead of using outside knowledge.",
    "Match the traveler's needs (who they travel with, what they like); do not recommend a place that does not fit them.",
    "When talking about timing, follow each place's timing line exactly and use only its season notes to explain why.",
    "If a place's timing says BAD time to go, your reply must start by saying it is not a good time to go then, and then say when to go instead. Never call it a good time.",
    "Prefer places whose timing says good time to go.",
    "If nothing fits well, say so honestly and offer the closest options.",
    ...(missingCountries.length
      ? [`onMyWay has NO destinations in ${missingCountries.map(country).join(", ")}: say so plainly and do not describe anything there.`]
      : []),
    "Answer in JSON: reply = the text shown to the traveler (no ids in it), place_ids = ids of PLACES you recommend in order, post_ids = ids of COMMUNITY POSTS worth opening.",
    "",
    "PLACES:",
    placeLines,
    ...(spots.length ? ["", "TRAVELER SPOTS:", spotLines] : []),
    "",
    "COMMUNITY POSTS:",
    postLines,
  ].join("\n");
}

const VI_MONTH = (m) => `tháng ${m}`;
const viRanges = (months) =>
  monthRanges(months).replace(/January|February|March|April|May|June|July|August|September|October|November|December/g, (name) =>
    VI_MONTH(FULL_MONTHS.indexOf(name) + 1)
  ).replace(/ to /g, " đến ").replace(/ and /g, " và ");

/**
 * "Is Kyoto good in April?": the yes/no is decided by data, so the opening sentence is written here
 * in the traveler's language (small models sometimes contradict the data on exactly this).
 */
function verdictSentence(place, filters) {
  const months = filters.months;
  if (filters.language === "vi") {
    const when = months.map(VI_MONTH).join(", ");
    const name = place.name;
    return place.inSeason
      ? `${capitalize(when)} là thời điểm đẹp để đi ${name}.`
      : `${capitalize(when)} không phải thời điểm tốt để đi ${name}; nên đi từ ${viRanges(place.bestMonths)}.`;
  }
  const when = months.map((m) => FULL_MONTHS[m - 1]).join(", ");
  return place.inSeason
    ? `${when} is a good time to visit ${place.name}.`
    : `${when} isn't a good time to visit ${place.name}; go from ${monthRanges(place.bestMonths)} instead.`;
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// A first sentence about timing (month or "time"), which the code-written verdict replaces
const TIMING_SENTENCE = /^[^.!?\n]*(\b(time|season|january|february|march|april|may|june|july|august|september|october|november|december)\b|tháng|thời điểm|mùa)[^.!?\n]*[.!?]\s*/i;

/** Put the verdict first and drop the model's own lines about timing (they repeat or contradict it) */
function withVerdict(reply, verdict) {
  const rest = reply
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !TIMING_SENTENCE.test(sentence))
    .join(" ");
  return `${verdict} ${rest}`.trim();
}

/** Drop ids and footnote marks the model sometimes leaks into the text: "(place 12)", "[post 3]", "Phan Thiet[2]" */
const cleanReply = (text) =>
  text
    .replace(/\s*[([]\s*(place|post)s?\s*#?\d+(\s*,\s*\d+)*\s*[)\]]/gi, "")
    .replace(/\[\d+\]/g, "")
    // A whole sentence pointing at ids: "Check out posts 256 and 247 for more details."
    .replace(/[^.!?\n]*\b(place|post)s?\s+#?\d+[^.!?\n]*[.!?]?[ \t]*/gi, "")
    // A digit glued to the end of a word ("Thiet2") is a footnote, not part of a name
    .replace(/(\p{Ll}{2,})\d\b/gu, "$1")
    .replace(/[ \t]+([.,!?])/g, "$1")
    .trim();

/**
 * The places the reply really talks about, in the order it mentions them. Small models sometimes
 * write about one place but return another's id, so names in the text win over returned ids.
 */
function placesInReply(reply, places, modelIds) {
  const text = matchText(reply);
  const mentioned = places
    .map((p) => ({ id: p.id, at: mentionAt(text, p) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((m) => m.id);
  return mentioned.length ? mentioned : modelIds;
}

/** "We don't cover Peru yet" + what is good in the months asked, without the model (no made-up places) */
function notCoveredReply({ filters, places, missingCountries }) {
  const names = missingCountries.map(country).join(", ");
  const top = places.slice(0, 3);
  if (filters.language === "vi") {
    return (
      `onMyWay chưa có gợi ý cho ${names}. Bạn có thể thử những nơi đang được cộng đồng yêu thích:\n` +
      top.map((p) => `• ${p.name} (${country(p.countryCode)}) – đẹp nhất: ${monthList(p.bestMonths, "vi")}`).join("\n")
    );
  }
  return (
    `onMyWay doesn't have suggestions for ${names} yet. Here are places our travelers love instead:\n` +
    top.map((p) => `• ${p.name} (${country(p.countryCode)}) – best: ${monthList(p.bestMonths)}`).join("\n")
  );
}

/** Plain answer from the search results when the model is unavailable */
function fallbackReply({ filters, places }) {
  const top = places.slice(0, 3);
  if (filters.language === "vi") {
    if (!top.length) return "Mình chưa tìm thấy địa điểm phù hợp. Bạn thử hỏi theo loại hình (biển, núi, thành phố...) hoặc quốc gia nhé.";
    return (
      "Một vài gợi ý cho bạn:\n" +
      top.map((p) => `• ${p.name} (${country(p.countryCode)}) – đẹp nhất: ${monthList(p.bestMonths, "vi")}`).join("\n")
    );
  }
  if (!top.length) return "I couldn't find a matching destination yet. Try asking by type (beach, mountain, city...) or by country.";
  return "A few ideas for you:\n" + top.map((p) => `• ${p.name} (${country(p.countryCode)}) – best: ${monthList(p.bestMonths)}`).join("\n");
}

/**
 * Follow-ups like "which one is good for kids?" don't repeat the month, kind of place or country:
 * take whatever the latest question leaves out from the traveler's earlier questions.
 */
function inheritFilters(filters, messages, today) {
  const earlier = messages
    .filter((m) => m.role === "user")
    .slice(0, -1)
    .reverse()
    .map((m) => understand(m.content, today));
  const out = { ...filters };
  for (const key of ["months", "categories", "countries"]) {
    if (out[key].length) continue;
    const found = earlier.find((f) => f[key].length);
    if (found) out[key] = found[key];
  }
  return out;
}

/**
 * @param {{ role: "user"|"assistant", content: string }[]} messages conversation so far, last one is the question
 * @param {Date} today
 */
async function answer(messages, today = new Date()) {
  const question = [...messages].reverse().find((m) => m.role === "user")?.content?.trim();
  if (!question) throw Object.assign(new Error("Ask a question first."), { status: 400 });

  // Same first question on the same day: reuse the answer (follow-ups depend on history, so never cached)
  const firstTurn = messages.filter((m) => m.role === "user").length === 1;
  const cacheKey = firstTurn ? `${today.toISOString().slice(0, 10)}|${question.toLowerCase()}` : null;
  const hit = cacheKey && cached(cacheKey);
  if (hit) return { ...hit, cached: true };

  const filters = { ...inheritFilters(understand(question, today), messages, today), currentMonth: today.getMonth() + 1 };
  const { places, spots, posts, missingCountries } = await retrieve(filters, question);
  const context = { filters, places, spots, posts, today, missingCountries };

  let result;
  if (missingCountries.length && missingCountries.length === filters.countries.length) {
    result = {
      reply: notCoveredReply(context),
      placeIds: places.slice(0, 3).map((p) => p.id),
      postIds: posts.slice(0, 2).map((p) => p.id),
      model: "rules",
      inputTokens: null,
      outputTokens: null,
    };
  } else try {
    const history = messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content }));
    const { answer: raw, model, inputTokens, outputTokens } = await llm.chat([
      { role: "system", content: systemPrompt(context) },
      ...history,
    ]);
    // Keep only ids that were really offered (the model must not invent places)
    let reply = cleanReply(String(raw.reply ?? ""));
    // One named place + months asked = a yes/no timing question: lead with the data's answer
    const named = places.filter((p) => p.named);
    const namedSpots = spots.filter((s) => s.named);
    if (filters.months.length && named.length === 1) reply = withVerdict(reply, verdictSentence(named[0], filters));
    // "Is the Eiffel Tower good in December?": answered with the season data of the destination it is in
    else if (filters.months.length && !named.length && namedSpots.length === 1 && places[0]?.nearSpot)
      reply = withVerdict(reply, verdictSentence({ ...places[0], name: `${namedSpots[0].name} (${places[0].name})` }, filters));
    const offeredIds = (raw.place_ids ?? []).filter((id) => places.some((p) => p.id === id));
    const placeIds = placesInReply(reply, places, offeredIds);
    const postIds = (raw.post_ids ?? []).filter((id) => posts.some((p) => p.id === id));
    result = {
      reply: reply || fallbackReply(context),
      placeIds: [...new Set(placeIds)],
      postIds: [...new Set(postIds)],
      model,
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    console.warn("[ai_bot] model unavailable, answering from search results:", err.message);
    result = {
      reply: fallbackReply(context),
      placeIds: places.slice(0, 3).map((p) => p.id),
      postIds: posts.slice(0, 2).map((p) => p.id),
      model: "fallback",
      inputTokens: null,
      outputTokens: null,
    };
  }

  const response = {
    ...result,
    places: result.placeIds.map((id) => places.find((p) => p.id === id)),
    filters: { months: filters.months, categories: filters.categories, countries: filters.countries, tags: filters.tags },
  };
  // Don't keep answers made without the model: they should improve as soon as it is back
  if (cacheKey && result.model !== "fallback") remember(cacheKey, response);
  return response;
}

module.exports = { answer, systemPrompt, fallbackReply, monthRanges, cleanReply, placesInReply, inheritFilters, notesFor, monthsIn, describeFor, verdictSentence, withVerdict };
