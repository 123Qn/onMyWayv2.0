import { apiFetch } from "./api";
import { rememberPosts, type FeedPost } from "./feed";
import { applyMyProfile, setRewardsPersister, type ProfileResponse } from "./rewards";

// Frame and pin changes from the rewards store are saved here
setRewardsPersister((patch) => apiFetch("/users/me/rewards", { method: "PATCH", body: patch }));

export const fetchProfile = (userId: number) => apiFetch<ProfileResponse>(`/users/${userId}/profile`);

/** Reload my stats, frame and pins into the rewards store */
export async function refreshMyProfile(userId: number) {
  applyMyProfile(await fetchProfile(userId));
}

export async function fetchUserPosts(userId: number) {
  const posts = await apiFetch<FeedPost[]>(`/posts?author=${userId}&limit=50`);
  rememberPosts(posts);
  return posts;
}
