import { apiFetch } from "./api";
import { rememberPosts, type FeedPost } from "./feed";

/** A destination the travel assistant suggests */
export type PlaceCard = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  countryCode: string;
  country: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  bestMonths: number[];
  seasonNotes: string | null;
};

export type AssistantMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  places: PlaceCard[];
  posts: FeedPost[];
};

export type Conversation = { id: number; title: string | null; createdAt: string; updatedAt: string };

/** Ask the assistant; starts a new conversation when conversationId is null */
export async function askAssistant(message: string, conversationId: number | null) {
  const res = await apiFetch<{ conversationId: number; message: AssistantMessage }>("/ai/chat", {
    method: "POST",
    body: { message, conversationId },
  });
  // Suggested posts open in the post screen
  rememberPosts(res.message.posts);
  return res;
}

export const fetchConversations = () => apiFetch<Conversation[]>("/ai/conversations");

export async function fetchConversation(id: number) {
  const res = await apiFetch<{ id: number; title: string | null; messages: AssistantMessage[] }>(`/ai/conversations/${id}`);
  rememberPosts(res.messages.flatMap((m) => m.posts));
  return res;
}

export const deleteConversation = (id: number) => apiFetch<null>(`/ai/conversations/${id}`, { method: "DELETE" });
