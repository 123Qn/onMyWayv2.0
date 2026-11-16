// Demo data: 10 travelers from different countries with trips, moments, questions,
// comments, likes, saves and follows.
//   npm run db:seed:demo
// Logins: test1@gmail.com ... test10@gmail.com, password DEMO_PASSWORD below.
// Safe to re-run: the demo users are kept (same ids) and everything they posted or did is recreated.
// Photos are Unsplash URLs stored as media keys (publicUrl passes absolute URLs through).
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const POSTS = require("./demo/posts.json");

const DEMO_PASSWORD = "Test@1234";

const USERS = [
  { name: "Linh Tran", country: "VN", timezone: "Asia/Ho_Chi_Minh", frame: "wave", bio: "Beach lover from Saigon. Always chasing the next sunset 🌅" },
  { name: "James Walker", country: "AU", timezone: "Australia/Sydney", frame: "compass", bio: "Sydney-based. Ferries, coastal walks and cheap flights." },
  { name: "Sofia Rossi", country: "IT", timezone: "Europe/Rome", frame: "laurel", bio: "Mountains in summer, cities in winter. Milano ✈️ everywhere." },
  { name: "Noah Kim", country: "KR", timezone: "Asia/Seoul", frame: "aurora", bio: "Seoul foodie and rock climber 🧗" },
  { name: "Chloe Martin", country: "FR", timezone: "Europe/Paris", frame: "tropical", bio: "Parisienne who would rather be on an island." },
  { name: "Made Wirawan", country: "ID", timezone: "Asia/Makassar", frame: "stamp", bio: "Local guide in Bali. Ask me anything about the island 🌺" },
  { name: "Lena Fischer", country: "DE", timezone: "Europe/Berlin", frame: "road", bio: "Train travel nerd from Berlin. Slow travel > fast travel." },
  { name: "Lucas Silva", country: "BR", timezone: "America/Sao_Paulo", frame: "jet", bio: "Carioca backpacker. 40 countries and counting 🇧🇷" },
  { name: "Emma Wilson", country: "GB", timezone: "Europe/London", frame: "sunrise", bio: "London mum of two, family travel on a budget." },
  { name: "Oliver Smith", country: "US", timezone: "America/New_York", frame: "summit", bio: "New Yorker. Weekend trips, long hikes, bad coffee." },
];

const COMMENTS = [
  "Adding this to my list for next year 😍",
  "How much was the accommodation per night?",
  "Went last month, can confirm: absolutely stunning.",
  "Great tip about going early, thanks for sharing!",
  "Is it good for kids? Planning a family trip.",
  "That photo is unreal. What camera do you use?",
  "Saved! Any food recommendations nearby?",
  "Did you book a tour or go on your own?",
  "How many days would you recommend?",
  "This brings back so many memories 🥹",
  "Best time of year to go?",
  "Okay, booking flights tonight.",
];

const REPLIES = [
  "Thanks, that's really helpful! 🙏",
  "Anytime! Let me know if you need more tips.",
  "Will do, booking it this week 😄",
  "+1 to this, did exactly the same last year.",
];

