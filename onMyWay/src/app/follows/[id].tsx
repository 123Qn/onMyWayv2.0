import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import { fetchFollows, openProfile, type Traveler } from "../../lib/communityApi";
import { flagEmoji } from "../../lib/format";
import type { FrameId } from "../../lib/rewards";
import { colors, font } from "../../lib/theme";
import { AvatarFrame } from "../../components/AvatarFrame";
import { FollowButton } from "../../components/FollowButton";

type Tab = "followers" | "following";

// A traveler's followers and the people they follow, as two tabs
export default function FollowsScreen() {
  const { id, tab: initialTab, name } = useLocalSearchParams<{ id: string; tab?: Tab; name?: string }>();
  const userId = Number(id);
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab === "following" ? "following" : "followers");
  const [lists, setLists] = useState<Partial<Record<Tab, Traveler[]>>>({});
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [followers, following] = await Promise.allSettled([fetchFollows(userId, "followers"), fetchFollows(userId, "following")]);
    setLists({
      followers: followers.status === "fulfilled" ? followers.value : undefined,
      following: following.status === "fulfilled" ? following.value : undefined,
    });
    setFailed(followers.status === "rejected" && following.status === "rejected");
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const list = lists[tab];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("post.back")} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.inkBlack} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{name ?? ""}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        {(["followers", "following"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
            style={[styles.tab, tab === k && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
              {t(`profile.${k}`)}
              {lists[k] ? ` · ${lists[k]!.length}` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {failed ? (
        <Text style={styles.empty}>{t("community.loadFailed")}</Text>
      ) : !list ? (
        <ActivityIndicator color={colors.deepGreen} style={styles.loading} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t(tab === "followers" ? "follows.noFollowers" : "follows.noFollowing")}</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openProfile(item.id, user?.id)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <AvatarFrame name={item.name} frame={item.frame as FrameId} avatarSize={44} uri={item.avatarUrl} />
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                  {item.countryCode ? `  ${flagEmoji(item.countryCode)}` : ""}
                </Text>
                {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
              </View>
              {item.id !== user?.id ? <FollowButton user={item} initial={item.following} compact /> : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerSpacer: { width: 24 },
  title: { flex: 1, textAlign: "center", color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.deepGreen },
  tabText: { color: colors.textMuted, fontSize: 15, fontWeight: font.bold },
  tabTextActive: { color: colors.deepGreen },
  loading: { marginTop: 32 },
  list: { padding: 12, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  name: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  bio: { color: colors.textMuted, fontSize: 13 },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 32 },
});
