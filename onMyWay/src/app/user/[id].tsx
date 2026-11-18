import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { rememberPosts, type FeedPost } from "../../lib/feed";
import { useQuery } from "../../lib/cache";
import { fetchProfile, fetchUserPosts, profileKey, userPostsKey } from "../../lib/profileApi";
import { BADGES, computeRewards, type BadgeId, type BadgeProgress, type FrameId } from "../../lib/rewards";
import { colors } from "../../lib/theme";
import { AvatarFrame } from "../../components/AvatarFrame";
import { BadgeSheet } from "../../components/BadgeSheet";
import { FollowButton } from "../../components/FollowButton";
import { BadgesCard, LevelPill, PostsGridCard, ProfileHero, ShowcaseCard, TravelStatRow } from "../../components/profile/ProfileParts";
import { BackButton, Loading, Screen } from "../../components/ui";

const EMPTY_POSTS: FeedPost[] = [];

// Another traveler's profile: who they are, their travel stats, badges and posts
export default function TravelerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const [selected, setSelected] = useState<BadgeProgress | null>(null);

  // Opening a traveler again shows them at once from the cache, then refreshes
  const profileQuery = useQuery(profileKey(userId), () => fetchProfile(userId));
  const postsQuery = useQuery(userPostsKey(userId), () => fetchUserPosts(userId));
  const profile = profileQuery.data ?? null;
  const posts = postsQuery.data ?? EMPTY_POSTS;
  const failed = profileQuery.failed;
  const refreshing = profileQuery.refreshing || postsQuery.refreshing;
  const onRefresh = () => {
    profileQuery.refresh();
    postsQuery.refresh();
  };
  const load = profileQuery.reload;
  useEffect(() => rememberPosts(posts), [posts]);

  const rewards = useMemo(() => (profile ? computeRewards(profile.stats) : null), [profile]);

  if (!profile || !rewards) {
    return (
      <Screen className="flex-1 items-center justify-center gap-3 bg-soft-gray">
        <BackButton round />
        {failed ? <Text className="text-sm text-muted">{t("traveler.notFound")}</Text> : <Loading className="mt-0" />}
      </Screen>
    );
  }

  const { user, counts, stats } = profile;
  const pinned = user.pinnedBadges.filter((b): b is BadgeId => BADGES.some((x) => x.id === b));

  return (
    <Screen className="flex-1 bg-soft-gray" edges={["top"]}>
      <ScrollView
        contentContainerClassName="gap-4 p-5 pb-12"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
      >
        <BackButton round className="self-start" />

        <ProfileHero
          user={user}
          counts={counts}
          avatar={<AvatarFrame name={user.name} frame={user.frame as FrameId} avatarSize={96} uri={user.avatarUrl} />}
          footer={
            <>
              <LevelPill level={rewards.level} />
              <FollowButton user={{ id: user.id, name: user.name }} initial={profile.followedByViewer} onChange={load} />
            </>
          }
        />

        <TravelStatRow stats={stats} />
        <ShowcaseCard pinned={pinned} progress={rewards.progress} onSelect={setSelected} />
        <BadgesCard unlocked={rewards.unlocked} onSelect={setSelected} />
        <PostsGridCard
          title={t("traveler.posts", { name: user.name.split(" ")[0] })}
          posts={posts}
          empty={<Text className="text-sm text-muted">{t("traveler.noPosts")}</Text>}
        />
      </ScrollView>

      <BadgeSheet progress={selected} onClose={() => setSelected(null)} readOnly />
    </Screen>
  );
}
