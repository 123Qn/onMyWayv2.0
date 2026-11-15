import { memo } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { compactNumber as compact, flagEmoji, timeAgo } from "../lib/format";
import { getMockComments, postKind, type FeedPost } from "../lib/mockFeed";
import { useFollowing, usePostState } from "../lib/postStore";
import { colors, font, radius } from "../lib/theme";
import { Avatar } from "./Avatar";
import { FaceStack } from "./FaceStack";
import { PhotoCarousel, type Slide } from "./PhotoCarousel";

function PostCardImpl({ post }: { post: FeedPost }) {
  const { liked, saved, newComments, toggleLike, toggleSave } = usePostState(post.id);
  const { isFollowing, toggleFollow } = useFollowing(post.author.name);
  const kind = postKind(post);
  const likes = post.likes + (liked ? 1 : 0);
  const commentCount = post.comments + newComments.length;
  const openPost = () => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } });

  const share = () => {
    Share.share({ message: `${post.place.name}, ${post.place.country} — ${post.caption}` }).catch(() => {});
  };

  // "with Mai Hoang +1" when tagged with friends, otherwise what kind of post it is
  const companions = post.companions ?? [];
  const subtitle =
    companions.length === 0
      ? t(`feed.kind.${kind}`)
      : companions.length === 1
        ? t("feed.withOne", { name: companions[0] })
        : t("feed.withMany", { name: companions[0], count: companions.length - 1 });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.author.name} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.authorLine} numberOfLines={1}>
            <Text style={styles.author}>{post.author.name}</Text>
            <Text style={styles.subtitle}> {subtitle}</Text>
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={13} color={colors.tealGreen} />
            <Text style={styles.meta} numberOfLines={1}>
              {post.place.name} · {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={toggleFollow}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: isFollowing }}
          style={[styles.follow, isFollowing && styles.followActive]}
        >
          <Text style={[styles.followText, isFollowing && styles.followTextActive]}>
            {isFollowing ? t("post.following") : t("post.follow")}
          </Text>
        </Pressable>
      </View>

      {kind === "question" ? (
        <QuestionBody post={post} commentCount={commentCount} onOpen={openPost} />
      ) : (
        <>
          <View style={styles.media}>
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
            <Text style={styles.caption} numberOfLines={3}>{post.caption}</Text>
          </Pressable>
        </>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={toggleLike}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? t("feed.unlike") : t("feed.like")}
          accessibilityState={{ selected: liked }}
          style={styles.action}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? colors.heart : colors.inkBlack} />
          <Text style={styles.count}>{compact(likes)}</Text>
        </Pressable>

        <Pressable
          onPress={openPost}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t("feed.comments")}: ${commentCount}`}
          style={styles.action}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.inkBlack} />
          <Text style={styles.count}>{compact(commentCount)}</Text>
        </Pressable>

        <Pressable
          onPress={share}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("feed.share")}
          style={styles.action}
        >
          <Ionicons name="paper-plane-outline" size={22} color={colors.inkBlack} />
        </Pressable>

        <View style={styles.spacer} />

        {kind !== "question" ? (
          <Pressable
            onPress={toggleSave}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            style={({ pressed }) => [styles.want, saved && styles.wantActive, pressed && styles.pressed]}
          >
            <Ionicons name={saved ? "flag" : "flag-outline"} size={16} color={saved ? colors.white : colors.deepGreen} />
            <Text style={[styles.wantText, saved && styles.wantTextActive]}>
              {saved ? t("feed.onMyList") : t("feed.wantToGo")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {post.likedBy ? (
        <View style={styles.likedBy}>
          <FaceStack
            names={[post.likedBy, ...companions]}
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
  return [cover, ...post.stops.map((s) => ({ key: s.id, uri: s.imageUrl, label: s.name }))];
}

function MediaBadges({ post, index }: { post: FeedPost; index: number }) {
  const isTrip = postKind(post) === "trip";
  const total = isTrip ? post.stops.length + 1 : 1;
  const stop = index > 0 ? post.stops[index - 1] : undefined;

  return (
    <>
      <View style={[styles.badge, styles.badgeTopLeft]}>
        <Text style={styles.badgeText}>{t(`feed.categories.${post.category}`)}</Text>
      </View>
      {total > 1 ? (
        <View style={[styles.badge, styles.badgeDark, styles.badgeTopRight]}>
          <Text style={styles.badgeTextLight}>
            {index + 1}/{total}
          </Text>
        </View>
      ) : null}
      {stop ? (
        <View style={[styles.badge, styles.badgeBottom]}>
          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>{index}</Text>
          </View>
          <Text style={styles.badgeText} numberOfLines={1}>{stop.name}</Text>
        </View>
      ) : isTrip ? (
        <View style={[styles.badge, styles.badgeBottom]}>
          <Ionicons name="map" size={13} color={colors.deepGreen} />
          <Text style={styles.badgeText}>
            {post.tripDays ? `${t("feed.tripDays", { count: post.tripDays })} · ` : ""}
            {t("feed.stopsShort", { count: post.stops.length })}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function QuestionBody({ post, commentCount, onOpen }: { post: FeedPost; commentCount: number; onOpen: () => void }) {
  const answerers = getMockComments(post).map((c) => c.author.name);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("feed.openPost")}
      style={({ pressed }) => [styles.question, pressed && styles.pressed]}
    >
      <Ionicons name="chatbubbles" size={26} color={colors.limeGreen} />
      <Text style={styles.questionText}>{post.caption}</Text>
      <View style={styles.questionPlace}>
        <Text style={styles.questionPlaceText}>
          {flagEmoji(post.place.countryCode)} {post.place.name}, {post.place.country}
        </Text>
      </View>
      <View style={styles.questionFooter}>
        <View style={styles.questionAnswers}>
          <FaceStack names={answerers} text={t("feed.answers", { count: commentCount })} />
        </View>
        <View style={styles.answerButton}>
          <Text style={styles.answerText}>{t("feed.answer")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 14,
    marginHorizontal: 16,
    shadowColor: colors.inkBlack,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  headerText: { flex: 1, gap: 2 },
  authorLine: { color: colors.inkBlack, fontSize: 15 },
  author: { fontWeight: font.bold },
  subtitle: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { flexShrink: 1, color: colors.textMuted, fontSize: 13, fontWeight: font.regular },
  follow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.limeTint,
  },
  followActive: { backgroundColor: colors.softGray },
  followText: { color: colors.deepGreen, fontSize: 13, fontWeight: font.bold },
  followTextActive: { color: colors.textMuted },
  media: { marginTop: 12, marginHorizontal: 12 },
  badge: {
    position: "absolute",
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "75%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  badgeTopLeft: { top: 12 },
  badgeTopRight: { top: 12, left: undefined, right: 12 },
  badgeBottom: { bottom: 12 },
  badgeDark: { backgroundColor: "rgba(27,43,40,0.6)" },
  badgeText: { flexShrink: 1, color: colors.inkBlack, fontSize: 12, fontWeight: font.bold },
  badgeTextLight: { color: colors.white, fontSize: 12, fontWeight: font.bold },
  stopNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
  },
  stopNumberText: { color: colors.white, fontSize: 11, fontWeight: font.bold },
  caption: {
    marginTop: 10,
    paddingHorizontal: 16,
    color: colors.inkBlack,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: font.regular,
  },
  question: {
    marginTop: 12,
    marginHorizontal: 12,
    padding: 18,
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.limeTint,
  },
  questionText: { color: colors.inkBlack, fontSize: 19, lineHeight: 26, fontWeight: font.bold },
  questionPlace: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  questionPlaceText: { color: colors.deepGreen, fontSize: 12, fontWeight: font.bold },
  questionFooter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  questionAnswers: { flex: 1 },
  answerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.deepGreen,
  },
  answerText: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  actions: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 12, paddingHorizontal: 16 },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { color: colors.inkBlack, fontSize: 14, fontWeight: font.regular },
  spacer: { flex: 1 },
  want: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.limeGreen,
  },
  wantActive: { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen },
  wantText: { color: colors.deepGreen, fontSize: 13, fontWeight: font.bold },
  wantTextActive: { color: colors.white },
  pressed: { opacity: 0.75 },
  likedBy: { marginTop: 12, paddingHorizontal: 16 },
});
