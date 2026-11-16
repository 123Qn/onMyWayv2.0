import { router } from "expo-router";
import { apiFetch } from "./api";

export type Traveler = {
  id: number;
  name: string;
  frame: string;
  avatarUrl: string | null;
  countryCode: string | null;
  country: string | null;
  bio: string | null;
  followers: number;
  posts: number;
  following: boolean;
};

/** Why someone is suggested: followed by people I follow, from my country, or just popular */
export type SuggestionReason = { type: "friends"; count: number } | { type: "country" } | { type: "popular" };

export type SuggestedTraveler = Traveler & { reason: SuggestionReason };

export type LeaderboardMetric = "km" | "countries" | "trips";
export type LeaderboardPeriod = "week" | "month" | "all";

export type LeaderboardEntry = {
  rank: number;
  value: number;
  user: { id: number; name: string; frame: string; avatarUrl: string | null; countryCode: string | null };
};

export type Leaderboard = {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  /** My own row, also when I'm outside the top */
  me: LeaderboardEntry | null;
};

/** Travelers matching a name or country, or everyone (most followed first) when q is empty */
export const fetchTravelers = (q = "") => apiFetch<Traveler[]>(`/travelers?q=${encodeURIComponent(q)}`);

export const fetchSuggestedTravelers = () => apiFetch<SuggestedTraveler[]>("/travelers/suggested");

export const fetchLeaderboard = (metric: LeaderboardMetric, period: LeaderboardPeriod) =>
  apiFetch<Leaderboard>(`/leaderboard?metric=${metric}&period=${period}`);

/** Who follows a traveler, or whom they follow */
export const fetchFollows = (userId: number, which: "followers" | "following") =>
  apiFetch<Traveler[]>(`/users/${userId}/${which}`);

export type Country = { code: string; name: string };
export const fetchCountries = () => apiFetch<Country[]>("/countries");

/** A traveler's followers / following list */
export function openFollows(userId: number, name: string, tab: "followers" | "following") {
  router.push({ pathname: "/follows/[id]", params: { id: String(userId), name, tab } });
}

/** A traveler's profile; my own opens the Profile tab instead */
export function openProfile(userId: number, myId?: number | null) {
  if (userId === myId) router.navigate("/index4");
  else router.push({ pathname: "/user/[id]", params: { id: String(userId) } });
}
