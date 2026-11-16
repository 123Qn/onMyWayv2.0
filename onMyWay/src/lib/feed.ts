// Feed data: posts loaded from the API, shared by every screen that shows them
import { useSyncExternalStore } from "react";

export type PlaceCategory = "beach" | "island" | "mountain" | "city" | "food" | "nature" | "culture";

/** trip = multi-stop route, moment = a single photo/place, question = asking travelers for tips */
export type PostKind = "trip" | "moment" | "question";

export type FeedPost = {
  id: number;
  kind?: PostKind; // default "trip"
  /** Trip headline written by the author */
  title?: string;
  /** frame: the avatar frame the author wears */
  author: { id: number; name: string; avatarUrl?: string; frame?: string };
  place: { name: string; country: string; countryCode: string }; // ISO 3166-1 alpha-2
  category: PlaceCategory;
  imageUrl: string;
  caption: string;
  tripDays?: number;
  createdAt: string; // ISO
  likes: number;
  comments: number;
  /** Ordered pin points of the trip, drawn as a route on the map */
  stops: TripStop[];
  /** Someone who liked it, shown in "Liked by ..." (a person the viewer follows first) */
  likedBy?: string;
  /** Names of the latest commenters (answerers, for questions) */
  commenters?: string[];
  wantToGo?: number;
  /** Travelers who followed this route with the in-app map */
  tookTrip?: number;
  /** Location confirmed from the photos (in-app camera GPS or photo metadata) */
  verified?: boolean;
  /** Moments posted during an ongoing trip: which day of it */
  tripDay?: number;
  /** The viewer's own state, as returned by the API */
  liked?: boolean;
  saved?: boolean;
  followingAuthor?: boolean;
};

export type TripStop = {
  id: string;
  name: string;
  caption: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  /** Pin taken from the photo's own GPS */
  fromPhoto?: boolean;
};

export type FeedComment = {
  id: string;
  author: { name: string };
  text: string;
  createdAt: string; // ISO
};

export const postKind = (post: FeedPost): PostKind => post.kind ?? "trip";

export const isByUser = (post: FeedPost, user?: { id: number } | null) => !!user && post.author.id === user.id;

const DAY_MS = 24 * 60 * 60 * 1000;

/** One traveler's moments from the last 24 hours, oldest first (story order) */
export type MomentGroup = { author: string; moments: FeedPost[]; latest: FeedPost };

/** Moments from the last day grouped per traveler, the most recently active first */
export function groupMoments(posts: FeedPost[], now = Date.now()): MomentGroup[] {
  const byAuthor = new Map<string, FeedPost[]>();
  for (const post of posts) {
    if (postKind(post) !== "moment" || !post.imageUrl) continue;
    if (now - Date.parse(post.createdAt) > DAY_MS) continue;
    const list = byAuthor.get(post.author.name) ?? [];
    list.push(post);
    byAuthor.set(post.author.name, list);
  }
  return [...byAuthor.entries()]
    .map(([author, list]) => {
      const moments = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { author, moments, latest: moments[moments.length - 1] };
    })
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
}

let allPosts: FeedPost[] = [];
const feedListeners = new Set<() => void>();

function setFeed(posts: FeedPost[]) {
  allPosts = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  feedListeners.forEach((l) => l());
}

export const setFeedPosts = (posts: FeedPost[]) => setFeed(posts);

/** Add or replace one post (e.g. right after creating it) */
export const upsertFeedPost = (post: FeedPost) => setFeed([post, ...allPosts.filter((p) => p.id !== post.id)]);

function subscribeFeed(listener: () => void) {
  feedListeners.add(listener);
  return () => {
    feedListeners.delete(listener);
  };
}

export const useFeedPosts = () => useSyncExternalStore(subscribeFeed, () => allPosts);

// Posts loaded outside the feed (saved list, trip history, profiles) so their screens can open them
const knownPosts = new Map<number, FeedPost>();

/** Remember posts for getPostById without adding them to the feed */
export function rememberPosts(posts: FeedPost[]) {
  for (const post of posts) knownPosts.set(post.id, post);
}

export const getPostById = (id: number) => allPosts.find((p) => p.id === id) ?? knownPosts.get(id);
