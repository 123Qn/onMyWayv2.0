// Finds the onMyWay data that answers a question: destinations (places) and real trips
// travelers posted. The model only ever sees and recommends what this returns.
const { pool } = require("./db");
const { matchText, mentionAt, normalize } = require("./understand");

const MAX_PLACES = 6;
const MAX_POSTS = 4;
const MAX_SPOTS = 4;
const CACHE_MS = 60_000;

// Kinds of place close enough to count as a partial match ("beach" also finds islands with beaches)
const RELATED = { beach: ["island"], island: ["beach"], nature: ["mountain"], mountain: ["nature"], culture: ["city"], city: ["culture", "food"], food: ["city"] };

/** 3 for the kind asked, 2 when the place is tagged with it or is a close kind, else 0 */
function kindScore(place, categories) {
  if (categories.includes(place.category)) return 3;
  if (categories.some((c) => place.tags.includes(c) || (RELATED[c] ?? []).includes(place.category))) return 2;
  return 0;
}

let cache = { at: 0, places: [] };
let spotCache = { at: 0, spots: [] };

/** All destinations (a few hundred at most), refreshed every minute */
async function allPlaces() {
  if (Date.now() - cache.at < CACHE_MS) return cache.places;
  const { rows } = await pool.query(
    `SELECT id, name, description, category, tags, country_code, region, city, latitude, longitude, best_months, season_notes
     FROM places`
  );
  const places = rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    category: r.category,
    tags: r.tags,
    countryCode: r.country_code,
    region: r.region,
    city: r.city,
    description: r.description,
    latitude: r.latitude === null ? null : Number(r.latitude),
    longitude: r.longitude === null ? null : Number(r.longitude),
    bestMonths: r.best_months,
    seasonNotes: r.season_notes,
  }));
  cache = { at: Date.now(), places };
  return places;
}

/** Ways to name a spot: its full name, the part before a comma, both without spaces ("Coconut Forest, Hoi An") */
function spotKeys(name) {
  const keys = new Set();
  for (const part of [name, name.split(",")[0]]) {
    const n = normalize(part);
    if (n.length >= 4) keys.add(n);
    if (n.includes(" ")) keys.add(n.replace(/ /g, ""));
  }
  return [...keys];
}
const spotMention = (text, keys) => keys.some((k) => text.includes(` ${k} `));

/** Straight-line distance in km */
function km(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const NEAR_KM = 40;

/**
 * Every place travelers posted (trip stops, moments and the area a trip is in) that is not already a
 * curated destination. They have no season data; what they bring is real traveler notes and posts to open.
 */
async function allSpots() {
  if (Date.now() - spotCache.at < CACHE_MS) return spotCache.spots;
  const [places, { rows }] = await Promise.all([
    allPlaces(),
    pool.query(
      `SELECT p.id AS post_id, p.category, p.country_code, p.place_name, p.caption AS post_caption,
              s.name AS stop_name, s.caption AS stop_caption, s.latitude, s.longitude,
              (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)::int AS likes
       FROM posts p LEFT JOIN post_stops s ON s.post_id = p.id
       WHERE p.status = 'published' AND p.visibility = 'public' AND p.kind IN ('trip', 'moment') AND p.country_code IS NOT NULL
       ORDER BY likes DESC, p.created_at DESC`
    ),
  ]);
  const curated = new Set(places.flatMap((p) => [p.name, p.city].filter(Boolean).map(normalize)));
  const byKey = new Map();
  const add = (name, row, caption, lat, lng) => {
    if (!name) return;
    const key = `${normalize(name)}|${row.country_code}`;
    if (curated.has(normalize(name)) || curated.has(normalize(name.split(",")[0]))) return;
    let spot = byKey.get(key);
    if (!spot) {
      spot = { name, keys: spotKeys(name), category: row.category, countryCode: row.country_code, area: null, notes: [], postIds: [], latitude: null, longitude: null };
      byKey.set(key, spot);
    }
    if (!spot.postIds.includes(Number(row.post_id))) spot.postIds.push(Number(row.post_id));
    const note = caption?.trim();
    if (note && spot.notes.length < 2 && !spot.notes.includes(note)) spot.notes.push(note.length > 140 ? `${note.slice(0, 137)}...` : note);
    if (spot.latitude === null && lat !== null) [spot.latitude, spot.longitude] = [Number(lat), Number(lng)];
  };
  for (const r of rows) {
    add(r.stop_name, r, r.stop_caption ?? r.post_caption, r.latitude, r.longitude);
    add(r.place_name, r, r.post_caption, null, null);
  }
  // The area is the curated destination it is in (a trip's own place name can be another city: "Rome & Cinque Terre")
  const spots = [...byKey.values()].map((s) => {
    if (s.latitude === null) return s;
    const near = places
      .filter((p) => p.latitude !== null)
      .map((p) => ({ p, d: km(p, s) }))
      .filter(({ d }) => d <= NEAR_KM)
      .sort((a, b) => a.d - b.d)[0];
    return near ? { ...s, area: near.p.city ?? near.p.name } : s;
  });
  spotCache = { at: Date.now(), spots };
  return spots;
}

/**
 * Traveler spots that fit: named in the question, near a destination asked about by name (or in the area
 * named, when the spot has no pin), or of the kind asked. With nothing to go on, none are returned.
 */
async function findSpots(filters, question, places) {
  const text = matchText(question);
  const namedPlaces = places.filter((p) => p.named && p.latitude !== null);
  return (await allSpots())
    .filter((s) => !filters.countries.length || filters.countries.includes(s.countryCode))
    .map((s) => {
      const named = spotMention(text, s.keys);
      const inArea = !named && s.latitude !== null && namedPlaces.some((p) => km(p, s) <= NEAR_KM);
      const kind = filters.categories.includes(s.category) ? 3 : filters.categories.some((c) => (RELATED[c] ?? []).includes(s.category)) ? 1 : 0;
      const score = (named ? 8 : 0) + (inArea ? 5 : 0) + kind + (filters.countries.length ? 1 : 0) + Math.min(s.postIds.length, 3) * 0.1;
      return { ...s, named, near: inArea, score };
    })
    .filter((s) => s.named || s.score >= 3)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_SPOTS);
}

