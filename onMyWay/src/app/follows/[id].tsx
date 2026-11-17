import { useCallback, useState } from "react";
import { FlatList, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import { fetchFollows, openProfile, type Traveler } from "../../lib/communityApi";
import { useFocusLoad } from "../../lib/hooks";
import { FollowButton } from "../../components/FollowButton";
import { Loading, Screen, ScreenHeader, SegmentedControl, UserRow } from "../../components/ui";

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
  useFocusLoad(load);

  const list = lists[tab];
  const count = (k: Tab) => (lists[k] ? ` · ${lists[k]!.length}` : "");

  return (
    <Screen className="flex-1 bg-white">
      <ScreenHeader title={name} />
      <SegmentedControl
        variant="underline"
        value={tab}
        onChange={setTab}
        options={[
          { value: "followers", label: t("profile.followers") + count("followers") },
          { value: "following", label: t("profile.following") + count("following") },
        ]}
      />

      {failed ? (
        <Text className="mt-8 text-center text-sm text-muted">{t("community.loadFailed")}</Text>
      ) : !list ? (
        <Loading className="mt-8" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-1 p-3"
          ListEmptyComponent={
            <Text className="mt-8 text-center text-sm text-muted">
              {t(tab === "followers" ? "follows.noFollowers" : "follows.noFollowing")}
            </Text>
          }
          renderItem={({ item }) => (
            <UserRow
              user={item}
              lines={[item.bio]}
              onPress={() => openProfile(item.id, user?.id)}
              trailing={item.id !== user?.id ? <FollowButton user={item} initial={item.following} compact /> : null}
            />
          )}
        />
      )}
    </Screen>
  );
}
