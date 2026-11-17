// Posts for the official onMyWay account (team / customer service): editor's-pick trips, a welcome
// moment and a community question, with likes, comments and follows from the demo travelers.
//   npm run db:seed:official          (run db:seed:demo first: the demo travelers react to the posts)
// The account must already exist (sign up in the app). OFFICIAL_EMAIL picks it, default below.
// It is also made an official account (role 'official': every badge, top level).
// Safe to re-run: only the posts listed here are replaced; anything else the account posted is kept.
require("dotenv").config();
const { Client } = require("pg");

const OFFICIAL_EMAIL = process.env.OFFICIAL_EMAIL || "onmyway.app.contact@gmail.com";
const img = (id) => `https://images.unsplash.com/photo-${id}?w=1000&q=75&auto=format&fit=crop`;

// `fans`: demo travelers (test1..test10) who like the post; `answers`: [traveler, text]
const POSTS = [
  {
    kind: "moment",
    caption:
      "Welcome to onMyWay 👋 We're the onMyWay team. Share your trips with real GPS pins, ask other travelers anything, and tap the little robot on Home to ask Way, our travel assistant. Questions or problems with the app? Comment here and we'll answer.",
    category: "city",
    place: { name: "Saigon", country: "Vietnam", countryCode: "VN" },
    image: img("1583417319070-4a69db38a482"),
    agoMin: 60 * 26,
    stops: [{ name: "Saigon River", caption: "Where onMyWay was born ☕", lat: 10.774, lng: 106.706 }],
    fans: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    answers: [
      [1, "Love the app already! The trip map is so useful 😍"],
      [8, "Can we export a trip as a PDF to share offline?"],
      [0, "Great idea, it's on our list! For now you can share the trip link from the post menu."],
      [4, "The robot is adorable 🤖"],
    ],
  },
  {
    kind: "trip",
    title: "onMyWay pick: Hanoi in 2 days",
    caption: "Our team's favourite first trip to Hanoi: temples at sunrise, coffee by the railway and street food every night. Best from October to April.",
    category: "culture",
    place: { name: "Hanoi", country: "Vietnam", countryCode: "VN" },
    image: img("1599708153386-62bf3f035c78"),
    tripDays: 2,
    agoMin: 60 * 22,
    stops: [
      { name: "Tran Quoc Pagoda", caption: "The oldest pagoda in Hanoi, on West Lake. Go before 8am for soft light and no crowds.", image: img("1599708153386-62bf3f035c78"), lat: 21.0479, lng: 105.8368 },
      { name: "Hanoi Train Street", caption: "Grab an egg coffee in one of the cafés and ask them when the next train passes.", image: img("1555921015-5532091f6026"), lat: 21.0294, lng: 105.8436 },
    ],
    fans: [1, 3, 5, 7, 9],
    answers: [
      [7, "Is the train street still open to visitors?"],
      [0, "Some sections close from time to time. Check with the cafés: they know the train times and whether you can sit there."],
    ],
  },
  {
    kind: "trip",
    title: "onMyWay pick: Ninh Binh day trip",
    caption: "Karst mountains, rice fields and boat rides, 2 hours from Hanoi. Come in May–June for golden rice or Sep–Oct for clear skies.",
    category: "nature",
    place: { name: "Ninh Binh", country: "Vietnam", countryCode: "VN" },
    image: img("1504457047772-27faf1c00561"),
    tripDays: 1,
    agoMin: 60 * 20,
    stops: [
      { name: "Tam Coc", caption: "Take the rowing boat through three caves. The rowers paddle with their feet!", image: img("1504457047772-27faf1c00561"), lat: 20.2155, lng: 105.9369 },
      { name: "Trang An", caption: "A UNESCO site: quieter than Tam Coc, with temples you can only reach by boat.", image: img("1557750255-c76072a7aad1"), lat: 20.2537, lng: 105.8935 },
    ],
    fans: [2, 4, 6, 9],
    answers: [[9, "Did this with my kids last summer, they loved the boat ride."]],
  },
  {
    kind: "trip",
    title: "onMyWay pick: Central coast by train",
    caption: "Da Nang to Nha Trang on one of the prettiest railways in Asia. Dry and sunny from February to August.",
    category: "beach",
    place: { name: "Golden Bridge, Da Nang", country: "Vietnam", countryCode: "VN" },
    image: img("1559592413-7cec4d0cae2b"),
    tripDays: 4,
    agoMin: 60 * 14,
    stops: [
      { name: "Golden Bridge, Ba Na Hills", caption: "Take the first cable car up at 8am to have the giant hands to yourself.", image: img("1559592413-7cec4d0cae2b"), lat: 15.9977, lng: 107.988 },
      { name: "Nha Trang Beach", caption: "6 km of beach right in town. Snorkel trips to the islands leave from the port every morning.", image: img("1533002832-1721d16b4bb9"), lat: 12.2388, lng: 109.1967 },
    ],
    fans: [1, 2, 5, 8, 10],
    answers: [[2, "How long is the train from Da Nang to Nha Trang?"], [0, "About 9–10 hours. Take the morning train for the sea views around Hai Van Pass."]],
  },
  {
    kind: "moment",
    caption: "Team trip day 🛶 Ha Long Bay was calm as glass this morning. Tip: book a boat that leaves from Lan Ha Bay side for fewer crowds.",
    category: "nature",
    place: { name: "Ha Long Bay", country: "Vietnam", countryCode: "VN" },
    image: img("1528127269322-539801943592"),
    tripDay: 1,
    agoMin: 60 * 5,
    stops: [{ name: "Ha Long Bay", caption: "Calm water and mist between the islands at 7am.", lat: 20.9101, lng: 107.1839 }],
    fans: [3, 4, 6, 7, 8, 10],
    answers: [[6, "So peaceful! Which month is this?"], [0, "Mid-November: cool, dry and very clear."]],
  },
  {
    kind: "question",
    caption: "Help us choose 🗺️ Where should our next onMyWay guide go: Sa Pa's rice terraces or Krabi's islands? Tell us why in the comments!",
    category: "mountain",
    place: { name: "Sa Pa", country: "Vietnam", countryCode: "VN" },
    image: img("1570366583862-f91883984fde"),
    agoMin: 60 * 2,
    stops: [],
    fans: [1, 5, 9],
    answers: [
      [1, "Sa Pa! September when the terraces turn gold 🌾"],
      [5, "Krabi for sure, the longtail boats to Railay are magic."],
      [10, "Sa Pa, and please include a homestay list!"],
    ],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (check .env)");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const { rows: found } = await db.query(`SELECT id, name FROM users WHERE lower(email) = lower($1)`, [OFFICIAL_EMAIL]);
    if (!found[0]) throw new Error(`No account with email ${OFFICIAL_EMAIL}: sign up in the app first`);
    const official = found[0].id;
    // Official account: every badge and the top level in the app (migration 009)
    await db.query(`UPDATE users SET role = 'official' WHERE id = $1`, [official]);
    const { rows: demo } = await db.query(
      `SELECT id, substring(email from '^test(\\d+)@gmail\\.com$')::int AS n FROM users WHERE email ~ '^test\\d+@gmail\\.com$'`
    );
    const traveler = (n) => (n === 0 ? official : demo.find((d) => d.n === n)?.id);

    await db.query("BEGIN");
    // Replace only the posts this script made (matched by caption)
    await db.query(`DELETE FROM posts WHERE user_id = $1 AND caption = ANY($2)`, [official, POSTS.map((p) => p.caption)]);

    const media = async (url) => {
      const { rows } = await db.query(
        `INSERT INTO media (owner_id, s3_key, mime_type, status) VALUES ($1, $2, 'image/jpeg', 'ready')
         ON CONFLICT (s3_key) DO UPDATE SET status = 'ready' RETURNING id`,
        [official, url]
      );
      return rows[0].id;
    };

    let comments = 0;
    let likes = 0;
    for (const p of POSTS) {
      const { rows } = await db.query(
        `INSERT INTO posts (user_id, kind, title, caption, category, place_name, country_name, country_code,
                            cover_media_id, trip_days, trip_day, verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE, NOW() - make_interval(mins => $12))
         RETURNING id, created_at`,
        [official, p.kind, p.title ?? null, p.caption, p.category, p.place.name, p.place.country, p.place.countryCode,
         await media(p.image), p.tripDays ?? null, p.tripDay ?? null, p.agoMin]
      );
      const post = rows[0];
      for (const [position, s] of p.stops.entries()) {
        await db.query(
          `INSERT INTO post_stops (post_id, position, name, caption, media_id, latitude, longitude, from_photo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
          [post.id, position, s.name, s.caption, await media(s.image ?? p.image), s.lat, s.lng]
        );
      }
      // Comments spread between posting and now; the team's answers reply to the comment before them
      const age = Date.now() - post.created_at.getTime();
      let previous = null;
      for (const [i, [n, text]] of p.answers.entries()) {
        const author = traveler(n);
        if (!author) continue;
        const at = new Date(post.created_at.getTime() + (age * (i + 1)) / (p.answers.length + 1));
        const reply = n === 0 && previous;
        const { rows: c } = await db.query(
          `INSERT INTO comments (post_id, user_id, body, parent_id, reply_to_user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [post.id, author, text, reply ? previous.id : null, reply ? previous.userId : null, at]
        );
        previous = { id: c[0].id, userId: author };
        comments++;
      }
      for (const n of p.fans) {
        if (!traveler(n)) continue;
        await db.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [post.id, traveler(n)]);
        likes++;
      }
    }

    // Demo travelers follow the official account
    for (const d of demo) {
      await db.query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [d.id, official]);
    }

    await db.query("COMMIT");
    console.log(`${found[0].name} (#${official}): ${POSTS.length} posts, ${comments} comments, ${likes} likes, ${demo.length} followers`);
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
