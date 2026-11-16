import { apiFetch } from "./api";
import { rememberPosts, type FeedPost } from "./feed";
import type { TripRun } from "./tripRecorder";

export type PastTrip = TripRun & { post: FeedPost | null };

/** My "want to go" list, most recently saved first */
export async function fetchSavedPosts() {
  const posts = await apiFetch<FeedPost[]>("/posts/saved");
  rememberPosts(posts);
  return posts;
}

/** Trips I finished with the in-app map, newest first */
export async function fetchTripHistory() {
  const runs = await apiFetch<PastTrip[]>("/trip-runs");
  rememberPosts(runs.flatMap((r) => (r.post ? [r.post] : [])));
  return runs;
}

/** One post that may not be in the feed (e.g. the trip that is running after a restart) */
export async function fetchPost(postId: number) {
  const post = await apiFetch<FeedPost>(`/posts/${postId}`);
  rememberPosts([post]);
  return post;
}
