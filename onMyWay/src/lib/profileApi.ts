import { apiFetch, fetchMe } from "./api";
import { cachedFetch, peekCache, setCache } from "./cache";
import { rememberPosts, type FeedPost } from "./feed";
import { applyMyProfile, setRewardsPersister, type ProfileResponse } from "./rewards";

// Frame and pin changes from the rewards store are saved here
setRewardsPersister((patch) => apiFetch("/users/me/rewards", { method: "PATCH", body: patch }));

/** Cache keys, shared by the screens that show the same data */
export const profileKey = (userId: number) => `profile:${userId}`;
export const userPostsKey = (userId: number) => `posts:author:${userId}`;

export const fetchProfile = (userId: number) => apiFetch<ProfileResponse>(`/users/${userId}/profile`);

/** Reload my stats, frame and pins into the rewards store (kept on disk for the next app start) */
export async function refreshMyProfile(userId: number) {
  applyMyProfile(await cachedFetch(profileKey(userId), () => fetchProfile(userId), { persist: true, force: true }));
}

/** My profile as it was last time, shown at app start before the network answers */
export function hydrateMyProfile(userId: number) {
  const cached = peekCache<ProfileResponse>(profileKey(userId), { persist: true });
  if (cached) applyMyProfile(cached, { fromCache: true });
}

export type ProfilePatch = {
  name?: string;
  bio?: string | null;
  countryCode?: string | null;
  /** An uploaded photo's id, or null to remove the photo */
  avatarMediaId?: number | null;
};

/** Save my profile, then refresh the signed-in user (name, photo) and my profile store */
export async function updateMyProfile(patch: ProfilePatch) {
  const profile = await apiFetch<ProfileResponse>("/users/me", { method: "PATCH", body: patch });
  applyMyProfile(profile);
  setCache(profileKey(profile.user.id), profile, { persist: true });
  await fetchMe();
  return profile;
}

export async function fetchUserPosts(userId: number) {
  const posts = await apiFetch<FeedPost[]>(`/posts?author=${userId}&limit=50`);
  rememberPosts(posts);
  return posts;
}
