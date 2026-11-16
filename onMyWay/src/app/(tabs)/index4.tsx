import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/AuthContext";
import { ApiError } from "../../lib/api";
import { t } from "../../i18n";
import { compactNumber } from "../../lib/format";
import { BADGES, getBadge, useRewards, type BadgeProgress } from "../../lib/rewards";
import { postKind, type FeedPost } from "../../lib/feed";
import { fetchUserPosts, refreshMyProfile } from "../../lib/profileApi";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { AvatarFrame } from "../../components/AvatarFrame";
import { BadgeIcon } from "../../components/BadgeIcon";
import { BadgeSheet } from "../../components/BadgeSheet";
import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, font, radius } from "../../lib/theme";

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { frame, pinned, stats, counts, level, progress, unlocked } = useRewards();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  // Stats and my posts are fresh every time the tab is opened (e.g. right after posting)
  const load = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      refreshMyProfile(user.id).catch(() => {}),
      fetchUserPosts(user.id).then(setPosts, () => {}),
    ]);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pullToRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };
  const [busy, setBusy] = useState<"logout" | "delete" | null>(null);
  const [selected, setSelected] = useState<BadgeProgress | null>(null);

  const confirmSignOut = () => {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        onPress: async () => {
          setBusy("logout");
          await signOut(); // root layout switches to (auth)
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      t("profile.deleteAccount"),
      t("profile.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deleteConfirmButton"),
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteAccount(); // root layout switches to (auth)
            } catch (e) {
              setBusy(null);
              Alert.alert(
                t("profile.deleteFailed"),
                e instanceof ApiError ? e.message : t("common.tryAgainLater")
              );
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  const progressOf = (id: (typeof pinned)[number]) => progress.find((p) => p.badge.id === id)!;
  // Newest-looking unlocks first: rarest at the end of each series
  const recent = [...unlocked].reverse().slice(0, 10);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />
        }
      >
        <View style={styles.hero}>
          <Pressable
            onPress={() => router.push("/frames")}
            accessibilityRole="button"
            accessibilityLabel={t("profile.editFrame")}
          >
            <AvatarFrame name={user.name} frame={frame} avatarSize={96} />
            <View style={styles.editFrame}>
              <Ionicons name="color-palette" size={16} color={colors.white} />
            </View>
          </Pressable>

          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>

          <View style={styles.counts}>
            <Count value={counts.posts} label={t("profile.posts")} />
            <Count value={counts.followers} label={t("profile.followers")} />
            <Count value={counts.following} label={t("profile.following")} />
          </View>

          <View style={styles.levelPill}>
            <Text style={styles.levelText}>{t("rewards.level", { level: level.level })}</Text>
            <View style={styles.levelDot} />
            <Text style={styles.levelTitle}>{t(`rewards.levelTitles.${level.title}`)}</Text>
          </View>

          <View style={styles.xpWrap}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${(level.current / level.needed) * 100}%` }]} />
            </View>
            <Text style={styles.xpText}>
              {t("rewards.xp", { current: level.current, next: level.needed })}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={String(stats.countries)} label={t("rewards.stats.countries")} />
          <View style={styles.statDivider} />
          <Stat value={String(stats.places)} label={t("rewards.stats.places")} />
          <View style={styles.statDivider} />
          <Stat value={compactNumber(stats.km)} label={t("rewards.stats.km")} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("rewards.showcase")}</Text>
          </View>
          {pinned.length ? (
            <View style={styles.showcase}>
              {pinned.map((id) => {
                const badge = getBadge(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelected(progressOf(id))}
                    accessibilityRole="button"
                    style={styles.showcaseItem}
                  >
                    <BadgeIcon badge={badge} unlocked size={76} />
                    <Text style={styles.showcaseName} numberOfLines={2}>{t(`rewards.badges.${id}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.hint}>{t("rewards.showcaseHint")}</Text>
          )}
        </View>

        <Pressable
          onPress={() => router.push("/badges")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("rewards.badgesTitle")}</Text>
            <View style={styles.viewAll}>
              <Text style={styles.viewAllText}>{t("rewards.viewAll")}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.deepGreen} />
            </View>
          </View>
          <Text style={styles.hint}>
            {t("rewards.collected", { count: unlocked.length, total: BADGES.length })}
          </Text>
          <View style={styles.collectTrack}>
            <View style={[styles.collectFill, { width: `${(unlocked.length / BADGES.length) * 100}%` }]} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recent}>
            {recent.map((p) => (
              <BadgeIcon key={p.badge.id} badge={p.badge} unlocked size={46} />
            ))}
          </ScrollView>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("profile.myPosts")}</Text>
          {posts.length === 0 ? (
            <Pressable onPress={() => router.push("/create")} accessibilityRole="button" style={styles.emptyPosts}>
              <Ionicons name="map" size={28} color={colors.limeGreen} />
              <Text style={styles.hint}>{t("profile.noPosts")}</Text>
              <Text style={styles.emptyCta}>{t("profile.firstPost")}</Text>
            </Pressable>
          ) : (
            <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
              {gridWidth > 0
                ? posts.map((post) => (
                    <PostTile key={post.id} post={post} size={(gridWidth - GRID_GAP * 2) / 3} />
                  ))
                : null}
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t("profile.account")}</Text>
        <View style={styles.actions}>
          <PrimaryButton
            title={t("profile.signOut")}
            icon="log-out"
            variant="outline"
            onPress={confirmSignOut}
            loading={busy === "logout"}
            disabled={busy !== null}
          />
          <PrimaryButton
            title={t("profile.deleteAccount")}
            icon="trash"
            variant="danger"
            onPress={confirmDelete}
            loading={busy === "delete"}
            disabled={busy !== null}
          />
        </View>
      </ScrollView>

      <BadgeSheet progress={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{compactNumber(value)}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const KIND_ICON = { trip: "map", moment: "camera", question: "chatbubbles" } as const;

const GRID_GAP = 4;

function PostTile({ post, size }: { post: FeedPost; size: number }) {
  const kind = postKind(post);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } })}
      accessibilityRole="button"
      accessibilityLabel={post.title ?? post.caption}
      style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && styles.pressed]}
    >
      {post.imageUrl ? (
        <Image source={post.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.tileText}>
          <Text style={styles.tileQuestion} numberOfLines={4}>{post.caption}</Text>
        </View>
      )}
      <View style={styles.tileKind}>
        <Ionicons name={KIND_ICON[kind]} size={12} color={colors.white} />
      </View>
      {post.verified ? (
        <View style={styles.tileVerified}>
          <Ionicons name="shield-checkmark" size={12} color={colors.limeGreen} />
        </View>
      ) : null}
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
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  hero: { alignItems: "center", gap: 8, paddingTop: 8 },
  editFrame: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
    borderWidth: 3,
    borderColor: colors.softGray,
  },
  name: { color: colors.inkBlack, fontSize: 24, fontWeight: font.bold },
  counts: { flexDirection: "row", gap: 28, marginBottom: 4 },
  count: { alignItems: "center" },
  countValue: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  countLabel: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tile: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.limeTint,
  },
  tileText: { flex: 1, padding: 8, justifyContent: "center" },
  tileQuestion: { color: colors.deepGreen, fontSize: 12, fontWeight: font.bold },
  tileKind: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,43,40,0.55)",
  },
  tileVerified: {
    position: "absolute",
    left: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,43,40,0.7)",
  },
  emptyPosts: { alignItems: "center", gap: 6, paddingVertical: 16 },
  emptyCta: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },
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
  xpWrap: { alignSelf: "stretch", gap: 6, paddingHorizontal: 40, marginTop: 4 },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 4, backgroundColor: colors.limeGreen },
  xpText: { color: colors.textMuted, fontSize: 12, fontWeight: font.bold, textAlign: "center" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: colors.inkBlack, fontSize: 22, fontWeight: font.bold },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 10 },
  pressed: { opacity: 0.8 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },
  hint: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
  showcase: { flexDirection: "row", justifyContent: "space-around" },
  showcaseItem: { width: 96, alignItems: "center", gap: 6 },
  showcaseName: { color: colors.inkBlack, fontSize: 12, fontWeight: font.bold, textAlign: "center" },
  collectTrack: { height: 6, borderRadius: 3, backgroundColor: colors.softGray, overflow: "hidden" },
  collectFill: { height: "100%", borderRadius: 3, backgroundColor: colors.tealGreen },
  recent: { gap: 8, paddingTop: 4 },
  sectionLabel: { color: colors.textMuted, fontSize: 13, fontWeight: font.bold, marginTop: 8, marginLeft: 4 },
  actions: { gap: 12 },
});
