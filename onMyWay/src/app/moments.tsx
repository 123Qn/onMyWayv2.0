import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { timeAgo } from "../lib/format";
import { groupMoments, useFeedPosts, type FeedPost } from "../lib/mockFeed";
import { useSeenMoments } from "../lib/postStore";
import { authorFrame, type FrameId } from "../lib/rewards";
import { colors, font } from "../lib/theme";
import { AvatarFrame } from "../components/AvatarFrame";

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
      <View style={styles.empty}>
        <StatusBar style="light" />
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("moments.close")} style={styles.iconButton}>
          <Ionicons name="close" size={28} color={colors.white} />
        </Pressable>
      </View>
    );
  }

  const frame = (moment.author.frame as FrameId | undefined) ?? authorFrame(moment.author.name);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Image source={moment.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />

      <View
        style={StyleSheet.absoluteFill}
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
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bars}>
          {group.moments.map((m, idx) => (
            <View key={m.id} style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width:
                      idx < i
                        ? "100%"
                        : idx > i
                          ? "0%"
                          : progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.authorRow}>
          <AvatarFrame name={moment.author.name} frame={frame} avatarSize={34} />
          <View style={styles.flex}>
            <Text style={styles.author} numberOfLines={1}>
              {moment.author.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {moment.tripDay ? `${t("feed.dayN", { count: moment.tripDay })} · ` : ""}
              {timeAgo(moment.createdAt)}
            </Text>
          </View>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("moments.close")} hitSlop={10} style={styles.iconButton}>
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* Bottom: place, caption, open the full post */}
      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.placePill}>
          <Ionicons
            name={moment.verified ? "shield-checkmark" : "location"}
            size={14}
            color={moment.verified ? colors.limeGreen : colors.white}
          />
          <Text style={styles.placeText} numberOfLines={1}>
            {[moment.place.name, moment.place.country].filter(Boolean).join(", ")}
          </Text>
        </View>
        {moment.caption ? <Text style={styles.caption}>{moment.caption}</Text> : null}
        <Pressable
          onPress={() => router.push({ pathname: "/post/[id]", params: { id: String(moment.id) } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.viewPost, pressed && styles.pressed]}
        >
          <Text style={styles.viewPostText}>{t("moments.viewPost")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkBlack} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.inkBlack },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.inkBlack },
  flex: { flex: 1 },
  top: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  bars: { flexDirection: "row", gap: 4 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.35)" },
  barFill: { height: "100%", backgroundColor: colors.white },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  author: { color: colors.white, fontSize: 15, fontWeight: font.bold },
  meta: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: font.regular },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  placePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(27,43,40,0.7)",
  },
  placeText: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  caption: { color: colors.white, fontSize: 16, lineHeight: 22, fontWeight: font.regular },
  viewPost: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  viewPostText: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  pressed: { opacity: 0.75 },
});
