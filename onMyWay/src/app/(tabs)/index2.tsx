import { useEffect, useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../../i18n";
import { cn } from "../../lib/cn";
import { flagEmoji, stopsLabel } from "../../lib/format";
import { postKind, rememberPosts, useFeedPosts, type FeedPost } from "../../lib/feed";
import { sizedImage } from "../../lib/image";
import { useQuery } from "../../lib/cache";
import { useSaveOverrides } from "../../lib/postStore";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { fetchSavedPosts, fetchTripHistory, type PastTrip } from "../../lib/tripsApi";
import { useTripRecorder } from "../../lib/tripRecorder";
import { usePost } from "../../lib/usePost";
import { colors } from "../../lib/theme";
import { EmptyState, Img, Screen, SectionTitle, Stat } from "../../components/ui";

// Trips go to the in-app trip map; moments and questions open the post
const openPost = (post: FeedPost) =>
  postKind(post) === "trip"
    ? router.push({ pathname: "/trip/[id]", params: { id: String(post.id) } })
    : router.push({ pathname: "/post/[id]", params: { id: String(post.id) } });

export default function TripsScreen() {
  const recorder = useTripRecorder();
  // Last known lists show at once (also right after app start); refreshed every time the tab
  // is opened (e.g. after saving a post or ending a trip)
  const savedQuery = useQuery("posts:saved", fetchSavedPosts, { persist: true });
  const historyQuery = useQuery("trip-runs", fetchTripHistory, { persist: true });
  const saved = savedQuery.data ?? null;
  const history = historyQuery.data ?? null;
  const failed = savedQuery.failed && historyQuery.failed;
  const refreshing = savedQuery.refreshing || historyQuery.refreshing;
  const onRefresh = () => {
    savedQuery.refresh();
    historyQuery.refresh();
  };
  // Lists read from the disk cache: make their posts openable without another request
  useEffect(() => {
    rememberPosts([...(saved ?? []), ...(history ?? []).flatMap((r) => (r.post ? [r.post] : []))]);
  }, [saved, history]);

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
    <Screen className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        contentContainerClassName="gap-3.5 px-4 pb-8"
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.deepGreen} />}
      >
        <Text className="pt-2 text-[28px] font-bold text-ink">{t("trips.title")}</Text>

        {recorder.run?.postId ? <ActiveTrip postId={recorder.run.postId} /> : null}

        {history && history.length > 0 ? (
          <View className="flex-row rounded-md bg-soft-gray py-3.5">
            <Stat value={String(history.length)} label={t("trips.tripsDone")} />
            <Stat value={totalKm.toFixed(1)} label={t("trips.kmTraveled")} />
          </View>
        ) : null}

        {failed ? <Text className="text-[13px] text-error">{t("trips.loadFailed")}</Text> : null}

        <SectionTitle className="mt-2">{t("trips.wantToGo")}</SectionTitle>
        {saved === null && wantToGo.length === 0 ? null : wantToGo.length === 0 ? (
          <EmptyState icon="bookmark-outline" text={t("trips.wantToGoEmpty")} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {wantToGo.map((post) => (
              <SavedCard key={post.id} post={post} />
            ))}
          </ScrollView>
        )}

        <SectionTitle className="mt-2">{t("trips.history")}</SectionTitle>
        {history === null ? null : history.length === 0 ? (
          <EmptyState icon="map-outline" text={t("trips.historyEmpty")} />
        ) : (
          <View className="gap-2.5">
            {history.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ActiveTrip({ postId }: { postId: number }) {
  const recorder = useTripRecorder();
  // After an app restart the running trip's post may not be loaded yet
  const { post } = usePost(postId);
  const run = recorder.run;
  if (!run) return null;
  const total = post?.stops.length ?? 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/trip/[id]", params: { id: String(postId) } })}
      accessibilityRole="button"
      accessibilityLabel={`${t("trip.inProgress")}: ${post?.title ?? post?.place.name ?? ""}`}
      className="gap-1.5 rounded-md bg-lime-tint p-4 active:opacity-80"
    >
      <View className="flex-row items-center gap-1.5">
        <View className="h-2 w-2 rounded-full bg-error" />
        <Text className="text-xs font-bold text-error">{t("trip.inProgress")}</Text>
      </View>
      <Text className="text-lg font-bold text-ink" numberOfLines={1}>
        {post?.title ?? post?.place.name ?? "…"}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted">
          {run.distanceKm.toFixed(1)} km{total ? ` · ${run.visitedStops.length}/${total} ${t("trip.stops").toLowerCase()}` : ""}
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-sm font-bold text-deep-green">{t("trip.continue")}</Text>
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
      className="w-40 overflow-hidden rounded-md bg-soft-gray active:opacity-80"
    >
      <Img source={sizedImage(post.imageUrl, 160)} className="h-[110px] w-40 bg-line" contentFit="cover" transition={200} />
      <View className="gap-0.5 p-2.5">
        <Text className="text-sm font-bold text-ink" numberOfLines={1}>
          {post.title ?? post.place.name}
        </Text>
        <Text className="text-[13px] text-muted" numberOfLines={1}>
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
      className="flex-row items-center gap-3 active:opacity-80"
    >
      {post ? (
        <Img source={sizedImage(post.imageUrl, 56)} className="h-14 w-14 rounded-xl bg-line" contentFit="cover" transition={200} />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-soft-gray">
          <Ionicons name="map" size={22} color={colors.textMuted} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
          {post ? (post.title ?? post.place.name) : t("trips.deletedPost")}
        </Text>
        <Text className="text-[13px] text-muted">{date}</Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="text-[15px] font-bold text-deep-green">{run.distanceKm.toFixed(1)} km</Text>
        {total ? (
          <Text className={cn("text-[13px]", run.visitedStops.length === total ? "font-bold text-deep-green" : "text-muted")}>
            {run.visitedStops.length}/{total} {t("trip.stops").toLowerCase()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
