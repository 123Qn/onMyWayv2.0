import { useSyncExternalStore } from "react";
import { apiFetch } from "./api";
import type { PostKind } from "./mockFeed";

export type NotificationType = "like" | "comment" | "answer" | "follow";

export type AppNotification = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: { id: number; name: string; frame?: string };
  post?: { id: number; kind: PostKind; title: string; imageUrl?: string };
  comment?: string;
};

// Unread count for the bell in the feed header
let unread = 0;
const listeners = new Set<() => void>();

function setUnread(count: number) {
  if (count === unread) return;
  unread = count;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useUnreadCount = () => useSyncExternalStore(subscribe, () => unread);

export async function refreshUnreadCount() {
  const { count } = await apiFetch<{ count: number }>("/notifications/unread-count");
  setUnread(count);
}

export const fetchNotifications = () => apiFetch<AppNotification[]>("/notifications?limit=50");

export async function markAllRead() {
  setUnread(0);
  await apiFetch("/notifications/read", { method: "POST" });
}

export function resetNotifications() {
  setUnread(0);
}
