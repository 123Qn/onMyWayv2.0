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
// Stats → badges → XP → level. Stats come from the API (verified posts only).
// ---------------------------------------------------------------------------
export type TravelStats = Record<Metric, number> & { specials: SpecialBadgeId[] };

export const EMPTY_STATS: TravelStats = {
  countries: 0,
  places: 0,
  km: 0,
  beach: 0,
  island: 0,
  mountain: 0,
  city: 0,
  food: 0,
  nature: 0,
  culture: 0,
  trips: 0,
  moments: 0,
  followers: 0,
  tookTrip: 0,
  likes: 0,
  helpful: 0,
  months: 0,
  specials: [],
};

const XP_BY_RARITY: Record<Rarity, number> = { common: 20, rare: 50, epic: 120, legendary: 300 };

// Given to everyone who joined during the beta: a keepsake, not a travel achievement, so no XP.
// Otherwise every new account would start at Lv. 3.
const NO_XP = new Set<BadgeId>(["founder"]);
export const badgeXp = (badge: BadgeDef) => (NO_XP.has(badge.id) ? 0 : XP_BY_RARITY[badge.rarity]);

export type BadgeProgress = { badge: BadgeDef; unlocked: boolean; current: number; goal: number };

export function badgeProgress(badge: BadgeDef, stats: TravelStats): BadgeProgress {
  if (badge.metric && badge.goal) {
    const current = stats[badge.metric] ?? 0;
    return { badge, unlocked: current >= badge.goal, current: Math.min(current, badge.goal), goal: badge.goal };
  }
  const unlocked = stats.specials.includes(badge.id as SpecialBadgeId);
  return { badge, unlocked, current: unlocked ? 1 : 0, goal: 1 };
}

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

export type Rewards = {
  progress: BadgeProgress[];
  unlocked: BadgeProgress[];
  level: ReturnType<typeof levelInfo>;
  isFrameUnlocked: (frame: FrameDef) => boolean;
};

export function computeRewards(stats: TravelStats): Rewards {
  const progress = BADGES.map((b) => badgeProgress(b, stats));
  const unlocked = progress.filter((p) => p.unlocked);
  const ids = new Set(unlocked.map((p) => p.badge.id));
  const level = levelInfo(unlocked.reduce((sum, p) => sum + badgeXp(p.badge), 0));
  return {
    progress,
    unlocked,
    level,
    isFrameUnlocked: (frame) => ("level" in frame.unlock ? level.level >= frame.unlock.level : ids.has(frame.unlock.badge)),
  };
}

export const getBadge = (id: BadgeId) => BADGES.find((b) => b.id === id)!;

/** My own posts always show the frame I have equipped now */
export function useAuthorFrame(author: { name: string; frame?: string }, mine: boolean): FrameId {
  const { frame } = useRewards();
  return mine ? frame : ((author.frame as FrameId | undefined) ?? "classic");
}

// ---------------------------------------------------------------------------
// My profile: stats, equipped frame and pinned badges, loaded from and saved to the API
// ---------------------------------------------------------------------------
type RewardsState = {
  userId: number | null;
  stats: TravelStats;
  frame: FrameId;
  pinned: BadgeId[];
  counts: { posts: number; followers: number; following: number };
  loaded: boolean;
};

const INITIAL: RewardsState = {
  userId: null,
  stats: EMPTY_STATS,
  frame: "classic",
  pinned: [],
  counts: { posts: 0, followers: 0, following: 0 },
  loaded: false,
};

let state: RewardsState = INITIAL;
let rewards = computeRewards(INITIAL.stats);
const listeners = new Set<() => void>();

function setState(next: RewardsState) {
  if (next.stats !== state.stats) rewards = computeRewards(next.stats);
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type ProfileResponse = {
  user: { id: number; name: string; frame: FrameId; pinnedBadges: string[]; joinedAt: string };
  counts: RewardsState["counts"];
  followedByViewer: boolean;
  stats: TravelStats;
};

/** Fill the store from GET /users/:id/profile for the signed-in user */
export function applyMyProfile(profile: ProfileResponse) {
  const known = new Set<string>(BADGES.map((b) => b.id));
  const previous = state;
  const before = rewards;
  setState({
    userId: profile.user.id,
    stats: { ...EMPTY_STATS, ...profile.stats },
    frame: profile.user.frame,
    pinned: profile.user.pinnedBadges.filter((id): id is BadgeId => known.has(id)),
    counts: profile.counts,
    loaded: true,
  });
  // Celebrate what this refresh unlocked (not the first load after sign-in)
  if (previous.loaded && previous.userId === profile.user.id) celebrateChanges(before, rewards);
}

// ---------------------------------------------------------------------------
// Celebration: new badges, level-ups and frames unlocked since the last refresh
// ---------------------------------------------------------------------------
export type Celebration = {
  badges: BadgeDef[];
  levelUp?: { level: number; title: LevelTitle };
  frames: FrameDef[];
};

let celebration: Celebration | null = null;

function celebrateChanges(before: Rewards, after: Rewards) {
  const had = new Set(before.unlocked.map((p) => p.badge.id));
  const badges = after.unlocked.map((p) => p.badge).filter((b) => !had.has(b.id));
  const frames = FRAMES.filter((f) => f.id !== "none" && after.isFrameUnlocked(f) && !before.isFrameUnlocked(f));
  const levelUp =
    after.level.level > before.level.level ? { level: after.level.level, title: after.level.title } : undefined;
  if (badges.length === 0 && frames.length === 0 && !levelUp) return;
  celebration = { badges, frames, levelUp };
  listeners.forEach((l) => l());
}

export const useCelebration = () => useSyncExternalStore(subscribe, () => celebration);

export function dismissCelebration() {
  celebration = null;
  listeners.forEach((l) => l());
}

/** Forget everything on sign-out */
export function resetMyProfile() {
  celebration = null;
  setState(INITIAL);
}

// Saving is wired by profileApi so this module stays free of network code
let persist: (patch: { frame?: FrameId; pinnedBadges?: BadgeId[] }) => Promise<unknown> = async () => {};
export function setRewardsPersister(fn: typeof persist) {
  persist = fn;
}

function saveAndRollback(next: RewardsState, patch: { frame?: FrameId; pinnedBadges?: BadgeId[] }) {
  const previous = state;
  setState(next);
  persist(patch).catch(() => {
    // Keep stats that may have refreshed meanwhile, undo only this change
    setState({ ...state, frame: previous.frame, pinned: previous.pinned });
  });
}

export const MAX_PINS = 3;

export function useRewards() {
  const current = useSyncExternalStore(subscribe, () => state);
  const computed = useSyncExternalStore(subscribe, () => rewards);
  return {
    ...current,
    ...computed,
    equipFrame: (frame: FrameId) => saveAndRollback({ ...state, frame }, { frame }),
    /** Returns false when the showcase is already full */
    togglePin: (id: BadgeId) => {
      const pinned = state.pinned.includes(id)
        ? state.pinned.filter((p) => p !== id)
        : state.pinned.length >= MAX_PINS
          ? null
          : [...state.pinned, id];
      if (!pinned) return false;
      saveAndRollback({ ...state, pinned }, { pinnedBadges: pinned });
      return true;
    },
  };
}