/**
 * Places ranked by how well they fit. A country, when asked for, is a hard filter;
 * months, categories and tags only rank (so "beach in March" still finds near misses).
 */
async function findPlaces(filters, question) {
  const text = matchText(question);
  const months = filters.months.length ? filters.months : [filters.currentMonth];
  const scored = (await allPlaces())
    .filter((p) => !filters.countries.length || filters.countries.includes(p.countryCode))
    .map((p) => {
      const named = mentionAt(text, p) >= 0;
      const inSeason = p.bestMonths.some((m) => months.includes(m));
      const score =
        (named ? 6 : 0) +
        kindScore(p, filters.categories) +
        (inSeason ? 2 : 0) +
        p.tags.filter((t) => filters.tags.includes(t)).length * 2;
      return { ...p, inSeason, named, score };
    })
    .sort((a, b) => b.score - a.score || b.bestMonths.length - a.bestMonths.length || a.name.localeCompare(b.name));
  // When the traveler gave a time, leave out places that are off season then (unless named or too few fit):
  // fewer facts for the model to mix up, and a shorter prompt
  if (filters.months.length) {
    const fitting = scored.filter((p) => p.named || (p.inSeason && p.score > 2));
    if (fitting.length >= 2) return fitting.slice(0, MAX_PLACES);
  }
  return scored.slice(0, MAX_PLACES);
}

/** Popular trips and moments travelers posted in the same countries / categories / places */
async function findPosts(filters, places, spots = []) {
  const countries = [...new Set([...filters.countries, ...places.map((p) => p.countryCode)])];
  const names = places.map((p) => p.name.toLowerCase());
  // Posts of the spots picked come first, the ones asked about by name before the rest
  const spotPosts = [...new Set([...spots].sort((a, b) => b.named - a.named).flatMap((s) => s.postIds))];
  const { rows } = await pool.query(
    `SELECT p.id, p.kind, p.title, p.place_name, p.country_code, p.category, u.name AS author,
            (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)::int AS likes
     FROM posts p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'published' AND p.visibility = 'public' AND p.kind IN ('trip', 'moment')
       AND (p.country_code = ANY($1::text[])
            OR p.category = ANY($2::text[])
            OR lower(coalesce(p.place_name, '')) = ANY($3::text[])
            OR p.id = ANY($5::bigint[]))
     ORDER BY array_position($5::bigint[], p.id) NULLS LAST,
              (p.country_code = ANY($1::text[]) AND p.category = ANY($2::text[])) DESC,
              (p.kind = 'trip') DESC, likes DESC, p.created_at DESC
     LIMIT $4`,
    [countries, filters.categories, names, MAX_POSTS, spotPosts]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind,
    title: r.title ?? r.place_name,
    place: r.place_name,
    countryCode: r.country_code,
    category: r.category,
    author: r.author,
    likes: r.likes,
  }));
}

/** Countries asked about that onMyWay has nothing for yet (no destination and no traveler spot) */
async function missingCountries(filters) {
  const [places, spots] = await Promise.all([allPlaces(), allSpots()]);
  const known = new Set([...places, ...spots].map((p) => p.countryCode));
  return filters.countries.filter((c) => !known.has(c));
}

async function retrieve(filters, question) {
  const missing = await missingCountries(filters);
  // Asked only about countries we don't cover: suggest what we have instead (ignoring the country)
  const usable = missing.length && missing.length === filters.countries.length ? { ...filters, countries: [] } : filters;
  let places = await findPlaces(usable, question);
  const spots = await findSpots(usable, question, places);
  // Asked about a traveler spot by name ("Eiffel Tower?"): unrelated destinations would only distract,
  // keep the ones in the same country
  const namedSpots = spots.filter((s) => s.named);
  if (namedSpots.length && !places.some((p) => p.named))
    places = (await findPlaces({ ...usable, countries: [...new Set(namedSpots.map((s) => s.countryCode))] }, question))
      .map((p) => ({ p, d: p.latitude === null ? Infinity : Math.min(...namedSpots.map((s) => (s.latitude === null ? Infinity : km(p, s)))) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      // nearSpot: the spot is in this destination, so its season data answers "is the spot good in <month>?"
      .map(({ p, d }) => ({ ...p, nearSpot: d <= NEAR_KM }));
  const posts = await findPosts(usable, places, spots);
  return { places, spots, posts, missingCountries: missing };
}

module.exports = { retrieve, spotKeys };
