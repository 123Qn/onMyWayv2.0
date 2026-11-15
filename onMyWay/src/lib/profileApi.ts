import { apiFetch } from "./api";
import type { FeedPost } from "./mockFeed";
import { applyMyProfile, setRewardsPersister, type ProfileResponse } from "./rewards";

// Frame and pin changes from the rewards store are saved here
setRewardsPersister((patch) => apiFetch("/users/me/rewards", { method: "PATCH", body: patch }));

export const fetchProfile = (userId: number) => apiFetch<ProfileResponse>(`/users/${userId}/profile`);

/** Reload my stats, frame and pins into the rewards store */
export async function refreshMyProfile(userId: number) {
  applyMyProfile(await fetchProfile(userId));
}

// Same marker postsApi adds: likes etc. on these posts go to the server
const asRemote = (post: FeedPost): FeedPost => ({ ...post, remote: true });

export async function fetchUserPosts(userId: number) {
  return (await apiFetch<FeedPost[]>(`/posts?author=${userId}&limit=50`)).map(asRemote);
}
