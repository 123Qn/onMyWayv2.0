import { File } from "expo-file-system";
import { apiFetch } from "./api";
import { setRemotePosts, upsertRemotePost, type FeedComment, type FeedPost, type PlaceCategory, type PostKind } from "./mockFeed";
import { resetRemoteOverrides } from "./postStore";
import { refreshMyProfile } from "./profileApi";

// The API returns posts in the app's FeedPost shape; mark them so likes etc. go to the server
export const asRemote = (post: FeedPost): FeedPost => ({ ...post, remote: true });

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
  const post = asRemote(await apiFetch<FeedPost>("/posts", { method: "POST", body: input }));
  upsertRemotePost(post);
  // A verified post can unlock badges: refresh my stats in the background
  if (post.author.id) refreshMyProfile(post.author.id).catch(() => {});
  return post;
}

/** Reload the latest posts from the server into the feed */
export async function refreshFeed() {
  const posts = (await apiFetch<FeedPost[]>("/posts?limit=50")).map(asRemote);
  // Fresh counts from the server replace the optimistic local ones
  resetRemoteOverrides();
  setRemotePosts(posts);
}

export const fetchComments = (postId: number) => apiFetch<FeedComment[]>(`/posts/${postId}/comments`);
