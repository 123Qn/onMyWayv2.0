import { Dimensions } from "react-native";
import { File } from "expo-file-system";
import { apiFetch } from "./api";
import { cachedFetch, peekCache, updateCache } from "./cache";
import { prefetchImages, sizedImage } from "./image";
import { appendFeedPosts, forgetPost, oldestFeedPost, postKind, setFeedPosts, upsertFeedPost, type FeedComment, type FeedPost, type PlaceCategory, type PostKind } from "./feed";
import { resetRemoteOverrides } from "./postStore";
import { refreshMyProfile } from "./profileApi";

export type UploadedPhoto = { id: number; url: string };

/** Sends the image bytes as the request body (no multipart needed) */
export async function uploadPhoto(uri: string) {
  const file = new File(uri);
  const type = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
  const bytes = await file.bytes();
  return apiFetch<UploadedPhoto>("/media", { method: "POST", body: bytes, contentType: type });
}

export type NewPostStop = {
  name: string;
  caption?: string;
  mediaId: number;
  latitude: number;
  longitude: number;
  fromPhoto: boolean;
};

export type NewPost = {
  kind: PostKind;
  title?: string;
  caption?: string;
  category: PlaceCategory;
  place: { name: string; country?: string; countryCode?: string };
  coverMediaId?: number;
  tripDays?: number;
  tripDay?: number;
  stops: NewPostStop[];
};

export async function createPost(input: NewPost) {
  const post = await apiFetch<FeedPost>("/posts", { method: "POST", body: input });
  upsertFeedPost(post);
  updateCache<FeedPost[]>(FEED_KEY, (list) => [post, ...list.filter((p) => p.id !== post.id)]);
  // A verified post can unlock badges: refresh my stats in the background
  if (post.author.id) refreshMyProfile(post.author.id).catch(() => {});
  return post;
}

const PAGE = 20;
// The first page is kept on disk: the next app start shows it at once, then refreshes it
const FEED_KEY = "feed";

// Feed cards are full width minus the card margins (see PostCard / PhotoCarousel)
const CARD_WIDTH = Dimensions.get("window").width - 56;

/** Download a page's photos while the user is still looking at the posts above them */
function prefetchFeedImages(posts: FeedPost[]) {
  prefetchImages(posts.map((p) => (postKind(p) === "question" ? null : sizedImage(p.imageUrl, CARD_WIDTH))));
}

/** Show the feed from the last app run right away (before the first request answers) */
export function hydrateFeed() {
  const cached = peekCache<FeedPost[]>(FEED_KEY, { persist: true });
  if (cached && !oldestFeedPost()) setFeedPosts(cached);
}

/** Reload the latest posts from the server into the feed; returns whether older posts may exist */
export async function refreshFeed() {
  // Callers at the same moment (app start + Home opening) share one request
  const posts = await cachedFetch(FEED_KEY, () => apiFetch<FeedPost[]>(`/posts?limit=${PAGE}`), { persist: true, force: true });
  // Fresh counts from the server replace the optimistic local ones
  resetRemoteOverrides();
  setFeedPosts(posts);
  prefetchFeedImages(posts);
  return posts.length === PAGE;
}

/** The next page of older posts; returns whether there may be more after it */
export async function loadMoreFeed() {
  const oldest = oldestFeedPost();
  if (!oldest) return refreshFeed();
  const posts = await apiFetch<FeedPost[]>(`/posts?limit=${PAGE}&before=${encodeURIComponent(oldest.createdAt)}`);
  appendFeedPosts(posts);
  prefetchFeedImages(posts);
  return posts.length === PAGE;
}

/** Delete my post; my stats are refreshed since they may change */
export async function deletePost(postId: number, myId?: number) {
  const post = await apiFetch<null>(`/posts/${postId}`, { method: "DELETE" });
  forgetPost(postId);
  updateCache<FeedPost[]>(FEED_KEY, (list) => list.filter((p) => p.id !== postId));
  if (myId) refreshMyProfile(myId).catch(() => {});
  return post;
}

export const fetchComments = (postId: number) => apiFetch<FeedComment[]>(`/posts/${postId}/comments`);
