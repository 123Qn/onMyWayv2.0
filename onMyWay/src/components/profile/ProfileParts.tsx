// The pieces both profile screens are built from: mine (Profile tab) and another traveler's.
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../../i18n";
import { openFollows } from "../../lib/communityApi";
import type { FeedPost } from "../../lib/feed";
import { compactNumber, flagEmoji } from "../../lib/format";
import { BADGES, getBadge, levelInfo, type BadgeId, type BadgeProgress, type TravelStats } from "../../lib/rewards";
import { colors } from "../../lib/theme";
import { BadgeIcon } from "../BadgeIcon";
import { GRID_GAP, PostTile } from "../PostTile";
import { Card, CountStat, StatRow } from "../ui";

type Counts = { posts: number; followers: number; following: number };

/** Avatar, name, country, bio, follower counts. children: between the bio and the counts; footer: under the counts */
export function ProfileHero({
  avatar,
  user,
  counts,
  children,
  footer,
}: {
  avatar: ReactNode;
  user: { id: number; name: string; country: string | null; countryCode: string | null; bio: string | null };
  counts: Counts;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View className="items-center gap-2 pt-2">
      {avatar}
      <Text className="text-2xl font-bold text-ink" numberOfLines={1}>{user.name}</Text>
      {user.country ? (
        <Text className="text-sm text-muted">
          {user.countryCode ? `${flagEmoji(user.countryCode)} ` : ""}
          {user.country}
        </Text>
      ) : null}
      {user.bio ? <Text className="px-6 text-center text-sm leading-5 text-ink">{user.bio}</Text> : null}
      {children}
      <View className="my-1 flex-row gap-7">
        <CountStat value={counts.posts} label={t("profile.posts")} />
        <CountStat value={counts.followers} label={t("profile.followers")} onPress={() => openFollows(user.id, user.name, "followers")} />
        <CountStat value={counts.following} label={t("profile.following")} onPress={() => openFollows(user.id, user.name, "following")} />
      </View>
      {footer}
    </View>
  );
}

/** "Lv. 4 · Pathfinder" on a dark pill */
export function LevelPill({ level }: { level: ReturnType<typeof levelInfo> }) {
  return (
    <View className="flex-row items-center gap-2 rounded-2xl bg-ink px-3.5 py-1.5">
      <Text className="text-[13px] font-bold text-lime-green">{t("rewards.level", { level: level.level })}</Text>
      <View className="h-1 w-1 rounded-full bg-muted" />
      <Text className="text-[13px] font-bold text-white">{t(`rewards.levelTitles.${level.title}`)}</Text>
    </View>
  );
}

/** Countries · places · km */
export function TravelStatRow({ stats }: { stats: TravelStats }) {
  return (
    <StatRow
      items={[
        { value: String(stats.countries), label: t("rewards.stats.countries") },
        { value: String(stats.places), label: t("rewards.stats.places") },
        { value: compactNumber(stats.km), label: t("rewards.stats.km") },
      ]}
    />
  );
}

/** Up to 3 pinned badges; emptyHint shows when none are pinned (otherwise the card is hidden) */
export function ShowcaseCard({
  pinned,
  progress,
  onSelect,
  emptyHint,
}: {
  pinned: BadgeId[];
  progress: BadgeProgress[];
  onSelect: (p: BadgeProgress) => void;
  emptyHint?: string;
}) {
  if (!pinned.length && !emptyHint) return null;
  return (
    <Card>
      <Text className="text-[17px] font-bold text-ink">{t("rewards.showcase")}</Text>
      {pinned.length ? (
        <View className="flex-row justify-around">
          {pinned.map((id) => (
            <Pressable
              key={id}
              onPress={() => onSelect(progress.find((p) => p.badge.id === id)!)}
              accessibilityRole="button"
              className="w-24 items-center gap-1.5"
            >
              <BadgeIcon badge={getBadge(id)} unlocked size={76} />
              <Text className="text-center text-xs font-bold text-ink" numberOfLines={2}>{t(`rewards.badges.${id}`)}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text className="text-sm text-muted">{emptyHint}</Text>
      )}
    </Card>
  );
}

/**
 * "12 of 100 collected" with a progress bar and the latest unlocks.
 * onViewAll: the whole card opens the badge list; otherwise each badge opens its details.
 */
export function BadgesCard({
  unlocked,
  onViewAll,
  onSelect,
}: {
  unlocked: BadgeProgress[];
  onViewAll?: () => void;
  onSelect?: (p: BadgeProgress) => void;
}) {
  // Newest-looking unlocks first: rarest at the end of each series
  const recent = [...unlocked].reverse().slice(0, 10);
  const body = (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-[17px] font-bold text-ink">{t("rewards.badgesTitle")}</Text>
        {onViewAll ? (
          <View className="flex-row items-center gap-0.5">
            <Text className="text-sm font-bold text-deep-green">{t("rewards.viewAll")}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.deepGreen} />
          </View>
        ) : null}
      </View>
      <Text className="text-sm text-muted">{t("rewards.collected", { count: unlocked.length, total: BADGES.length })}</Text>
      <View className="h-1.5 overflow-hidden rounded-full bg-soft-gray">
        <View className="h-full rounded-full bg-teal-green" style={{ width: `${(unlocked.length / BADGES.length) * 100}%` }} />
      </View>
      {recent.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pt-1">
          {recent.map((p) =>
            onSelect && !onViewAll ? (
              <Pressable key={p.badge.id} onPress={() => onSelect(p)} accessibilityRole="button" accessibilityLabel={t(`rewards.badges.${p.badge.id}`)}>
                <BadgeIcon badge={p.badge} unlocked size={46} />
              </Pressable>
            ) : (
              <BadgeIcon key={p.badge.id} badge={p.badge} unlocked size={46} />
            )
          )}
        </ScrollView>
      ) : null}
    </>
  );
  return onViewAll ? (
    <Pressable onPress={onViewAll} accessibilityRole="button" className="gap-2.5 rounded-lg bg-white p-4.5 active:opacity-80">
      {body}
    </Pressable>
  ) : (
    <Card>{body}</Card>
  );
}

/** A titled 3-column grid of post thumbnails, or `empty` when there are none */
export function PostsGridCard({ title, posts, empty }: { title: string; posts: FeedPost[]; empty: ReactNode }) {
  const [width, setWidth] = useState(0);
  return (
    <Card>
      <Text className="text-[17px] font-bold text-ink">{title}</Text>
      {posts.length === 0 ? (
        empty
      ) : (
        <View className="flex-row flex-wrap gap-1" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? posts.map((post) => <PostTile key={post.id} post={post} size={(width - GRID_GAP * 2) / 3} />) : null}
        </View>
      )}
    </Card>
  );
}
