import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../lib/AuthContext";
import { ApiError } from "../../lib/api";
import { t } from "../../i18n";
import { useFocusLoad, useRefresh } from "../../lib/hooks";
import { useRewards, type BadgeProgress } from "../../lib/rewards";
import type { FeedPost } from "../../lib/feed";
import { fetchUserPosts, refreshMyProfile } from "../../lib/profileApi";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { colors } from "../../lib/theme";
import { AvatarFrame } from "../../components/AvatarFrame";
import { BadgeSheet } from "../../components/BadgeSheet";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BadgesCard, LevelPill, PostsGridCard, ProfileHero, ShowcaseCard, TravelStatRow } from "../../components/profile/ProfileParts";
import { Screen } from "../../components/ui";

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { frame, pinned, stats, counts, level, progress, unlocked, about } = useRewards();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [busy, setBusy] = useState<"logout" | "delete" | null>(null);
  const [selected, setSelected] = useState<BadgeProgress | null>(null);

  // Stats and my posts are fresh every time the tab is opened (e.g. right after posting)
  const load = useCallback(async () => {
    if (!user) return;
    await Promise.all([refreshMyProfile(user.id).catch(() => {}), fetchUserPosts(user.id).then(setPosts, () => {})]);
  }, [user]);
  useFocusLoad(load);
  const { refreshing, onRefresh } = useRefresh(load);

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
    Alert.alert(t("profile.deleteAccount"), t("profile.deleteConfirm"), [
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
            Alert.alert(t("profile.deleteFailed"), e instanceof ApiError ? e.message : t("common.tryAgainLater"));
          }
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <Screen className="flex-1 bg-soft-gray" edges={["top"]}>
      <ScrollView
        contentContainerClassName="gap-4 p-5 pb-[120px]"
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
      >
        <ProfileHero
          user={{ id: user.id, name: user.name, ...about }}
          counts={counts}
          avatar={
            <Pressable onPress={() => router.push("/frames")} accessibilityRole="button" accessibilityLabel={t("profile.editFrame")}>
              <AvatarFrame name={user.name} frame={frame} avatarSize={96} uri={about.avatarUrl ?? user.avatarUrl} />
              <View className="absolute bottom-3.5 right-3.5 h-8 w-8 items-center justify-center rounded-full border-[3px] border-soft-gray bg-deep-green">
                <Ionicons name="color-palette" size={16} color={colors.white} />
              </View>
            </Pressable>
          }
          footer={
            <>
              <LevelPill level={level} />
              <View className="mt-1 gap-1.5 self-stretch px-10">
                <View className="h-2 overflow-hidden rounded bg-line">
                  <View className="h-full rounded bg-lime-green" style={{ width: `${(level.current / level.needed) * 100}%` }} />
                </View>
                <Text className="text-center text-xs font-bold text-muted">{level.max ? t("rewards.maxLevel") : t("rewards.xp", { current: level.current, next: level.needed })}</Text>
              </View>
            </>
          }
        >
          <Pressable
            onPress={() => router.push("/edit-profile")}
            accessibilityRole="button"
            className="flex-row items-center gap-1.5 rounded-2xl bg-lime-tint px-3.5 py-[7px] active:opacity-80"
          >
            <Ionicons name="create-outline" size={16} color={colors.deepGreen} />
            <Text className="text-sm font-bold text-deep-green">{t("editProfile.title")}</Text>
          </Pressable>
        </ProfileHero>

        <TravelStatRow stats={stats} />
        <ShowcaseCard pinned={pinned} progress={progress} onSelect={setSelected} emptyHint={t("rewards.showcaseHint")} />
        <BadgesCard unlocked={unlocked} onViewAll={() => router.push("/badges")} />
        <PostsGridCard
          title={t("profile.myPosts")}
          posts={posts}
          empty={
            <Pressable onPress={() => router.push("/create")} accessibilityRole="button" className="items-center gap-1.5 py-4">
              <Ionicons name="map" size={28} color={colors.limeGreen} />
              <Text className="text-sm text-muted">{t("profile.noPosts")}</Text>
              <Text className="text-sm font-bold text-deep-green">{t("profile.firstPost")}</Text>
            </Pressable>
          }
        />

        <Text className="ml-1 mt-2 text-[13px] font-bold text-muted">{t("profile.account")}</Text>
        <View className="gap-3">
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
    </Screen>
  );
}
