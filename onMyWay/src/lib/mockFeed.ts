// Sample feed until the backend has a posts API. Shape mirrors the posts/places tables.
import { useSyncExternalStore } from "react";

export type PlaceCategory = "beach" | "island" | "mountain" | "city" | "food" | "nature" | "culture";

/** trip = multi-stop route, moment = a single photo/place, question = asking travelers for tips */
export type PostKind = "trip" | "moment" | "question";

export type FeedPost = {
  id: number;
  kind?: PostKind; // default "trip"
  /** Trip headline written by the author (posts made in the app) */
  title?: string;
  /** frame: the avatar frame the author wore when posting (own posts) */
  author: { name: string; frame?: string };
  place: { name: string; country: string; countryCode: string }; // ISO 3166-1 alpha-2
  category: PlaceCategory;
  imageUrl: string;
  caption: string;
  tripDays?: number;
  createdAt: string; // ISO
  likes: number;
  comments: number;
  bestTime?: string;
  /** Ordered pin points of the trip, drawn as a route on the map */
  stops: TripStop[];
  /** People tagged as traveling with the author */
  companions?: string[];
  /** A friend shown in "Liked by ..." */
  likedBy?: string;
  wantToGo?: number;
  /** Travelers who followed this route */
  tookTrip?: number;
  /** Location confirmed from the photos (in-app camera GPS or photo metadata) */
  verified?: boolean;
};

export type TripStop = {
  id: string;
  name: string;
  caption: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
};

