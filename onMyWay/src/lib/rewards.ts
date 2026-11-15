import { useSyncExternalStore } from "react";
import { BADGES, type BadgeDef, type BadgeId, type Metric, type Rarity, type SpecialBadgeId } from "./badges";
import { colors } from "./theme";

export { BADGES, type BadgeDef, type BadgeId, type Rarity };

// ---------------------------------------------------------------------------
// Avatar frames. Each unlocks at a level or with a badge.
// ---------------------------------------------------------------------------
export type FrameId =
  | "none"
  | "classic"
  | "road"
  | "wave"
  | "summit"
  | "compass"
  | "stamp"
  | "sunrise"
  | "jet"
  | "tropical"
  | "aurora"
  | "laurel";

export type FrameDef = {
  id: FrameId;
  rarity: Rarity;
  unlock: { level: number } | { badge: BadgeId };
};

export const FRAMES: FrameDef[] = [
  { id: "none", rarity: "common", unlock: { level: 1 } },
  { id: "classic", rarity: "common", unlock: { level: 1 } },
  { id: "road", rarity: "common", unlock: { level: 2 } },
  { id: "wave", rarity: "rare", unlock: { badge: "beach_5" } },
  { id: "summit", rarity: "rare", unlock: { badge: "mountain_5" } },
  { id: "compass", rarity: "rare", unlock: { badge: "countries_5" } },
  { id: "stamp", rarity: "epic", unlock: { badge: "places_25" } },
  { id: "sunrise", rarity: "epic", unlock: { badge: "early_bird" } },
  { id: "jet", rarity: "epic", unlock: { badge: "km_10000" } },
  { id: "tropical", rarity: "epic", unlock: { badge: "island_15" } },
  { id: "aurora", rarity: "legendary", unlock: { level: 20 } },
  { id: "laurel", rarity: "legendary", unlock: { badge: "countries_50" } },
];

export const rarityColor: Record<Rarity, { main: string; light: string; dark: string }> = {
  common: { main: colors.tealGreen, light: "#9FDCCF", dark: colors.deepGreen },
  rare: { main: colors.skyBlue, light: "#B5E2F7", dark: "#2A87B8" },
  epic: { main: colors.limeGreen, light: "#D3EBB5", dark: "#5E8E2A" },
  legendary: { main: colors.gold, light: "#F6DDA0", dark: "#B07A12" },
};

// ---------------------------------------------------------------------------
// Stats → badges → XP → level. Mock numbers until the backend counts verified posts.
// ---------------------------------------------------------------------------
export type TravelStats = Record<Metric, number> & { specials: SpecialBadgeId[] };

export const MY_STATS: TravelStats = {
  countries: 6,
  places: 34,
  km: 7420,
  beach: 9,
  island: 4,
  mountain: 6,
  city: 12,
  food: 18,
  nature: 7,
  culture: 5,
  trips: 7,
  moments: 23,
  followers: 168,
  tookTrip: 14,
  likes: 2340,
  helpful: 11,
  months: 8,
  specials: ["early_bird", "solo", "weekend", "hop_3", "founder"],
};

const XP_BY_RARITY: Record<Rarity, number> = { common: 20, rare: 50, epic: 120, legendary: 300 };

export type BadgeProgress = { badge: BadgeDef; unlocked: boolean; current: number; goal: number };

export function badgeProgress(badge: BadgeDef, stats: TravelStats = MY_STATS): BadgeProgress {
  if (badge.metric && badge.goal) {
    const current = stats[badge.metric];
    return { badge, unlocked: current >= badge.goal, current: Math.min(current, badge.goal), goal: badge.goal };
  }
  const unlocked = stats.specials.includes(badge.id as SpecialBadgeId);
  return { badge, unlocked, current: unlocked ? 1 : 0, goal: 1 };
}

export const ALL_PROGRESS = BADGES.map((b) => badgeProgress(b));
export const UNLOCKED = ALL_PROGRESS.filter((p) => p.unlocked);
const unlockedIds = new Set(UNLOCKED.map((p) => p.badge.id));

/** Total XP needed to reach `level` (level 1 = 0 XP, each level costs 100 more than the last) */
const xpForLevel = (level: number) => 50 * level * (level - 1);

export type LevelTitle = "wanderer" | "explorer" | "pathfinder" | "trailblazer" | "voyager" | "globetrotter";

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const title: LevelTitle =
    level >= 20 ? "globetrotter" : level >= 15 ? "voyager" : level >= 10 ? "trailblazer"
      : level >= 6 ? "pathfinder" : level >= 3 ? "explorer" : "wanderer";
  return { level, title, current: xp - floor, needed: next - floor };
}

export const MY_XP = UNLOCKED.reduce((sum, p) => sum + XP_BY_RARITY[p.badge.rarity], 0);
export const MY_LEVEL = levelInfo(MY_XP);

export function isFrameUnlocked(frame: FrameDef) {
  return "level" in frame.unlock ? MY_LEVEL.level >= frame.unlock.level : unlockedIds.has(frame.unlock.badge);
}

export const getBadge = (id: BadgeId) => BADGES.find((b) => b.id === id)!;

// Frames worn by the sample authors in the feed
const AUTHOR_FRAMES: Record<string, FrameId> = {
  "Linh Tran": "wave",
  "Mai Hoang": "sunrise",
  "Minh Nguyen": "summit",
  "Lucas Silva": "jet",
  "James Walker": "compass",
  "Sofia Rossi": "laurel",
  "Chloe Martin": "tropical",
  "Noah Kim": "aurora",
  "An Pham": "road",
  "Made Wirawan": "stamp",
};
export const authorFrame = (name: string): FrameId => AUTHOR_FRAMES[name] ?? "none";

// ---------------------------------------------------------------------------
// My equipped frame and pinned badges (in memory until there is a profile API)
// ---------------------------------------------------------------------------
type RewardsState = { frame: FrameId; pinned: BadgeId[] };

const firstPins = [...UNLOCKED]
  .sort((a, b) => XP_BY_RARITY[b.badge.rarity] - XP_BY_RARITY[a.badge.rarity])
  .slice(0, 3)
  .map((p) => p.badge.id);

let state: RewardsState = { frame: "road", pinned: firstPins };
const listeners = new Set<() => void>();

function setState(next: RewardsState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const MAX_PINS = 3;

export function useRewards() {
  const current = useSyncExternalStore(subscribe, () => state);
  return {
    ...current,
    equipFrame: (frame: FrameId) => setState({ ...state, frame }),
    /** Returns false when the showcase is already full */
    togglePin: (id: BadgeId) => {
      if (state.pinned.includes(id)) {
        setState({ ...state, pinned: state.pinned.filter((p) => p !== id) });
        return true;
      }
      if (state.pinned.length >= MAX_PINS) return false;
      setState({ ...state, pinned: [...state.pinned, id] });
      return true;
    },
  };
}
