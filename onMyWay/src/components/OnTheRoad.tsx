import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { timeAgo } from "../lib/format";
import { groupMoments, useFeedPosts, type MomentGroup } from "../lib/mockFeed";
import { useSeenMoments } from "../lib/postStore";
import { colors, font } from "../lib/theme";
import { Avatar } from "./Avatar";

// Live moments from the last 24 hours, one ring per traveler, like stories.
// The dashed lime ring (the road from the logo) means there are moments you haven't watched.
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
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <LiveDot />
        <Text style={styles.title}>{t("feed.onTheRoad")}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {/* My ring: watch my moments when I have some, otherwise straight to the camera */}
        <Pressable
          onPress={mine ? () => openViewer(mine.author) : openCamera}
          accessibilityRole="button"
          accessibilityLabel={mine ? t("feed.viewMoments", { name: t("feed.yourMoment") }) : t("feed.addMoment")}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <View style={[styles.ring, !mine && styles.ringAdd]}>
            {mine ? (
              <Image source={mine.latest.imageUrl} style={styles.photo} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.addInner}>{user ? <Avatar name={user.name} size={RING - 14} /> : null}</View>
            )}
            <Pressable
              onPress={openCamera}
              accessibilityRole="button"
              accessibilityLabel={t("feed.addMoment")}
              hitSlop={8}
              style={styles.addBadge}
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </Pressable>
          </View>
          <View style={[styles.pill, styles.livePill]}>
            {mine ? (
              <Text style={styles.pillTextDark}>{timeAgo(mine.latest.createdAt)}</Text>
            ) : (
              <Ionicons name="camera" size={10} color={colors.inkBlack} />
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {t("feed.yourMoment")}
          </Text>
          <Text style={styles.place} numberOfLines={1}>
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
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={[styles.ring, !unseen && styles.ringSeen]}>
        <Image
          source={latest.imageUrl}
          style={[styles.photo, !unseen && styles.photoSeen]}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.avatarBadge}>
          <Avatar name={group.author} size={24} />
        </View>
      </View>
      <View style={[styles.pill, !unseen && styles.pillSeen]}>
        <Text style={styles.pillText}>{label}</Text>
      </View>
      <Text style={[styles.name, !unseen && styles.nameSeen]} numberOfLines={1}>
        {group.author.split(" ")[0]}
      </Text>
      <Text style={styles.place} numberOfLines={1}>
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
    <View style={styles.dotWrap}>
      <Animated.View
        style={[
          styles.dotHalo,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
          },
        ]}
      />
      <View style={styles.dot} />
    </View>
  );
}

const RING = 72;

const styles = StyleSheet.create({
  container: { gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20 },
  title: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  dotWrap: { width: 10, height: 10, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.limeGreen },
  dotHalo: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: colors.limeGreen },
  row: { paddingHorizontal: 16, gap: 10 },
  item: { width: 80, alignItems: "center" },
  pressed: { opacity: 0.7 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderColor: colors.limeGreen,
    padding: 3,
  },
  ringAdd: { borderStyle: "solid", borderColor: colors.border },
  ringSeen: { borderStyle: "solid", borderColor: colors.border },
  photo: { flex: 1, borderRadius: RING / 2, backgroundColor: colors.limeTint },
  photoSeen: { opacity: 0.85 },
  addInner: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: RING / 2, overflow: "hidden" },
  addBadge: {
    position: "absolute",
    right: -4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
    borderWidth: 3,
    borderColor: colors.softGray,
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    top: -2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.softGray,
  },
  pill: {
    marginTop: -10,
    minHeight: 18,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.softGray,
    backgroundColor: colors.deepGreen,
  },
  livePill: { backgroundColor: colors.limeGreen, paddingHorizontal: 10 },
  pillSeen: { backgroundColor: colors.textMuted },
  pillText: { color: colors.white, fontSize: 10, fontWeight: font.bold },
  pillTextDark: { color: colors.inkBlack, fontSize: 10, fontWeight: font.bold },
  name: { marginTop: 4, color: colors.inkBlack, fontSize: 12, fontWeight: font.bold },
  nameSeen: { color: colors.textMuted },
  place: { color: colors.textMuted, fontSize: 11, fontWeight: font.regular },
});
