import { useSyncExternalStore } from "react";
import { apiFetch } from "./api";
import type { FeedComment, FeedPost } from "./mockFeed";

// Likes, "want to go" saves, follows and new comments shared by the feed and the post screen.
// Changes show instantly (optimistic); API posts are then synced with the server and rolled back
// if that fails. Sample posts (negative ids) only change locally.
const likeOverride = new Map<number, boolean>();
const saveOverride = new Map<number, boolean>();
const addedComments = new Map<number, FeedComment[]>();

type PostState = { liked?: boolean; saved?: boolean; newComments: FeedComment[] };

// Immutable snapshot per post, rebuilt after every change. useSyncExternalStore (and the
// React Compiler) only see an update when the returned object changes identity.
let snapshots = new Map<number, PostState>();
const listeners = new Set<() => void>();

function emit() {
  snapshots = new Map();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: FeedComment[] = [];

function getSnapshot(postId: number): PostState {
  let snapshot = snapshots.get(postId);
  if (!snapshot) {
    snapshot = {
      liked: likeOverride.get(postId),
      saved: saveOverride.get(postId),
      newComments: addedComments.get(postId) ?? EMPTY,
    };
    snapshots.set(postId, snapshot);
  }
  return snapshot;
}

// Follows: API authors by user id, sample authors by name
const followOverride = new Map<string, boolean>();

/** After reloading the feed the server counts already include our changes */
export function resetRemoteOverrides() {
  for (const map of [likeOverride, saveOverride, addedComments]) {
    for (const id of [...map.keys()]) if (id > 0) map.delete(id);
  }
  for (const key of [...followOverride.keys()]) if (key.startsWith("id:")) followOverride.delete(key);
  emit();
}

// Flip a flag now, then sync; undo it if the server rejects the change
function toggleFlag(map: Map<number, boolean>, post: FeedPost, current: boolean, path: string) {
  const next = !current;
  map.set(post.id, next);
  emit();
  if (!post.remote) return;
  apiFetch(`/posts/${post.id}/${path}`, { method: next ? "POST" : "DELETE" }).catch(() => {
    map.set(post.id, current);
    emit();
  });
}

export function usePostState(post: FeedPost) {
  const state = useSyncExternalStore(subscribe, () => getSnapshot(post.id));
  const liked = state.liked ?? !!post.liked;
  const saved = state.saved ?? !!post.saved;
  // Server counts include the viewer's own like/save; adjust them for local changes
  const likes = post.likes - (post.liked ? 1 : 0) + (liked ? 1 : 0);
  const wantToGo = (post.wantToGo ?? 0) - (post.saved ? 1 : 0) + (saved ? 1 : 0);

  return {
    liked,
    saved,
    likes,
    wantToGo,
    newComments: state.newComments,
    toggleLike: () => toggleFlag(likeOverride, post, liked, "like"),
    toggleSave: () => toggleFlag(saveOverride, post, saved, "save"),
    /** Throws when the server rejects the comment */
    addComment: async (text: string, authorName: string) => {
      const comment: FeedComment = post.remote
        ? await apiFetch<FeedComment>(`/posts/${post.id}/comments`, { method: "POST", body: { text } })
        : { id: `new-${Date.now()}`, author: { name: authorName }, text, createdAt: new Date().toISOString() };
      addedComments.set(post.id, [...(addedComments.get(post.id) ?? []), comment]);
      emit();
    },
  };
}

// Moments the user has already watched in the story viewer
let seenMoments: ReadonlySet<number> = new Set();

export function useSeenMoments() {
  const seen = useSyncExternalStore(subscribe, () => seenMoments);
  return {
    seen,
    markSeen: (id: number) => {
      if (seenMoments.has(id)) return;
      seenMoments = new Set([...seenMoments, id]);
      emit();
    },
  };
}

export function useFollowing(author: FeedPost["author"], initial = false) {
  const key = author.id ? `id:${author.id}` : `name:${author.name}`;
  const override = useSyncExternalStore(subscribe, () => followOverride.get(key));
  const isFollowing = override ?? initial;
  return {
    isFollowing,
    toggleFollow: () => {
      const next = !isFollowing;
      followOverride.set(key, next);
      emit();
      if (!author.id) return;
      apiFetch(`/users/${author.id}/follow`, { method: next ? "POST" : "DELETE" }).catch(() => {
        followOverride.set(key, !next);
        emit();
      });
    },
  };
}
