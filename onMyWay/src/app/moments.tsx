import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { timeAgo } from "../lib/format";
import { groupMoments, isByUser, useFeedPosts, type FeedPost } from "../lib/feed";
import { useSeenMoments } from "../lib/postStore";
import { useAuthorFrame } from "../lib/rewards";
import { colors } from "../lib/theme";
import { AvatarFrame } from "../components/AvatarFrame";
import { AnimatedView, Img } from "../components/ui";

const DURATION = 5000;

// Full-screen story viewer for "On the road now".
// Tap right/left: next/previous moment. Swipe left/right: next/previous traveler.
// Hold: pause. Swipe down: close.
export default function MomentsScreen() {
  const { author } = useLocalSearchParams<{ author: string }>();
  const { user } = useAuth();
  const posts = useFeedPosts();
  const { seen, markSeen } = useSeenMoments();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Same order as the row: my moments first, then everyone else by latest activity.
  // Frozen when the viewer opens so watching (or new posts) doesn't reshuffle it.
  const groups = useMemo(() => {
    const all = groupMoments(posts);
    const mine = all.filter((g) => g.author === user?.name);
    return [...mine, ...all.filter((g) => g.author !== user?.name)];
  }, []);

  const firstUnseen = (gi: number) => {
    const idx = groups[gi]?.moments.findIndex((m) => !seen.has(m.id)) ?? -1;
    return idx === -1 ? 0 : idx;
  };

  const startGroup = Math.max(0, groups.findIndex((g) => g.author === author));
  const [g, setG] = useState(startGroup);
  const [i, setI] = useState(() => firstUnseen(startGroup));
  const [paused, setPaused] = useState(false);
  const [restart, setRestart] = useState(0);

  const group = groups[g];
  const moment: FeedPost | undefined = group?.moments[i];
  const frame = useAuthorFrame(moment?.author ?? { name: "" }, !!moment && isByUser(moment, user));

  const progress = useRef(new Animated.Value(0)).current;
  const position = useRef(0);

  const close = () => router.back();

  const next = () => {
    if (!group) return close();
    if (i < group.moments.length - 1) setI(i + 1);
    else if (g < groups.length - 1) {
      setG(g + 1);
      setI(firstUnseen(g + 1));
    } else close();
  };

  const previous = () => {
    if (i > 0) setI(i - 1);
    else if (g > 0) {
      setG(g - 1);
      setI(groups[g - 1].moments.length - 1);
    } else setRestart((r) => r + 1);
  };

  const nextGroup = () => {
    if (g < groups.length - 1) {
      setG(g + 1);
      setI(firstUnseen(g + 1));
    } else close();
  };

  const previousGroup = () => {
    if (g > 0) {
      setG(g - 1);
      setI(firstUnseen(g - 1));
    } else setRestart((r) => r + 1);
  };

  useEffect(() => {
    if (moment) markSeen(moment.id);
  }, [moment?.id]);

  // A new moment starts its bar from zero
  useEffect(() => {
    position.current = 0;
    progress.setValue(0);
  }, [g, i, restart, progress]);

  // Run the bar; pausing stops it and remembers where it was
  useEffect(() => {
    if (paused || !moment) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION * (1 - position.current),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) next();
    });
    return () => {
      anim.stop();
      progress.stopAnimation((v) => {
        position.current = v;
      });
    };
  }, [g, i, restart, paused]);

  // Gesture handling on the photo layer
  const touch = useRef({ x: 0, y: 0, time: 0 });
  const onTouchStart = (e: GestureResponderEvent) => {
    touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, time: Date.now() };
    setPaused(true);
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    setPaused(false);
    const dx = e.nativeEvent.pageX - touch.current.x;
    const dy = e.nativeEvent.pageY - touch.current.y;
    const held = Date.now() - touch.current.time > 350;
    if (dy > 120 && Math.abs(dy) > Math.abs(dx)) return close();
    if (Math.abs(dx) > 60) return dx < 0 ? nextGroup() : previousGroup();
    if (held) return; // a long press only pauses
    if (touch.current.x < width / 3) previous();
    else next();
  };

  if (!group || !moment) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <StatusBar style="light" />
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("moments.close")} className="h-11 w-11 items-center justify-center">
          <Ionicons name="close" size={28} color={colors.white} />
        </Pressable>
      </View>
    );
  }


  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />
      <Img source={moment.imageUrl} className="absolute inset-0" contentFit="cover" transition={150} />

      <View
        className="absolute inset-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => setPaused(false)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={moment.caption}
        accessibilityActions={[
          { name: "increment", label: t("moments.next") },
          { name: "decrement", label: t("moments.previous") },
        ]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === "increment" ? next() : previous())}
      />

      {/* Top: progress bars and author */}
      <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 gap-3 bg-black/25 px-3 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row gap-1">
          {group.moments.map((m, idx) => (
            <View key={m.id} className="h-[3px] flex-1 overflow-hidden rounded-sm bg-white/35">
              <AnimatedView
                className="h-full bg-white"
                style={{
                  width:
                    idx < i
                      ? "100%"
                      : idx > i
                        ? "0%"
                        : progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                }}
              />
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-1.5">
          <AvatarFrame name={moment.author.name} frame={frame} avatarSize={34} uri={moment.author.avatarUrl} />
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-white" numberOfLines={1}>
              {moment.author.name}
            </Text>
            <Text className="text-xs text-white/80" numberOfLines={1}>
              {moment.tripDay ? `${t("feed.dayN", { count: moment.tripDay })} · ` : ""}
              {timeAgo(moment.createdAt)}
            </Text>
          </View>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("moments.close")} hitSlop={10} className="h-11 w-11 items-center justify-center">
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* Bottom: place, caption, open the full post */}
      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 gap-2.5 bg-black/35 px-5 pt-8" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="flex-row items-center gap-1.5 self-start rounded-[14px] bg-ink/70 px-2.5 py-[5px]">
          <Ionicons
            name={moment.verified ? "shield-checkmark" : "location"}
            size={14}
            color={moment.verified ? colors.limeGreen : colors.white}
          />
          <Text className="text-[13px] font-bold text-white" numberOfLines={1}>
            {[moment.place.name, moment.place.country].filter(Boolean).join(", ")}
          </Text>
        </View>
        {moment.caption ? <Text className="text-base leading-[22px] text-white">{moment.caption}</Text> : null}
        <Pressable
          onPress={() => router.push({ pathname: "/post/[id]", params: { id: String(moment.id) } })}
          accessibilityRole="button"
          className="flex-row items-center gap-1 self-start rounded-[18px] bg-white px-4 py-[9px] active:opacity-75"
        >
          <Text className="text-sm font-bold text-ink">{t("moments.viewPost")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkBlack} />
        </Pressable>
      </View>
    </View>
  );
}
