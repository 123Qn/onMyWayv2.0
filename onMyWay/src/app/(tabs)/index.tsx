import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import { useFeedPosts } from "../../lib/mockFeed";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { colors, font } from "../../lib/theme";
import { useRewards } from "../../lib/rewards";
import { AvatarFrame } from "../../components/AvatarFrame";
import { Wordmark } from "../../components/BrandLogo";
import { CategoryChips, type CategoryFilter } from "../../components/CategoryChips";
import { DestinationFilter, type Destination } from "../../components/DestinationFilter";
import { OnTheRoad } from "../../components/OnTheRoad";
import { PostCard } from "../../components/PostCard";

export default function FeedScreen() {
  const { user } = useAuth();
  const { frame } = useRewards();
  const allPosts = useFeedPosts();
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
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Wordmark size={28} />
        {user ? (
          <Pressable
            onPress={() => router.navigate("/index4")}
            accessibilityRole="button"
            accessibilityLabel={t("feed.openProfile")}
            hitSlop={8}
          >
            <AvatarFrame name={user.name} frame={frame} avatarSize={34} />
          </Pressable>
        ) : null}
      </View>

      <OnTheRoad />

      <View style={styles.filterRow}>
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="compass" size={48} color={colors.limeGreen} />
            <Text style={styles.emptyTitle}>{t("feed.empty")}</Text>
            <Text style={styles.emptyHint}>{t("feed.emptyHint")}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.softGray },
  content: { paddingBottom: 24 },
  header: { paddingTop: 8, paddingBottom: 16, gap: 18 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  filterRow: { paddingHorizontal: 20, marginTop: -2 },
  separator: { height: 16 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  emptyHint: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
});
