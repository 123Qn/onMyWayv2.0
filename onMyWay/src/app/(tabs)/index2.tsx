import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { t } from "../../i18n";
import { flagEmoji } from "../../lib/format";
import { getPostById, postKind, useFeedPosts, type FeedPost } from "../../lib/feed";
import { useSaveOverrides } from "../../lib/postStore";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { fetchPost, fetchSavedPosts, fetchTripHistory, type PastTrip } from "../../lib/tripsApi";
import { useTripRecorder } from "../../lib/tripRecorder";
import { colors, font, radius } from "../../lib/theme";

const stopsLabel = (n: number) => (n === 1 ? t("post.stopsCountOne") : t("post.stopsCount", { count: n }));

// Trips go to the in-app trip map; moments and questions open the post
const openPost = (post: FeedPost) =>
  postKind(post) === "trip"
    ? router.push({ pathname: "/trip/[id]", params: { id: String(post.id) } })
    : router.push({ pathname: "/post/[id]", params: { id: String(post.id) } });

export default function TripsScreen() {
  const recorder = useTripRecorder();
  const [saved, setSaved] = useState<FeedPost[] | null>(null);
  const [history, setHistory] = useState<PastTrip[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, h] = await Promise.allSettled([fetchSavedPosts(), fetchTripHistory()]);
    if (s.status === "fulfilled") setSaved(s.value);
    if (h.status === "fulfilled") setHistory(h.value);
    setFailed(s.status === "rejected" && h.status === "rejected");
  }, []);

  // Fresh every time the tab is opened (e.g. after saving a post or ending a trip)
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

  // Server list + posts saved since it was loaded, minus ones just unsaved
  const overrides = useSaveOverrides();
  const feed = useFeedPosts();
  const wantToGo = useMemo(() => {
    const server = (saved ?? []).filter((p) => overrides.get(p.id) !== false);
    const ids = new Set(server.map((p) => p.id));
    const local = feed.filter((p) => overrides.get(p.id) === true && !ids.has(p.id));
    return [...local, ...server];
  }, [saved, overrides, feed]);

  const totalKm = (history ?? []).reduce((sum, r) => sum + r.distanceKm, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.deepGreen} />}
      >
        <Text style={styles.title}>{t("trips.title")}</Text>

        {recorder.run?.postId ? <ActiveTrip postId={recorder.run.postId} /> : null}

        {history && history.length > 0 ? (
          <View style={styles.summary}>
            <SummaryStat value={String(history.length)} label={t("trips.tripsDone")} />
            <SummaryStat value={totalKm.toFixed(1)} label={t("trips.kmTraveled")} />
          </View>
        ) : null}

        {failed ? <Text style={styles.error}>{t("trips.loadFailed")}</Text> : null}

        <Text style={styles.sectionTitle}>{t("trips.wantToGo")}</Text>
        {saved === null && wantToGo.length === 0 ? null : wantToGo.length === 0 ? (
          <Empty icon="bookmark-outline" text={t("trips.wantToGoEmpty")} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRow}>
            {wantToGo.map((post) => (
              <SavedCard key={post.id} post={post} />
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>{t("trips.history")}</Text>
        {history === null ? null : history.length === 0 ? (
          <Empty icon="map-outline" text={t("trips.historyEmpty")} />
        ) : (
          <View style={styles.historyList}>
            {history.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveTrip({ postId }: { postId: number }) {
  const recorder = useTripRecorder();
  const [post, setPost] = useState(() => getPostById(postId));

  // After an app restart the running trip's post may not be loaded yet
  useEffect(() => {
    if (!getPostById(postId)) fetchPost(postId).then(setPost, () => {});
    else setPost(getPostById(postId));
  }, [postId]);

  const run = recorder.run;
  if (!run) return null;
  const total = post?.stops.length ?? 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/trip/[id]", params: { id: String(postId) } })}
      accessibilityRole="button"
      accessibilityLabel={`${t("trip.inProgress")}: ${post?.title ?? post?.place.name ?? ""}`}
      style={({ pressed }) => [styles.active, pressed && styles.pressed]}
    >
      <View style={styles.activeTop}>
        <View style={styles.recDot} />
        <Text style={styles.activeLabel}>{t("trip.inProgress")}</Text>
      </View>
      <Text style={styles.activeTitle} numberOfLines={1}>
        {post?.title ?? post?.place.name ?? "…"}
      </Text>
      <View style={styles.activeBottom}>
        <Text style={styles.activeStats}>
          {run.distanceKm.toFixed(1)} km{total ? ` · ${run.visitedStops.length}/${total} ${t("trip.stops").toLowerCase()}` : ""}
        </Text>
        <View style={styles.activeCta}>
          <Text style={styles.activeCtaText}>{t("trip.continue")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.deepGreen} />
        </View>
      </View>
    </Pressable>
  );
}

function SavedCard({ post }: { post: FeedPost }) {
  const trip = postKind(post) === "trip";
  return (
    <Pressable
      onPress={() => openPost(post)}
      accessibilityRole="button"
      accessibilityLabel={post.title ?? post.place.name}
      style={({ pressed }) => [styles.savedCard, pressed && styles.pressed]}
    >
      <Image source={post.imageUrl} style={styles.savedImage} contentFit="cover" transition={200} />
      <View style={styles.savedBody}>
        <Text style={styles.savedTitle} numberOfLines={1}>
          {post.title ?? post.place.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {post.place.countryCode ? `${flagEmoji(post.place.countryCode)} ` : ""}
          {trip ? stopsLabel(post.stops.length) : post.place.country}
        </Text>
      </View>
    </Pressable>
  );
}

function HistoryRow({ run }: { run: PastTrip }) {
  const post = run.post;
  const total = post?.stops.length ?? 0;
  const date = new Date(run.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <Pressable
      onPress={post ? () => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } }) : undefined}
      disabled={!post}
      accessibilityRole="button"
      style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
    >
      {post ? (
        <Image source={post.imageUrl} style={styles.historyImage} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.historyImage, styles.historyPlaceholder]}>
          <Ionicons name="map" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {post ? (post.title ?? post.place.name) : t("trips.deletedPost")}
        </Text>
        <Text style={styles.muted}>{date}</Text>
      </View>
      <View style={styles.historyStats}>
        <Text style={styles.historyKm}>{run.distanceKm.toFixed(1)} km</Text>
        {total ? (
          <Text style={[styles.muted, run.visitedStops.length === total && styles.complete]}>
            {run.visitedStops.length}/{total} {t("trip.stops").toLowerCase()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  title: { color: colors.inkBlack, fontSize: 28, fontWeight: font.bold, paddingTop: 8 },
  sectionTitle: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold, marginTop: 8 },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.error, fontSize: 13 },

  active: { gap: 6, padding: 16, borderRadius: radius.md, backgroundColor: colors.limeTint },
  activeTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  activeLabel: { color: colors.error, fontSize: 12, fontWeight: font.bold },
  activeTitle: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold },
  activeBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activeStats: { color: colors.textMuted, fontSize: 14 },
  activeCta: { flexDirection: "row", alignItems: "center", gap: 2 },
  activeCtaText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },

  summary: { flexDirection: "row", borderRadius: radius.md, backgroundColor: colors.softGray, paddingVertical: 14 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: colors.inkBlack, fontSize: 22, fontWeight: font.bold },

  savedRow: { gap: 12 },
  savedCard: { width: 160, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.softGray },
  savedImage: { width: 160, height: 110, backgroundColor: colors.border },
  savedBody: { padding: 10, gap: 2 },
  savedTitle: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },

  historyList: { gap: 10 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.border },
  historyPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.softGray },
  historyTitle: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  historyStats: { alignItems: "flex-end", gap: 2 },
  historyKm: { color: colors.deepGreen, fontSize: 15, fontWeight: font.bold },
  complete: { color: colors.deepGreen, fontWeight: font.bold },

  empty: { alignItems: "center", gap: 8, paddingVertical: 24, borderRadius: radius.md, backgroundColor: colors.softGray },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
});
