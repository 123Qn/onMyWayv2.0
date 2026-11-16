import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { postKind, type FeedPost } from "../lib/feed";
import { colors, font } from "../lib/theme";

const KIND_ICON = { trip: "map", moment: "camera", question: "chatbubbles" } as const;

export const GRID_GAP = 4;

/** Square thumbnail of a post in a profile grid */
export function PostTile({ post, size }: { post: FeedPost; size: number }) {
  const kind = postKind(post);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } })}
      accessibilityRole="button"
      accessibilityLabel={post.title ?? post.caption}
      style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && styles.pressed]}
    >
      {post.imageUrl ? (
        <Image source={post.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.tileText}>
          <Text style={styles.tileQuestion} numberOfLines={4}>{post.caption}</Text>
        </View>
      )}
      <View style={styles.tileKind}>
        <Ionicons name={KIND_ICON[kind]} size={12} color={colors.white} />
      </View>
      {post.verified ? (
        <View style={styles.tileVerified}>
          <Ionicons name="shield-checkmark" size={12} color={colors.limeGreen} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  tile: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.limeTint,
  },
  tileText: { flex: 1, padding: 8, justifyContent: "center" },
  tileQuestion: { color: colors.deepGreen, fontSize: 12, fontWeight: font.bold },
  tileKind: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,43,40,0.55)",
  },
  tileVerified: {
    position: "absolute",
    left: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,43,40,0.7)",
  },
});
