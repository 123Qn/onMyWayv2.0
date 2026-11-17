import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/cn";
import { timeAgo } from "../lib/format";
import { groupMoments, useFeedPosts, type MomentGroup } from "../lib/feed";
import { useSeenMoments } from "../lib/postStore";
import { colors } from "../lib/theme";
import { Avatar } from "./Avatar";
import { AnimatedView, Img } from "./ui/Screen";

const RING = 72;
// The dashed lime ring (the road from the logo) means there are moments you haven't watched
const RING_CLASS = "h-[72px] w-[72px] rounded-full border-[2.5px] p-[3px]";
const PILL_CLASS = "-mt-2.5 min-h-[18px] justify-center rounded-[10px] border-2 border-soft-gray px-2 py-0.5";

// Live moments from the last 24 hours, one ring per traveler, like stories.
export function OnTheRoad() {
  const { user } = useAuth();
  const posts = useFeedPosts();
  const { seen } = useSeenMoments();

  const groups = useMemo(() => groupMoments(posts), [posts]);
  const mine = groups.find((g) => g.author === user?.name);
  const others = groups.filter((g) => g !== mine);

  const openCamera = () => router.push({ pathname: "/create", params: { kind: "moment" } });
  const openViewer = (author: string) => router.push({ pathname: "/moments", params: { author } });

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 px-5">
        <LiveDot />
        <Text className="text-[15px] font-bold text-ink">{t("feed.onTheRoad")}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 px-4">
        {/* My ring: watch my moments when I have some, otherwise straight to the camera */}
        <Pressable
          onPress={mine ? () => openViewer(mine.author) : openCamera}
          accessibilityRole="button"
          accessibilityLabel={mine ? t("feed.viewMoments", { name: t("feed.yourMoment") }) : t("feed.addMoment")}
          className="w-20 items-center active:opacity-70"
        >
          <View className={cn(RING_CLASS, mine ? "border-dashed border-lime-green" : "border-solid border-line")}>
            {mine ? (
              <Img source={mine.latest.imageUrl} className="flex-1 rounded-full bg-lime-tint" contentFit="cover" transition={200} />
            ) : (
              <View className="flex-1 items-center justify-center overflow-hidden rounded-full">
                {user ? <Avatar name={user.name} size={RING - 14} uri={user.avatarUrl} /> : null}
              </View>
            )}
            <Pressable
              onPress={openCamera}
              accessibilityRole="button"
              accessibilityLabel={t("feed.addMoment")}
              hitSlop={8}
              className="absolute -right-1 bottom-1 h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-soft-gray bg-deep-green"
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </Pressable>
          </View>
          <View className={cn(PILL_CLASS, "bg-lime-green px-2.5")}>
            {mine ? (
              <Text className="text-[10px] font-bold text-ink">{timeAgo(mine.latest.createdAt)}</Text>
            ) : (
              <Ionicons name="camera" size={10} color={colors.inkBlack} />
            )}
          </View>
          <Text className="mt-1 text-xs font-bold text-ink" numberOfLines={1}>
            {t("feed.yourMoment")}
          </Text>
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            {mine ? mine.latest.place.name : t("feed.shareNow")}
          </Text>
        </Pressable>

        {others.map((group) => (
          <TravelerRing
            key={group.author}
            group={group}
            unseen={group.moments.some((m) => !seen.has(m.id))}
            onPress={() => openViewer(group.author)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TravelerRing({ group, unseen, onPress }: { group: MomentGroup; unseen: boolean; onPress: () => void }) {
  const { latest } = group;
  // During a trip show which day it is, otherwise how fresh the latest moment is
  const label = latest.tripDay ? t("feed.dayN", { count: latest.tripDay }) : timeAgo(latest.createdAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t("feed.viewMoments", { name: group.author })}, ${latest.place.name}, ${label}`}
      className="w-20 items-center active:opacity-70"
    >
      <View className={cn(RING_CLASS, unseen ? "border-dashed border-lime-green" : "border-solid border-line")}>
        <Img
          source={latest.imageUrl}
          className={cn("flex-1 rounded-full bg-lime-tint", !unseen && "opacity-85")}
          contentFit="cover"
          transition={200}
        />
        <View className="absolute -right-1 -top-0.5 rounded-[14px] border-2 border-soft-gray">
          <Avatar name={group.author} size={24} uri={latest.author.avatarUrl} />
        </View>
      </View>
      <View className={cn(PILL_CLASS, unseen ? "bg-deep-green" : "bg-muted")}>
        <Text className="text-[10px] font-bold text-white">{label}</Text>
      </View>
      <Text className={cn("mt-1 text-xs font-bold", unseen ? "text-ink" : "text-muted")} numberOfLines={1}>
        {group.author.split(" ")[0]}
      </Text>
      <Text className="text-[11px] text-muted" numberOfLines={1}>
        {latest.place.name}
      </Text>
    </Pressable>
  );
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="h-2.5 w-2.5 items-center justify-center">
      <AnimatedView
        className="absolute h-2 w-2 rounded-full bg-lime-green"
        style={{
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
        }}
      />
      <View className="h-2 w-2 rounded-full bg-lime-green" />
    </View>
  );
}
