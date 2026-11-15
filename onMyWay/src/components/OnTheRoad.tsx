import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { t } from "../i18n";
import { getPostById, ON_THE_ROAD } from "../lib/mockFeed";
import { colors, font } from "../lib/theme";
import { Avatar } from "./Avatar";

// "Stories" of travelers posting live from a trip. The dashed lime ring is the road from the logo.
export function OnTheRoad() {
  const travelers = ON_THE_ROAD.flatMap(({ postId, day }) => {
    const post = getPostById(postId);
    return post ? [{ post, day }] : [];
  });

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <LiveDot />
        <Text style={styles.title}>{t("feed.onTheRoad")}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {travelers.map(({ post, day }) => (
          <Pressable
            key={post.id}
            onPress={() => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } })}
            accessibilityRole="button"
            accessibilityLabel={`${post.author.name}, ${post.place.name}, ${t("feed.dayN", { count: day })}`}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.ring}>
              <Image source={post.imageUrl} style={styles.photo} contentFit="cover" transition={200} />
              <View style={styles.avatarBadge}>
                <Avatar name={post.author.name} size={24} />
              </View>
            </View>
            <View style={styles.dayPill}>
              <Text style={styles.dayText}>{t("feed.dayN", { count: day })}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {post.author.name.split(" ")[0]}
            </Text>
            <Text style={styles.place} numberOfLines={1}>
              {post.place.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  photo: { flex: 1, borderRadius: RING / 2, backgroundColor: colors.limeTint },
  avatarBadge: {
    position: "absolute",
    right: -4,
    top: -2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.softGray,
  },
  dayPill: {
    marginTop: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.softGray,
    backgroundColor: colors.deepGreen,
  },
  dayText: { color: colors.white, fontSize: 10, fontWeight: font.bold },
  name: { marginTop: 4, color: colors.inkBlack, fontSize: 12, fontWeight: font.bold },
  place: { color: colors.textMuted, fontSize: 11, fontWeight: font.regular },
});
