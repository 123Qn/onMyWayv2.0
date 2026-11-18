import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { postKind, type FeedPost } from "../lib/feed";
import { sizedImage } from "../lib/image";
import { colors } from "../lib/theme";
import { Img } from "./ui";

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
      className="overflow-hidden rounded-[10px] bg-lime-tint active:opacity-80"
      style={{ width: size, height: size }}
    >
      {post.imageUrl ? (
        <Img source={sizedImage(post.imageUrl, size)} className="absolute inset-0" contentFit="cover" transition={150} />
      ) : (
        <View className="flex-1 justify-center p-2">
          <Text className="text-xs font-bold text-deep-green" numberOfLines={4}>{post.caption}</Text>
        </View>
      )}
      <View className="absolute right-1.5 top-1.5 h-[22px] w-[22px] items-center justify-center rounded-full bg-ink/55">
        <Ionicons name={KIND_ICON[kind]} size={12} color={colors.white} />
      </View>
      {post.verified ? (
        <View className="absolute bottom-1.5 left-1.5 h-[22px] w-[22px] items-center justify-center rounded-full bg-ink/70">
          <Ionicons name="shield-checkmark" size={12} color={colors.limeGreen} />
        </View>
      ) : null}
    </Pressable>
  );
}