// Deterministic randomness so every run produces the same data
let seed = 20261116;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (list, n) => [...list].sort(() => random() - 0.5).slice(0, n);
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const haversineKm = (a, b) => {
  const rad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = rad(b.latitude) - rad(a.latitude);
  const dLng = rad(b.longitude) - rad(a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (check .env)");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN");
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const ids = [];
    for (const [i, u] of USERS.entries()) {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, bio, country_code, timezone, avatar_frame)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET name = $1, password_hash = $3, bio = $4, country_code = $5,
           timezone = $6, avatar_frame = $7
         RETURNING id`,
        [u.name, `test${i + 1}@gmail.com`, hash, u.bio, u.country, u.timezone, u.frame]
      );
      ids.push(rows[0].id);
    }
    const userId = (n) => ids[n - 1];

    // Start clean: everything the demo users posted or did (their posts cascade to stops, likes, comments)
    await db.query(`DELETE FROM posts WHERE user_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM comments WHERE user_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM post_likes WHERE user_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM post_saves WHERE user_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM follows WHERE follower_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM media WHERE owner_id = ANY($1) AND s3_key LIKE 'http%'`, [ids]);
    await db.query(`DELETE FROM trip_runs WHERE user_id = ANY($1)`, [ids]);

    const mediaIds = new Map();
    const media = async (url, ownerId) => {
      if (!url) return null;
      if (!mediaIds.has(url)) {
        const { rows } = await db.query(
          `INSERT INTO media (owner_id, s3_key, mime_type, status) VALUES ($1, $2, 'image/jpeg', 'ready')
           ON CONFLICT (s3_key) DO UPDATE SET status = 'ready' RETURNING id`,
          [ownerId, url]
        );
        mediaIds.set(url, rows[0].id);
      }
      return mediaIds.get(url);
    };

    const created = [];
    for (const p of POSTS) {
      const author = userId(p.author);
      const cover = await media(p.imageUrl ?? p.stops[0]?.imageUrl, author);
      const { rows } = await db.query(
        `INSERT INTO posts (user_id, kind, title, caption, category, place_name, country_name, country_code,
                            cover_media_id, trip_days, trip_day, verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - make_interval(mins => $13))
         RETURNING id, created_at`,
        [author, p.kind, p.title ?? null, p.caption, p.category, p.place.name, p.place.country, p.place.countryCode,
         cover, p.tripDays ?? null, p.tripDay ?? null, p.verified, p.agoMin]
      );
      const post = { ...rows[0], author, data: p };
      created.push(post);
      for (const [position, s] of p.stops.entries()) {
        await db.query(
          `INSERT INTO post_stops (post_id, position, name, caption, media_id, latitude, longitude, from_photo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [post.id, position, s.name, s.caption ?? null, await media(s.imageUrl, author), s.latitude, s.longitude, p.verified]
        );
      }
    }

    // Comments: real answers on questions, a few friendly ones elsewhere, spread between posting and now
    let commentCount = 0;
    for (const post of created) {
      const others = ids.filter((id) => id !== post.author);
      const lines = post.data.answers
        ? post.data.answers.map((a) => ({ userId: userId(a.author), text: a.text }))
        : pick(COMMENTS, between(1, 4)).map((text, i) => ({ userId: others[(post.id * 3 + i) % others.length], text }));
      const age = Date.now() - post.created_at.getTime();
      const top = [];
      for (const [i, c] of lines.entries()) {
        const at = new Date(post.created_at.getTime() + (age * (i + 1)) / (lines.length + 2));
        const { rows } = await db.query(
          `INSERT INTO comments (post_id, user_id, body, created_at) VALUES ($1, $2, $3, $4) RETURNING id`,
          [post.id, c.userId, c.text, at]
        );
        top.push({ id: rows[0].id, userId: c.userId, at });
        commentCount++;
      }

      // A back-and-forth under the first answer of every question (and some other posts):
      // author -> answerer -> author again -> someone else joins in
      if (!post.data.answers && post.id % 3 !== 0) continue;
      const first = top[0];
      const third = others.find((id) => id !== first.userId);
      const thread = [
        { userId: post.author, to: first.userId, text: REPLIES[0] },
        { userId: first.userId, to: post.author, text: REPLIES[1] },
        { userId: post.author, to: first.userId, text: REPLIES[2] },
        { userId: third, to: first.userId, text: REPLIES[3] },
      ];
      const span = Date.now() - first.at.getTime();
      for (const [i, r] of thread.entries()) {
        const at = new Date(first.at.getTime() + (span * (i + 1)) / (thread.length + 1));
        await db.query(
          `INSERT INTO comments (post_id, user_id, body, parent_id, reply_to_user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [post.id, r.userId, r.text, first.id, r.to, at]
        );
        commentCount++;
      }
    }

    // Likes and "want to go" saves from the other travelers
    let likeCount = 0;
    let saveCount = 0;
    for (const post of created) {
      const others = ids.filter((id) => id !== post.author);
      for (const id of pick(others, between(1, 8))) {
        await db.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [post.id, id]);
        likeCount++;
      }
      if (post.data.kind === "question") continue;
      for (const id of pick(others, between(0, 4))) {
        await db.query(`INSERT INTO post_saves (post_id, user_id) VALUES ($1, $2)`, [post.id, id]);
        saveCount++;
      }
    }

    // Finished trips over the last two months: 1 to 5 per traveler, on other people's trips and moments
    let runCount = 0;
    const followable = created.filter((p) => p.data.kind !== "question");
    for (const id of ids) {
      for (const post of pick(followable.filter((p) => p.author !== id), between(1, 5))) {
        const { rows: stops } = await db.query(
          `SELECT id, latitude, longitude FROM post_stops WHERE post_id = $1 ORDER BY position`,
          [post.id]
        );
        const reached = stops.slice(0, between(Math.min(1, stops.length), stops.length));
        // Road distance between the stops plus getting there, with some randomness
        let km = between(2, 25);
        for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1], stops[i]) * 1.3;
        const daysAgo = between(0, 59);
        const startedAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000 - between(1, 20) * 3600 * 1000);
        const endedAt = new Date(startedAt.getTime() + between(2, 30) * 3600 * 1000);
        const last = reached[reached.length - 1] ?? stops[0];
        await db.query(
          `INSERT INTO trip_runs (user_id, post_id, started_at, ended_at, distance_km, visited_stops, last_lat, last_lng, last_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $4)`,
          [id, post.id, startedAt, endedAt < new Date() ? endedAt : new Date(), Math.min(km, 9999).toFixed(3),
           reached.map((s) => s.id), last.latitude, last.longitude]
        );
        runCount++;
      }
    }

    // Everyone follows 3 to 6 of the others
    let followCount = 0;
    for (const id of ids) {
      for (const other of pick(ids.filter((x) => x !== id), between(3, 6))) {
        await db.query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`, [id, other]);
        followCount++;
      }
    }

    await db.query("COMMIT");
    console.log(
      `Seeded ${ids.length} users (test1..test${ids.length}@gmail.com / ${DEMO_PASSWORD}), ${created.length} posts, ` +
        `${commentCount} comments, ${likeCount} likes, ${saveCount} saves, ${followCount} follows, ${runCount} trips taken.`
    );
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
