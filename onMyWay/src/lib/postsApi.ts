import { File } from "expo-file-system";
import { apiFetch } from "./api";
import { setFeedPosts, upsertFeedPost, type FeedComment, type FeedPost, type PlaceCategory, type PostKind } from "./feed";
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
  // A verified post can unlock badges: refresh my stats in the background
  if (post.author.id) refreshMyProfile(post.author.id).catch(() => {});
  return post;
}

/** Reload the latest posts from the server into the feed */
export async function refreshFeed() {
  const posts = await apiFetch<FeedPost[]>("/posts?limit=50");
  // Fresh counts from the server replace the optimistic local ones
  resetRemoteOverrides();
  setFeedPosts(posts);
}

export const fetchComments = (postId: number) => apiFetch<FeedComment[]>(`/posts/${postId}/comments`);
