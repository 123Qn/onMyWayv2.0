import { useSyncExternalStore } from "react";
import type { FeedComment } from "./mockFeed";

// In-memory likes, "want to go" saves, follows and new comments shared by the feed and the post screen.
// Replace with API calls once the backend has post endpoints.
const liked = new Set<number>();
const saved = new Set<number>();
const addedComments = new Map<number, FeedComment[]>();

type PostState = { liked: boolean; saved: boolean; newComments: FeedComment[] };

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
      liked: liked.has(postId),
      saved: saved.has(postId),
      newComments: addedComments.get(postId) ?? EMPTY,
    };
    snapshots.set(postId, snapshot);
  }
  return snapshot;
}

const toggle = (set: Set<number>, id: number) => {
  if (set.has(id)) set.delete(id);
  else set.add(id);
  emit();
};

export function usePostState(postId: number) {
  const state = useSyncExternalStore(subscribe, () => getSnapshot(postId));
  return {
    ...state,
    toggleLike: () => toggle(liked, postId),
    toggleSave: () => toggle(saved, postId),
    addComment: (comment: FeedComment) => {
      addedComments.set(postId, [...(addedComments.get(postId) ?? []), comment]);
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

// Followed authors, keyed by name until users have ids in the feed
const following = new Set<string>();

export function useFollowing(authorName: string) {
  const isFollowing = useSyncExternalStore(subscribe, () => following.has(authorName));
  return {
    isFollowing,
    toggleFollow: () => {
      if (following.has(authorName)) following.delete(authorName);
      else following.add(authorName);
      emit();
    },
  };
}
