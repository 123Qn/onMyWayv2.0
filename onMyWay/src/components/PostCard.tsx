import { memo } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { compactNumber as compact, flagEmoji, timeAgo, stopsLabel } from "../lib/format";
import { isByUser, postKind, type FeedPost } from "../lib/feed";
import { useFollowing, usePostState } from "../lib/postStore";
import { cn } from "../lib/cn";
import { colors } from "../lib/theme";
import { useAuthorFrame } from "../lib/rewards";
import { openProfile } from "../lib/communityApi";
import { AvatarFrame } from "./AvatarFrame";
import { FaceStack } from "./FaceStack";
import { PhotoCarousel, type Slide } from "./PhotoCarousel";

function PostCardImpl({ post }: { post: FeedPost }) {
  const { liked, saved, likes, newComments, toggleLike, toggleSave } = usePostState(post);
  const { isFollowing, toggleFollow } = useFollowing(post.author, post.followingAuthor);
  const { user } = useAuth();
  const isMine = isByUser(post, user);
  const frame = useAuthorFrame(post.author, isMine);
  const kind = postKind(post);
  const commentCount = post.comments + newComments.length;
  const openPost = () => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } });

  const share = () => {
    Share.share({ message: `${post.place.name}, ${post.place.country} — ${post.caption}` }).catch(() => {});
  };

  // What kind of post it is ("shared a trip")
  const subtitle = t(`feed.kind.${kind}`);

  return (
    <View className="mx-4 rounded-lg bg-white py-3.5 shadow-[0_4px_12px_rgba(27,43,40,0.06)]">
      <View className="flex-row items-center gap-2 pl-1.5 pr-3.5">
        <Pressable
          onPress={() => openProfile(post.author.id, user?.id)}
          accessibilityRole="button"
          accessibilityLabel={post.author.name}
          hitSlop={4}
        >
          <AvatarFrame name={post.author.name} frame={frame} avatarSize={40} uri={post.author.avatarUrl} />
        </Pressable>
        <View className="flex-1 gap-0.5">
          <Text className="text-[15px] text-ink" numberOfLines={1}>
            <Text className="font-bold" onPress={() => openProfile(post.author.id, user?.id)}>
              {post.author.name}
            </Text>
            <Text className="text-sm text-muted"> {subtitle}</Text>
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={post.verified ? "shield-checkmark" : "location"}
              size={13}
              color={post.verified ? colors.deepGreen : colors.tealGreen}
              accessibilityLabel={post.verified ? t("create.verifiedHere") : undefined}
            />
            <Text className="shrink text-[13px] text-muted" numberOfLines={1}>
              {post.place.name} · {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        {!isMine ? (
        <Pressable
          onPress={toggleFollow}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: isFollowing }}
          className={cn("rounded-[14px] px-3 py-1.5", isFollowing ? "bg-soft-gray" : "bg-lime-tint")}
        >
          <Text className={cn("text-[13px] font-bold", isFollowing ? "text-muted" : "text-deep-green")}>
            {isFollowing ? t("post.following") : t("post.follow")}
          </Text>
        </Pressable>
        ) : null}
      </View>

      {kind === "question" ? (
        <QuestionBody post={post} commentCount={commentCount} onOpen={openPost} />
      ) : (
        <>
          <View className="mx-3 mt-3">
            <PhotoCarousel
              slides={slidesFor(post)}
              onTap={openPost}
              onDoubleTap={() => {
                if (!liked) toggleLike();
              }}
              renderOverlay={(index) => <MediaBadges post={post} index={index} />}
            />
          </View>
          <Pressable onPress={openPost} accessibilityRole="button" accessibilityLabel={t("feed.openPost")}>
            {post.title ? <Text className="mt-2.5 px-4 text-[17px] font-bold leading-[23px] text-ink" numberOfLines={2}>{post.title}</Text> : null}
            {post.caption ? <Text className="mt-2.5 px-4 text-[15px] leading-[21px] text-ink" numberOfLines={3}>{post.caption}</Text> : null}
          </Pressable>
        </>
      )}

      <View className="mt-3 flex-row items-center gap-5 px-4">
        <Pressable
          onPress={toggleLike}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? t("feed.unlike") : t("feed.like")}
          accessibilityState={{ selected: liked }}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? colors.heart : colors.inkBlack} />
          <Text className="text-sm text-ink">{compact(likes)}</Text>
        </Pressable>

        <Pressable
          onPress={openPost}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t("feed.comments")}: ${commentCount}`}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.inkBlack} />
          <Text className="text-sm text-ink">{compact(commentCount)}</Text>
        </Pressable>

        <Pressable
          onPress={share}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("feed.share")}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons name="paper-plane-outline" size={22} color={colors.inkBlack} />
        </Pressable>

        <View className="flex-1" />

        {kind !== "question" ? (
          <Pressable
            onPress={toggleSave}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            className={cn("flex-row items-center gap-1.5 rounded-2xl border-[1.5px] px-3 py-[7px] active:opacity-75", saved ? "border-deep-green bg-deep-green" : "border-lime-green")}
          >
            <Ionicons name={saved ? "flag" : "flag-outline"} size={16} color={saved ? colors.white : colors.deepGreen} />
            <Text className={cn("text-[13px] font-bold", saved ? "text-white" : "text-deep-green")}>
              {saved ? t("feed.onMyList") : t("feed.wantToGo")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {post.likedBy ? (
        <View className="mt-3 px-4">
          <FaceStack
            names={[post.likedBy]}
            bold={post.likedBy}
            text={
              likes > 1
                ? t("feed.likedBy", { name: post.likedBy, count: compact(likes - 1) })
                : t("feed.likedByOne", { name: post.likedBy })
            }
          />
        </View>
      ) : null}
    </View>
  );
}

export const PostCard = memo(PostCardImpl);

// A trip swipes through its cover and then every stop; a moment is a single photo
function slidesFor(post: FeedPost): Slide[] {
  const cover = { key: "cover", uri: post.imageUrl, label: post.place.name };
  if (postKind(post) !== "trip") return [cover];
  // Posts made in the app use their first stop photo as the cover; don't show it twice
  const stops = post.stops.filter((s) => s.imageUrl !== post.imageUrl);
  return [cover, ...stops.map((s) => ({ key: s.id, uri: s.imageUrl, label: s.name }))];
}

// White label pinned over the photo (category, stop, trip length)
const BADGE = "absolute max-w-[75%] flex-row items-center gap-[5px] rounded-xl px-2.5 py-[5px]";
const BADGE_TEXT = "shrink text-xs font-bold text-ink";

function MediaBadges({ post, index }: { post: FeedPost; index: number }) {
  const isTrip = postKind(post) === "trip";
  const extraStops = post.stops.filter((s) => s.imageUrl !== post.imageUrl);
  const total = isTrip ? extraStops.length + 1 : 1;
  const stop = isTrip && index > 0 ? extraStops[index - 1] : undefined;

  return (
    <>
      <View className={cn(BADGE, "left-3 top-3 bg-white/90")}>
        <Text className={BADGE_TEXT}>{t(`feed.categories.${post.category}`)}</Text>
      </View>
      {total > 1 ? (
        <View className={cn(BADGE, "right-3 top-3 bg-ink/60")}>
          <Text className="text-xs font-bold text-white">
            {index + 1}/{total}
          </Text>
        </View>
      ) : null}
      {stop ? (
        <View className={cn(BADGE, "bottom-3 left-3 bg-white/90")}>
          <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-deep-green">
            <Text className="text-[11px] font-bold text-white">{post.stops.indexOf(stop) + 1}</Text>
          </View>
          <Text className={BADGE_TEXT} numberOfLines={1}>{stop.name}</Text>
        </View>
      ) : isTrip ? (
        <View className={cn(BADGE, "bottom-3 left-3 bg-white/90")}>
          <Ionicons name="map" size={13} color={colors.deepGreen} />
          <Text className={BADGE_TEXT}>
            {post.tripDays ? `${t("feed.tripDays", { count: post.tripDays })} · ` : ""}
            {stopsLabel(post.stops.length, true)}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function QuestionBody({ post, commentCount, onOpen }: { post: FeedPost; commentCount: number; onOpen: () => void }) {
  const answerers = post.commenters ?? [];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("feed.openPost")}
      className="mx-3 mt-3 gap-3 rounded-[18px] bg-lime-tint p-4.5 active:opacity-75"
    >
      <Ionicons name="chatbubbles" size={26} color={colors.limeGreen} />
      <Text className="text-[19px] font-bold leading-[26px] text-ink">{post.caption}</Text>
      <View className="self-start rounded-xl bg-white px-2.5 py-[5px]">
        <Text className="text-xs font-bold text-deep-green">
          {flagEmoji(post.place.countryCode)} {post.place.name}, {post.place.country}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center gap-3">
        <View className="flex-1">
          <FaceStack names={answerers} text={t("feed.answers", { count: commentCount })} />
        </View>
        <View className="rounded-2xl bg-deep-green px-4 py-2">
          <Text className="text-[13px] font-bold text-white">{t("feed.answer")}</Text>
        </View>
      </View>
    </Pressable>
  );
}