export type FeedComment = {
  id: string;
  author: { name: string };
  text: string;
  createdAt: string; // ISO
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1000&q=75&auto=format&fit=crop`;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const BASE_POSTS: FeedPost[] = [
  {
    id: 1,
    author: { name: "Linh Tran" },
    place: { name: "Phu Quoc", country: "Vietnam", countryCode: "VN" },
    category: "beach",
    imageUrl: unsplash("photo-1507525428034-b723cf961d3e"),
    caption: "Sunset at Sao Beach was unreal 🌅 Go in December — dry season, calm water and fewer crowds.",
    tripDays: 4,
    createdAt: minutesAgo(25),
    likes: 248,
    comments: 32,
    bestTime: "November to April — dry season with calm seas",
    stops: [
      {
        id: "1-1",
        name: "Duong Dong Night Market",
        caption: "Start with grilled seafood and sim wine — the market opens around 5pm.",
        imageUrl: unsplash("photo-1555939594-58d7cb561ad1"),
        latitude: 10.2166,
        longitude: 103.9605,
      },
      {
        id: "1-2",
        name: "Sao Beach",
        caption: "Powder-white sand and shallow turquoise water. Rent a sunbed and stay till lunch.",
        imageUrl: unsplash("photo-1560179406-1c6c60e0dc76"),
        latitude: 10.0573,
        longitude: 104.0363,
      },
      {
        id: "1-3",
        name: "Hon Thom Cable Car",
        caption: "One of the world's longest sea cable cars, with island views all the way across.",
        imageUrl: unsplash("photo-1578922746465-3a80a228f223"),
        latitude: 9.9585,
        longitude: 104.017,
      },
      {
        id: "1-4",
        name: "Sunset Town",
        caption: "Finish at the Kiss Bridge for the sunset that made the whole trip.",
        imageUrl: unsplash("photo-1507525428034-b723cf961d3e"),
        latitude: 10.0258,
        longitude: 104.0089,
      },
    ],
  },
  {
    id: 2,
    author: { name: "James Walker" },
    place: { name: "Sydney Harbour", country: "Australia", countryCode: "AU" },
    category: "city",
    imageUrl: unsplash("photo-1506973035872-a4ec16b8e8d9"),
    caption: "Took the Manly ferry for the best Opera House views — cheaper than any harbour cruise.",
    tripDays: 2,
    createdAt: minutesAgo(3 * 60),
    likes: 512,
    comments: 41,
    bestTime: "September to November or March to May — mild and less crowded",
    stops: [
      {
        id: "2-1",
        name: "Sydney Opera House",
        caption: "Book the morning tour, then grab coffee on the forecourt steps.",
        imageUrl: unsplash("photo-1523482580672-f109ba8cb9be"),
        latitude: -33.8568,
        longitude: 151.2153,
      },
      {
        id: "2-2",
        name: "Circular Quay",
        caption: "Hop on the Manly ferry here — the best harbour views for the price of a ticket.",
        imageUrl: unsplash("photo-1506973035872-a4ec16b8e8d9"),
        latitude: -33.861,
        longitude: 151.2108,
      },
      {
        id: "2-3",
        name: "Bondi to Coogee Walk",
        caption: "6 km of cliffs, ocean pools and beaches. Go early to beat the heat.",
        imageUrl: unsplash("photo-1559827260-dc66d52bef19"),
        latitude: -33.8915,
        longitude: 151.2767,
      },
    ],
  },
  {
    id: 3,
    author: { name: "Minh Nguyen" },
    place: { name: "Ha Long Bay", country: "Vietnam", countryCode: "VN" },
    category: "nature",
    imageUrl: unsplash("photo-1528127269322-539801943592"),
    caption: "Overnight cruise through the limestone karsts. Kayaking into the caves at sunrise was the highlight.",
    tripDays: 2,
    createdAt: minutesAgo(6 * 60),
    likes: 1034,
    comments: 87,
    bestTime: "March to May or September to November — clear skies, calm water",
    stops: [
      {
        id: "3-1",
        name: "Tuan Chau Harbour",
        caption: "Cruise boarding point. Arrive by 11am to get settled before lunch on deck.",
        imageUrl: unsplash("photo-1528127269322-539801943592"),
        latitude: 20.929,
        longitude: 106.997,
      },
      {
        id: "3-2",
        name: "Sung Sot Cave",
        caption: "The 'Surprise Cave' — huge chambers and a short hike with great bay views.",
        imageUrl: unsplash("photo-1504457047772-27faf1c00561"),
        latitude: 20.856,
        longitude: 107.089,
      },
      {
        id: "3-3",
        name: "Luon Cave Kayaking",
        caption: "Paddle through a low tunnel into a hidden lagoon ringed by cliffs.",
        imageUrl: unsplash("photo-1504214208698-ea1916a2195a"),
        latitude: 20.877,
        longitude: 107.064,
      },
      {
        id: "3-4",
        name: "Ti Top Island",
        caption: "Climb 400 steps at sunrise for the classic panorama over the bay.",
        imageUrl: unsplash("photo-1506665531195-3566af2b4dfa"),
        latitude: 20.859,
        longitude: 107.078,
      },
    ],
  },
  {
    id: 4,
    author: { name: "Sofia Rossi" },
    place: { name: "Lago di Braies", country: "Italy", countryCode: "IT" },
    category: "mountain",
    imageUrl: unsplash("photo-1501785888041-af3ef285b470"),
    caption: "Rented a wooden boat at 8am before the tour buses arrived. Absolutely worth the early alarm.",
    createdAt: minutesAgo(20 * 60),
    likes: 876,
    comments: 54,
    bestTime: "June to September, early morning before the crowds",
    stops: [
      {
        id: "4-1",
        name: "Lago di Braies",
        caption: "Rent a wooden rowboat at the boathouse before 9am — no queues.",
        imageUrl: unsplash("photo-1501785888041-af3ef285b470"),
        latitude: 46.6945,
        longitude: 12.0857,
      },
      {
        id: "4-2",
        name: "Lago di Dobbiaco",
        caption: "A quieter lake 20 minutes away, perfect for an easy lakeside walk.",
        imageUrl: unsplash("photo-1583244685026-d8519b5e3d21"),
        latitude: 46.729,
        longitude: 12.222,
      },
    ],
  },
  {
    id: 5,
    author: { name: "An Pham" },
    place: { name: "Golden Bridge, Da Nang", country: "Vietnam", countryCode: "VN" },
    category: "culture",
    imageUrl: unsplash("photo-1559592413-7cec4d0cae2b"),
    caption: "Walking on the giant hands above the clouds at Ba Na Hills. Arrive at opening time for photos.",
    tripDays: 3,
    createdAt: minutesAgo(26 * 60),
    likes: 692,
    comments: 38,
    bestTime: "February to May — cool and dry, fewer clouds",
    stops: [
      {
        id: "5-1",
        name: "My Khe Beach",
        caption: "Start the day with a swim — the water is calmest before 8am.",
        imageUrl: unsplash("photo-1560179406-1c6c60e0dc76"),
        latitude: 16.061,
        longitude: 108.247,
      },
      {
        id: "5-2",
        name: "Golden Bridge, Ba Na Hills",
        caption: "Take the first cable car up to have the giant hands to yourself.",
        imageUrl: unsplash("photo-1559592413-7cec4d0cae2b"),
        latitude: 15.995,
        longitude: 107.996,
      },
      {
        id: "5-3",
        name: "Coconut Forest, Hoi An",
        caption: "Spin around in a round basket boat through the water coconut palms.",
        imageUrl: unsplash("photo-1552733407-5d5c46c3bb3b"),
        latitude: 15.8756,
        longitude: 108.383,
      },
    ],
  },
  {
    id: 6,
    author: { name: "Noah Kim" },
    place: { name: "Railay Beach, Krabi", country: "Thailand", countryCode: "TH" },
    category: "beach",
    imageUrl: unsplash("photo-1552465011-b4e21bf6e79a"),
    caption: "Longtail boats only — no roads to Railay. Rock climbing in the morning, beach all afternoon.",
    tripDays: 5,
    createdAt: minutesAgo(2 * 24 * 60),
    likes: 431,
    comments: 22,
    bestTime: "November to April — dry season on the Andaman coast",
    stops: [
      {
        id: "6-1",
        name: "Ao Nang",
        caption: "Our base for five days — resorts, cheap food and longtails to everywhere.",
        imageUrl: unsplash("photo-1520250497591-112f2f40a3f4"),
        latitude: 8.032,
        longitude: 98.822,
      },
      {
        id: "6-2",
        name: "Railay Beach",
        caption: "Only reachable by boat. Climb in the morning, swim in the afternoon.",
        imageUrl: unsplash("photo-1552465011-b4e21bf6e79a"),
        latitude: 8.011,
        longitude: 98.838,
      },
      {
        id: "6-3",
        name: "Phi Phi Islands",
        caption: "Day trip by speedboat — Pileh Lagoon's water is unbelievably clear.",
        imageUrl: unsplash("photo-1589394815804-964ed0be2eb5"),
        latitude: 7.7407,
        longitude: 98.7784,
      },
      {
        id: "6-4",
        name: "Tiger Cave Temple",
        caption: "1,260 steps to the top, but the view over Krabi is worth every one.",
        imageUrl: unsplash("photo-1528181304800-259b08848526"),
        latitude: 8.127,
        longitude: 98.923,
      },
    ],
  },
  {
    id: 7,
    author: { name: "Chloe Martin" },
    place: { name: "Maldives", country: "Maldives", countryCode: "MV" },
    category: "island",
    imageUrl: unsplash("photo-1540202404-a2f29016b523"),
    caption: "Splurged on an overwater villa for our anniversary. Snorkelled with turtles right off the deck 🐢",
    tripDays: 6,
    createdAt: minutesAgo(3 * 24 * 60),
    likes: 1520,
    comments: 120,
    bestTime: "December to April — dry season, best visibility for snorkelling",
    stops: [
      {
        id: "7-1",
        name: "Velana Airport",
        caption: "The seaplane transfer is half the experience — sit on the right side.",
        imageUrl: unsplash("photo-1512100356356-de1b84283e18"),
        latitude: 4.1918,
        longitude: 73.529,
      },
      {
        id: "7-2",
        name: "Overwater Villa",
        caption: "Glass floor, private deck and a ladder straight into the lagoon.",
        imageUrl: unsplash("photo-1514282401047-d79a71a590e8"),
        latitude: 4.3,
        longitude: 73.42,
      },
      {
        id: "7-3",
        name: "House Reef",
        caption: "Turtles, reef sharks and huge schools of fish just off the jetty.",
        imageUrl: unsplash("photo-1544551763-46a013bb70d5"),
        latitude: 4.295,
        longitude: 73.415,
      },
    ],
  },
  {
    id: 8,
    author: { name: "Huy Le" },
    place: { name: "Ben Thanh Night Market", country: "Vietnam", countryCode: "VN" },
    category: "food",
    imageUrl: unsplash("photo-1555939594-58d7cb561ad1"),
    caption: "Grilled skewers, banh xeo and sugarcane juice for under $10. Come hungry after 7pm.",
    createdAt: minutesAgo(4 * 24 * 60),
    likes: 318,
    comments: 29,
    bestTime: "Any time — the market comes alive after 7pm",
    stops: [
      {
        id: "8-1",
        name: "Ben Thanh Night Market",
        caption: "Skewers, banh xeo and sugarcane juice — come hungry after 7pm.",
        imageUrl: unsplash("photo-1555939594-58d7cb561ad1"),
        latitude: 10.7725,
        longitude: 106.698,
      },
      {
        id: "8-2",
        name: "Saigon Riverside",
        caption: "Walk it off along the river with the skyline lit up at night.",
        imageUrl: unsplash("photo-1583417319070-4a69db38a482"),
        latitude: 10.774,
        longitude: 106.706,
      },
    ],
  },
  {
    id: 9,
    author: { name: "Made Wirawan" },
    place: { name: "Ulun Danu Beratan, Bali", country: "Indonesia", countryCode: "ID" },
    category: "culture",
    imageUrl: unsplash("photo-1537996194471-e657df975ab4"),
    caption: "The lake temple on a misty morning. Bring a sarong — and a jacket, it's cool up in the highlands.",
    tripDays: 7,
    createdAt: minutesAgo(5 * 24 * 60),
    likes: 754,
    comments: 46,
    bestTime: "April to October — dry season",
    stops: [
      {
        id: "9-1",
        name: "Tanah Lot",
        caption: "Sea temple on a rock — arrive an hour before sunset for a good spot.",
        imageUrl: unsplash("photo-1518548419970-58e3b4079ab2"),
        latitude: -8.6212,
        longitude: 115.0868,
      },
      {
        id: "9-2",
        name: "Ulun Danu Beratan",
        caption: "The lake temple in the highlands, magical on a misty morning.",
        imageUrl: unsplash("photo-1537996194471-e657df975ab4"),
        latitude: -8.2752,
        longitude: 115.1668,
      },
      {
        id: "9-3",
        name: "Nusa Penida",
        caption: "Fast boat from Sanur for Kelingking and Diamond Beach. Wear proper shoes.",
        imageUrl: unsplash("photo-1573790387438-4da905039392"),
        latitude: -8.786,
        longitude: 115.623,
      },
      {
        id: "9-4",
        name: "Uluwatu",
        caption: "Clifftop beach clubs, surf breaks and the Kecak fire dance at dusk.",
        imageUrl: unsplash("photo-1540541338287-41700207dee6"),
        latitude: -8.8291,
        longitude: 115.0849,
      },
    ],
  },
  {
    id: 10,
    author: { name: "Ethan Brooks" },
    place: { name: "Blue Mountains", country: "Australia", countryCode: "AU" },
    category: "nature",
    imageUrl: unsplash("photo-1504280390367-361c6d9f38f4"),
    caption: "First camping trip with the kids. Two hours from Sydney and it feels like another world.",
    tripDays: 2,
    createdAt: minutesAgo(6 * 24 * 60),
    likes: 205,
    comments: 17,
    bestTime: "September to November — mild weather, wildflowers",
    stops: [
      {
        id: "10-1",
        name: "Three Sisters, Katoomba",
        caption: "Echo Point lookout first, then the Giant Stairway if your legs allow.",
        imageUrl: unsplash("photo-1464822759023-fed622ff2c3b"),
        latitude: -33.732,
        longitude: 150.312,
      },
      {
        id: "10-2",
        name: "Blackheath Campground",
        caption: "Pitched the tent here — quiet, close to Govetts Leap and great stars.",
        imageUrl: unsplash("photo-1504280390367-361c6d9f38f4"),
        latitude: -33.635,
        longitude: 150.287,
      },
    ],
  },
  {
    id: 11,
    author: { name: "Lena Fischer" },
    place: { name: "Whitsunday Islands", country: "Australia", countryCode: "AU" },
    category: "island",
    imageUrl: unsplash("photo-1519046904884-53103b34b206"),
    caption: "Sailed three days around the Whitsundays. Whitehaven's sand is so fine it squeaks.",
    tripDays: 3,
    createdAt: minutesAgo(8 * 24 * 60),
    likes: 389,
    comments: 25,
    bestTime: "June to October — dry winter, outside stinger season",
    stops: [
      {
        id: "11-1",
        name: "Airlie Beach",
        caption: "Gateway to the Whitsundays — stock up and board the boat here.",
        imageUrl: unsplash("photo-1519046904884-53103b34b206"),
        latitude: -20.2686,
        longitude: 148.7186,
      },
      {
        id: "11-2",
        name: "Hill Inlet",
        caption: "Swirling sand and water from the lookout. Time it with low tide.",
        imageUrl: unsplash("photo-1578922746465-3a80a228f223"),
        latitude: -20.26,
        longitude: 149.042,
      },
      {
        id: "11-3",
        name: "Whitehaven Beach",
        caption: "Seven kilometres of pure silica sand that squeaks underfoot.",
        imageUrl: unsplash("photo-1560179406-1c6c60e0dc76"),
        latitude: -20.2823,
        longitude: 149.0388,
      },
    ],
  },
  {
    id: 12,
    author: { name: "Tuan Vo" },
    place: { name: "Fansipan, Sa Pa", country: "Vietnam", countryCode: "VN" },
    category: "mountain",
    imageUrl: unsplash("photo-1506905925346-21bda4d32df4"),
    caption: "Above the sea of clouds on the roof of Indochina ☁️ Took the cable car up, hiked the last stretch.",
    tripDays: 3,
    createdAt: minutesAgo(10 * 24 * 60),
    likes: 967,
    comments: 63,
    bestTime: "March to May or September to November — clear views above the clouds",
    stops: [
      {
        id: "12-1",
        name: "Hanoi Train Street",
        caption: "Coffee by the tracks before the overnight bus to Sa Pa.",
        imageUrl: unsplash("photo-1555921015-5532091f6026"),
        latitude: 21.0285,
        longitude: 105.8442,
      },
      {
        id: "12-2",
        name: "Muong Hoa Valley",
        caption: "Trekked through rice terraces and stayed with a Hmong family.",
        imageUrl: unsplash("photo-1570366583862-f91883984fde"),
        latitude: 22.304,
        longitude: 103.88,
      },
      {
        id: "12-3",
        name: "Fansipan Summit",
        caption: "Cable car most of the way, then the last 600 steps above the clouds.",
        imageUrl: unsplash("photo-1506905925346-21bda4d32df4"),
        latitude: 22.3033,
        longitude: 103.775,
      },
    ],
  },
];

const EXTRA_POSTS: FeedPost[] = [
  {
    id: 13,
    kind: "moment",
    author: { name: "Mai Hoang" },
    place: { name: "Hang Mua, Ninh Binh", country: "Vietnam", countryCode: "VN" },
    category: "nature",
    imageUrl: unsplash("photo-1557750255-c76072a7aad1"),
    caption: "Woke up at 5am for this view. Worth every one of the 500 steps 🐉",
    createdAt: minutesAgo(50),
    likes: 132,
    comments: 9,
    stops: [
      {
        id: "13-1",
        name: "Hang Mua Viewpoint",
        caption: "Climb before sunrise — the dragon on the summit faces the whole Tam Coc valley.",
        imageUrl: unsplash("photo-1557750255-c76072a7aad1"),
        latitude: 20.2556,
        longitude: 105.9361,
      },
    ],
  },
  {
    id: 14,
    kind: "question",
    author: { name: "Oliver Smith" },
    place: { name: "Da Lat", country: "Vietnam", countryCode: "VN" },
    category: "mountain",
    imageUrl: unsplash("photo-1464822759023-fed622ff2c3b"),
    caption: "First time in Da Lat next month 🌲 Stay near the lake or out in the pine hills? Any cafés I can't miss?",
    createdAt: minutesAgo(2 * 60),
    likes: 41,
    comments: 18,
    stops: [],
  },
  {
    id: 15,
    kind: "moment",
    author: { name: "Lucas Silva" },
    place: { name: "Kelingking Beach", country: "Indonesia", countryCode: "ID" },
    category: "island",
    imageUrl: unsplash("photo-1573790387438-4da905039392"),
    caption: "The hike down is no joke, but look at that water 🤯",
    createdAt: minutesAgo(14 * 60),
    likes: 510,
    comments: 27,
    stops: [
      {
        id: "15-1",
        name: "Kelingking Beach",
        caption: "The T-Rex cliff. Bring water and real shoes for the steep path down.",
        imageUrl: unsplash("photo-1573790387438-4da905039392"),
        latitude: -8.7539,
        longitude: 115.4723,
      },
    ],
  },
  {
    id: 16,
    kind: "question",
    author: { name: "Emma Wilson" },
    place: { name: "Krabi", country: "Thailand", countryCode: "TH" },
    category: "beach",
    imageUrl: unsplash("photo-1552465011-b4e21bf6e79a"),
    caption: "Krabi or Phuket for a family trip with two kids under 6? Looking for calm beaches and short transfers 🙏",
    createdAt: minutesAgo(30 * 60),
    likes: 23,
    comments: 14,
    stops: [],
  },
];

// Social details layered on top of the posts
const SOCIAL: Record<number, Partial<FeedPost>> = {
  1: { companions: ["Mai Hoang", "Khoa Dang"], likedBy: "Mai Hoang", wantToGo: 1240, tookTrip: 312, verified: true },
  2: { likedBy: "Ava Johnson", wantToGo: 860, tookTrip: 145, verified: true },
  3: { companions: ["Huy Le"], likedBy: "Thao Nguyen", wantToGo: 2310, tookTrip: 604, verified: true },
  4: { likedBy: "Lucas Silva", wantToGo: 1580, tookTrip: 221 },
  5: { companions: ["Linh Tran", "Duc Bui", "Thao Nguyen"], likedBy: "Khoa Dang", wantToGo: 940, tookTrip: 178, verified: true },
  6: { likedBy: "Emma Wilson", wantToGo: 1720, tookTrip: 390, verified: true },
  7: { companions: ["Lucas Silva"], likedBy: "Oliver Smith", wantToGo: 3050, tookTrip: 97, verified: true },
  8: { likedBy: "Duc Bui", wantToGo: 410, tookTrip: 263 },
  9: { likedBy: "Mai Hoang", wantToGo: 2480, tookTrip: 455, verified: true },
  10: { companions: ["Noah Kim"], likedBy: "Ava Johnson", wantToGo: 520, tookTrip: 88 },
  11: { likedBy: "Chloe Martin", wantToGo: 1960, tookTrip: 240, verified: true },
  12: { companions: ["An Pham"], likedBy: "Thao Nguyen", wantToGo: 1330, tookTrip: 286, verified: true },
  13: { likedBy: "Linh Tran", wantToGo: 380, verified: true },
  14: { likedBy: "Minh Nguyen" },
  15: { companions: ["Chloe Martin"], likedBy: "Noah Kim", wantToGo: 890, verified: true },
  16: { likedBy: "Noah Kim" },
};

export const MOCK_POSTS: FeedPost[] = [...BASE_POSTS, ...EXTRA_POSTS]
  .map((post) => ({ ...post, ...SOCIAL[post.id] }))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const postKind = (post: FeedPost): PostKind => post.kind ?? "trip";

/** Travelers posting live from a trip, for the "On the road now" row */
export const ON_THE_ROAD: { postId: number; day: number }[] = [
  { postId: 1, day: 3 },
  { postId: 13, day: 2 },
  { postId: 3, day: 2 },
  { postId: 15, day: 5 },
  { postId: 2, day: 1 },
  { postId: 5, day: 3 },
  { postId: 4, day: 4 },
];

// Posts created on this device, newest first (until they are saved through the API)
let myPosts: FeedPost[] = [];
let allPosts: FeedPost[] = MOCK_POSTS;
const feedListeners = new Set<() => void>();
let nextId = 10_000;

export function addPost(post: Omit<FeedPost, "id">): FeedPost {
  const created = { ...post, id: nextId++ };
  myPosts = [created, ...myPosts];
  allPosts = [...myPosts, ...MOCK_POSTS];
  feedListeners.forEach((l) => l());
  return created;
}

function subscribeFeed(listener: () => void) {
  feedListeners.add(listener);
  return () => {
    feedListeners.delete(listener);
  };
}

export const useFeedPosts = () => useSyncExternalStore(subscribeFeed, () => allPosts);

export const getPostById = (id: number) => allPosts.find((p) => p.id === id);

const COMMENT_POOL: { name: string; text: string }[] = [
  { name: "Mai Hoang", text: "Adding this to my list for next year 😍" },
  { name: "Oliver Smith", text: "How much was the accommodation per night?" },
  { name: "Thao Nguyen", text: "Went last month — can confirm, absolutely stunning." },
  { name: "Lucas Silva", text: "Great tip about going early, thanks for sharing!" },
  { name: "Emma Wilson", text: "Is it good for kids? Planning a family trip." },
  { name: "Khoa Dang", text: "That photo is unreal. What camera do you use?" },
  { name: "Ava Johnson", text: "Saved! Any food recommendations nearby?" },
  { name: "Duc Bui", text: "Did you book a tour or go on your own?" },
];

// Replies that actually answer the question posts
const ANSWERS: Record<number, { name: string; text: string }[]> = {
  14: [
    { name: "Thao Nguyen", text: "Pine hills for sure — quieter, cooler and the sunrise over the fog is magic." },
    { name: "Khoa Dang", text: "Don't miss Me Linh Coffee Garden. Go around 4pm for the valley view." },
    { name: "Linh Tran", text: "Near the lake if you don't ride a motorbike, everything is walkable." },
    { name: "Duc Bui", text: "Bring a jacket! It gets to 12°C at night in December." },
  ],
  16: [
    { name: "Noah Kim", text: "Krabi! Ao Nang has calm water and longtails to quiet beaches. Phuket felt hectic." },
    { name: "Ava Johnson", text: "We did Phuket with a 4-year-old — Kata Beach was perfect, very shallow." },
    { name: "Chloe Martin", text: "Krabi airport to Ao Nang is only 30 min, easy with kids." },
    { name: "Mai Hoang", text: "Avoid May to October, the sea gets rough on the west coast." },
  ],
};

// A few sample comments per post (the full count is in post.comments)
export function getMockComments(post: FeedPost): FeedComment[] {
  const count = Math.min(post.comments, 4);
  const postTime = new Date(post.createdAt).getTime();
  return Array.from({ length: count }, (_, i) => {
    const answers = ANSWERS[post.id];
    const sample = answers?.[i % answers.length] ?? COMMENT_POOL[(post.id * 3 + i) % COMMENT_POOL.length];
    const age = (Date.now() - postTime) * ((count - i) / (count + 1));
    return {
      id: `${post.id}-${i}`,
      author: { name: sample.name },
      text: sample.text,
      createdAt: new Date(Date.now() - age).toISOString(),
    };
  });
}
