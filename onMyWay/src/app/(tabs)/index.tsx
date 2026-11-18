import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, Text, View, type ListRenderItem } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import { useFeedPosts, type FeedPost } from "../../lib/feed";
import { loadMoreFeed, refreshFeed } from "../../lib/postsApi";
import { refreshUnreadCount, useUnreadCount } from "../../lib/notifications";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { colors } from "../../lib/theme";
import { useRewards } from "../../lib/rewards";
import { AssistantButton } from "../../components/AssistantButton";
import { AvatarFrame } from "../../components/AvatarFrame";
import { Wordmark } from "../../components/BrandLogo";
import { CategoryChips, type CategoryFilter } from "../../components/CategoryChips";
import { DestinationFilter, type Destination } from "../../components/DestinationFilter";
import { OnTheRoad } from "../../components/OnTheRoad";
import { PostCard } from "../../components/PostCard";
import { Screen } from "../../components/ui";

const renderPost: ListRenderItem<FeedPost> = ({ item }) => <PostCard post={item} />;
const Separator = () => <View className="h-4" />;

export default function FeedScreen() {
  const { user } = useAuth();
  const { frame } = useRewards();
  const allPosts = useFeedPosts();
  const [refreshing, setRefreshing] = useState(false);

  // Load posts on open and on pull-to-refresh
  const unread = useUnreadCount();
  // Older posts load as you reach the end; hasMore turns off at the last page
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const reload = useCallback(async () => {
    setRefreshing(true);
    refreshUnreadCount().catch(() => {});
    await refreshFeed().then(setHasMore, () => {});
    setRefreshing(false);
  }, []);
  useEffect(() => {
    refreshFeed().then(setHasMore, () => {});
  }, []);
  const loadMore = async () => {
    if (!hasMore || loadingMore || refreshing) return;
    setLoadingMore(true);
    await loadMoreFeed().then(setHasMore, () => {});
    setLoadingMore(false);
  };
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [country, setCountry] = useState<string | null>(null);

  const inCategory = useMemo(
    () => (category === "all" ? allPosts : allPosts.filter((p) => p.category === category)),
    [allPosts, category]
  );

  // Countries with post counts for the current category, most posts first
  const destinations = useMemo(() => {
    const byCode = new Map<string, Destination>();
    for (const post of allPosts) {
      const { countryCode: code, country: name } = post.place;
      // Unverified posts typed by hand have no country yet
      if (code && !byCode.has(code)) byCode.set(code, { code, name, count: 0 });
    }
    for (const post of inCategory) {
      const entry = byCode.get(post.place.countryCode);
      if (entry) entry.count++;
    }
    return [...byCode.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [allPosts, inCategory]);

  const posts = useMemo(
    () => (country ? inCategory.filter((p) => p.place.countryCode === country) : inCategory),
    [inCategory, country]
  );

  const header = (
    <View className="gap-4.5 pb-4 pt-2">
      <View className="flex-row items-center justify-between px-5">
        <Wordmark size={28} />
        <View className="flex-row items-center gap-3.5">
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={
              unread ? `${t("notifications.open")}, ${t("notifications.unread", { count: unread })}` : t("notifications.open")
            }
            hitSlop={8}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name={unread ? "notifications" : "notifications-outline"} size={24} color={colors.inkBlack} />
            {unread ? (
              <View className="absolute right-0 top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border-2 border-soft-gray bg-heart px-1">
                <Text className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        {user ? (
          <Pressable
            onPress={() => router.navigate("/index4")}
            accessibilityRole="button"
            accessibilityLabel={t("feed.openProfile")}
            hitSlop={8}
          >
            <AvatarFrame name={user.name} frame={frame} avatarSize={34} uri={user.avatarUrl} />
          </Pressable>
        ) : null}
        </View>
      </View>

      <OnTheRoad />

      <View className="-mt-0.5 px-5">
        <DestinationFilter
          destinations={destinations}
          value={country}
          onChange={setCountry}
          totalCount={inCategory.length}
        />
      </View>

      <CategoryChips value={category} onChange={setCategory} />
    </View>
  );

  return (
    <Screen className="flex-1 bg-soft-gray" edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        renderItem={renderPost}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View className="items-center gap-2 pt-12">
            <Ionicons name="compass" size={48} color={colors.limeGreen} />
            <Text className="text-[17px] font-bold text-ink">{t("feed.empty")}</Text>
            <Text className="text-sm text-muted">{t("feed.emptyHint")}</Text>
          </View>
        }
        ItemSeparatorComponent={Separator}
        // Lazy list: a few cards at start, the rest built just before they scroll into view
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.deepGreen} className="my-5" /> : undefined}
        contentContainerClassName="pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />
        }
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />

      <AssistantButton />
    </Screen>
  );
}
