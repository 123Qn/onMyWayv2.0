import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { compactNumber, flagEmoji } from "../../lib/format";
import type { FeedPost } from "../../lib/feed";
import { fetchProfile, fetchUserPosts } from "../../lib/profileApi";
import { openFollows } from "../../lib/communityApi";
import { BADGES, computeRewards, getBadge, type BadgeId, type BadgeProgress, type FrameId, type ProfileResponse } from "../../lib/rewards";
import { colors, font, radius } from "../../lib/theme";
import { AvatarFrame } from "../../components/AvatarFrame";
import { BadgeIcon } from "../../components/BadgeIcon";
import { BadgeSheet } from "../../components/BadgeSheet";
import { FollowButton } from "../../components/FollowButton";
import { PostTile, GRID_GAP } from "../../components/PostTile";

// Another traveler's profile: who they are, their travel stats, badges and posts
export default function TravelerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  const [selected, setSelected] = useState<BadgeProgress | null>(null);

  const load = useCallback(async () => {
    const [p, list] = await Promise.allSettled([fetchProfile(userId), fetchUserPosts(userId)]);
    if (p.status === "fulfilled") setProfile(p.value);
    if (list.status === "fulfilled") setPosts(list.value);
    setFailed(p.status === "rejected");
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reload = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const rewards = useMemo(() => (profile ? computeRewards(profile.stats) : null), [profile]);

  if (!profile || !rewards) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <BackButton />
        {failed ? <Text style={styles.hint}>{t("traveler.notFound")}</Text> : <ActivityIndicator color={colors.deepGreen} />}
      </SafeAreaView>
    );
  }

  const { user, counts, stats } = profile;
  const pinned = user.pinnedBadges.filter((b): b is BadgeId => BADGES.some((x) => x.id === b));
  const progressOf = (badgeId: BadgeId) => rewards.progress.find((p) => p.badge.id === badgeId)!;
  const recent = [...rewards.unlocked].reverse().slice(0, 10);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
      >
        <BackButton />

        <View style={styles.hero}>
          <AvatarFrame name={user.name} frame={user.frame as FrameId} avatarSize={96} uri={user.avatarUrl} />
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          {user.country ? (
            <Text style={styles.country}>
              {user.countryCode ? `${flagEmoji(user.countryCode)} ` : ""}
              {user.country}
            </Text>
          ) : null}
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          <View style={styles.counts}>
            <Count value={counts.posts} label={t("profile.posts")} />
            <Count value={counts.followers} label={t("profile.followers")} onPress={() => openFollows(user.id, user.name, "followers")} />
            <Count value={counts.following} label={t("profile.following")} onPress={() => openFollows(user.id, user.name, "following")} />
          </View>

          <View style={styles.levelPill}>
            <Text style={styles.levelText}>{t("rewards.level", { level: rewards.level.level })}</Text>
            <View style={styles.levelDot} />
            <Text style={styles.levelTitle}>{t(`rewards.levelTitles.${rewards.level.title}`)}</Text>
          </View>

          <FollowButton user={{ id: user.id, name: user.name }} initial={profile.followedByViewer} onChange={load} />
        </View>

        <View style={styles.stats}>
          <Stat value={String(stats.countries)} label={t("rewards.stats.countries")} />
          <View style={styles.statDivider} />
          <Stat value={String(stats.places)} label={t("rewards.stats.places")} />
          <View style={styles.statDivider} />
          <Stat value={compactNumber(stats.km)} label={t("rewards.stats.km")} />
        </View>

        {pinned.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("rewards.showcase")}</Text>
            <View style={styles.showcase}>
              {pinned.map((badgeId) => (
                <Pressable key={badgeId} onPress={() => setSelected(progressOf(badgeId))} accessibilityRole="button" style={styles.showcaseItem}>
                  <BadgeIcon badge={getBadge(badgeId)} unlocked size={76} />
                  <Text style={styles.showcaseName} numberOfLines={2}>{t(`rewards.badges.${badgeId}`)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("rewards.badgesTitle")}</Text>
          <Text style={styles.hint}>{t("rewards.collected", { count: rewards.unlocked.length, total: BADGES.length })}</Text>
          <View style={styles.collectTrack}>
            <View style={[styles.collectFill, { width: `${(rewards.unlocked.length / BADGES.length) * 100}%` }]} />
          </View>
          {recent.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recent}>
              {recent.map((p) => (
                <Pressable key={p.badge.id} onPress={() => setSelected(p)} accessibilityRole="button" accessibilityLabel={t(`rewards.badges.${p.badge.id}`)}>
                  <BadgeIcon badge={p.badge} unlocked size={46} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("traveler.posts", { name: user.name.split(" ")[0] })}</Text>
          {posts.length === 0 ? (
            <Text style={styles.hint}>{t("traveler.noPosts")}</Text>
          ) : (
            <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
              {gridWidth > 0 ? posts.map((post) => <PostTile key={post.id} post={post} size={(gridWidth - GRID_GAP * 2) / 3} />) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <BadgeSheet progress={selected} onClose={() => setSelected(null)} readOnly />
    </SafeAreaView>
  );
}

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("post.back")} hitSlop={8} style={styles.back}>
      <Ionicons name="chevron-back" size={22} color={colors.inkBlack} />
    </Pressable>
  );
}

function Count({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} hitSlop={6} style={styles.count}>
      <Text style={styles.countValue}>{compactNumber(value)}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  pressed: { opacity: 0.8 },
  back: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  hero: { alignItems: "center", gap: 8 },
  name: { color: colors.inkBlack, fontSize: 24, fontWeight: font.bold },
  country: { color: colors.textMuted, fontSize: 14 },
  bio: { color: colors.inkBlack, fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 24 },
  counts: { flexDirection: "row", gap: 28, marginVertical: 4 },
  count: { alignItems: "center" },
  countValue: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  countLabel: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.inkBlack,
  },
  levelText: { color: colors.limeGreen, fontSize: 13, fontWeight: font.bold },
  levelDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted },
  levelTitle: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: colors.inkBlack, fontSize: 22, fontWeight: font.bold },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 10 },
  cardTitle: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  hint: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
  showcase: { flexDirection: "row", justifyContent: "space-around" },
  showcaseItem: { width: 96, alignItems: "center", gap: 6 },
  showcaseName: { color: colors.inkBlack, fontSize: 12, fontWeight: font.bold, textAlign: "center" },
  collectTrack: { height: 6, borderRadius: 3, backgroundColor: colors.softGray, overflow: "hidden" },
  collectFill: { height: "100%", borderRadius: 3, backgroundColor: colors.tealGreen },
  recent: { gap: 8, paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
});
