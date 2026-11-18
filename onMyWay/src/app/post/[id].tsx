import { useMemo, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import { compactNumber, flagEmoji, timeAgo, stopsLabel } from "../../lib/format";
import { getPostById, isByUser, postKind, type FeedComment } from "../../lib/feed";
import { deletePost, fetchComments } from "../../lib/postsApi";
import { useQuery } from "../../lib/cache";
import { useAfterTransition } from "../../lib/hooks";
import { useFollowing, usePostState } from "../../lib/postStore";
import { useTripRecorder } from "../../lib/tripRecorder";
import { usePost } from "../../lib/usePost";
import { cn } from "../../lib/cn";
import { colors } from "../../lib/theme";
import { Avatar } from "../../components/Avatar";
import { FaceStack } from "../../components/FaceStack";
import { AvatarFrame } from "../../components/AvatarFrame";
import { useAuthorFrame } from "../../lib/rewards";
import { openProfile } from "../../lib/communityApi";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TripMap } from "../../components/TripMap";
import { TripStops } from "../../components/TripStops";
import { AnimatedScrollView, AnimatedText, AnimatedView, Img } from "../../components/ui";

const NO_COMMENTS: FeedComment[] = [];

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { post, missing } = usePost(Number(id));
  if (post) return <PostDetail postId={post.id} />;
  return missing ? <NotFound /> : <Loading />;
}

function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color={colors.deepGreen} />
    </View>
  );
}

function PostDetail({ postId }: { postId: number }) {
  const post = getPostById(postId)!;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { liked, saved, likes, wantToGo, newComments, toggleLike, toggleSave, addComment } = usePostState(post);
  const isMine = isByUser(post, user);
  const frame = useAuthorFrame(post.author, isMine);
  // Comments seen before show at once when the post is opened again
  const loadedComments = useQuery(`comments:${post.id}`, () => fetchComments(post.id)).data ?? NO_COMMENTS;
  // The route map (a WebView) is built once the screen has slid in
  const showMap = useAfterTransition();
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  // The comment being answered from the composer, and threads whose older replies are shown
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const { isFollowing, toggleFollow } = useFollowing(post.author, post.followingAuthor);
  const kind = postKind(post);
  // A trip shows its route; a moment shows where it was taken; a question has no map
  const hasMap = kind !== "question" && post.stops.length > 0;
  const recorder = useTripRecorder();
  const tripRunning = recorder.run?.postId === post.id;
  const goLabel = tripRunning ? t("trip.continue") : kind === "trip" ? t("post.goOnTrip") : t("post.getDirections");
  // Trips and single places both open the in-app map, so the kilometres get recorded
  const go = () => {
    setMapOpen(false);
    router.push({ pathname: "/trip/[id]", params: { id: String(post.id) } });
  };
  const mapSubtitle = kind === "trip" ? stopsLabel(post.stops.length) : post.place.country;

  // Top bar: buttons stay fixed; its white background and title fade in once the hero scrolls away
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const barHeight = insets.top + 58;
  // Questions without a photo start right under the top bar
  const heroHeight = post.imageUrl ? (width * 5) / 4 : barHeight;
  const barOpacity = scrollY.interpolate({
    inputRange: [heroHeight - barHeight - 80, heroHeight - barHeight - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const comments = useMemo(() => {
    // Comments I just added may also be in the loaded list
    const added = new Set(newComments.map((c) => c.id));
    return [...loadedComments.filter((c) => !added.has(c.id)), ...newComments];
  }, [loadedComments, newComments]);
  const commentCount = Math.max(post.comments + newComments.length, comments.length);

  // Top-level comments in order, each with its replies underneath (a reply whose thread is gone shows on its own)
  const threads = useMemo(() => {
    const ids = new Set(comments.map((c) => c.id));
    const replies = new Map<string, FeedComment[]>();
    const roots: FeedComment[] = [];
    for (const c of comments) {
      if (c.parentId && ids.has(c.parentId)) replies.set(c.parentId, [...(replies.get(c.parentId) ?? []), c]);
      else roots.push(c);
    }
    return roots.map((root) => ({ root, replies: replies.get(root.id) ?? [] }));
  }, [comments]);

  const startReply = (c: FeedComment) => {
    setReplyTo({ id: c.id, name: c.author.name });
    inputRef.current?.focus();
  };

  // My own post: delete it (after confirming)
  const openMenu = () =>
    Alert.alert(t("post.more"), undefined, [
      {
        text: t("post.delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("post.deleteTitle"), t("post.deleteBody"), [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("post.delete"),
              style: "destructive",
              onPress: async () => {
                try {
                  await deletePost(post.id, user?.id);
                  router.back();
                } catch (e) {
                  Alert.alert(t("post.deleteFailed"), e instanceof Error ? e.message : t("common.genericError"));
                }
              },
            },
          ]),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);

  const share = () => {
    Share.share({ message: `${post.place.name}, ${post.place.country} — ${post.caption}` }).catch(() => {});
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      await addComment(text, replyTo?.id);
      // Keep the thread I just answered open so my reply is visible
      const thread = replyTo && threads.find((th) => th.root.id === replyTo.id || th.replies.some((r) => r.id === replyTo.id));
      if (thread) setExpanded((prev) => new Set(prev).add(thread.root.id));
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      Alert.alert(e instanceof Error ? e.message : t("common.genericError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior="padding">
      <AnimatedScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Img
          source={post.imageUrl || null}
          className="w-full bg-lime-tint"
          style={{ height: heroHeight }}
          contentFit="cover"
          transition={250}
          accessibilityLabel={post.place.name}
        />

        <View className="-mt-7 rounded-t-[28px] bg-white px-5 pt-6">
          <Text className="text-[26px] font-bold text-ink">{post.title ?? post.place.name}</Text>
          <Text className="mt-1 text-[15px] text-muted">
            {flagEmoji(post.place.countryCode)} {post.title ? [post.place.name, post.place.country].filter(Boolean).join(", ") : post.place.country}
          </Text>

          <View className="mt-3.5 flex-row flex-wrap gap-2">
            {post.verified ? <InfoChip icon="shield-checkmark" label={t("create.verifiedHere")} /> : null}
            <InfoChip icon="pricetag" label={t(`feed.categories.${post.category}`)} />
            {post.tripDays ? <InfoChip icon="map" label={t("feed.tripDays", { count: post.tripDays })} /> : null}
          </View>

          <View className="-ml-3 mt-3.5 flex-row items-center gap-2">
            <Pressable
              onPress={() => openProfile(post.author.id, user?.id)}
              accessibilityRole="button"
              accessibilityLabel={post.author.name}
              className="flex-1 flex-row items-center gap-2"
            >
              <AvatarFrame name={post.author.name} frame={frame} avatarSize={44} uri={post.author.avatarUrl} />
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-bold text-ink">{post.author.name}</Text>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {timeAgo(post.createdAt)}
                </Text>
              </View>
            </Pressable>
            {!isMine ? (
              <Pressable
                onPress={toggleFollow}
                accessibilityRole="button"
                accessibilityState={{ selected: isFollowing }}
                className={cn("flex-row items-center gap-1 rounded-[18px] px-4 py-2 active:bg-teal-green", isFollowing ? "bg-lime-tint" : "bg-deep-green")}
              >
                {isFollowing ? <Ionicons name="checkmark" size={16} color={colors.deepGreen} /> : null}
                <Text className={cn("text-sm font-bold", isFollowing ? "text-deep-green" : "text-white")}>
                  {isFollowing ? t("post.following") : t("post.follow")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {post.caption ? <Text className="mt-3.5 text-base leading-6 text-ink">{post.caption}</Text> : null}

          <View className="mt-4.5 flex-row gap-6">
            <Pressable
              onPress={toggleLike}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={liked ? t("feed.unlike") : t("feed.like")}
              accessibilityState={{ selected: liked }}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons name={liked ? "heart" : "heart-outline"} size={26} color={liked ? colors.heart : colors.inkBlack} />
              <Text className="text-[15px] text-ink">{compactNumber(likes)}</Text>
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="chatbubble-outline" size={23} color={colors.inkBlack} />
              <Text className="text-[15px] text-ink">{compactNumber(commentCount)}</Text>
            </View>
          </View>

          {hasMap ? (
            <>
              <Divider />

              <View className="mb-3">
                <Text className={SECTION_TITLE}>
                  {kind === "trip" ? t("post.tripRoute") : t("post.location")}
                  {kind === "trip" ? <Text className="font-normal text-muted"> · {stopsLabel(post.stops.length)}</Text> : null}
                </Text>
              </View>

              <Pressable
                onPress={() => setMapOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t("post.openMap")}
                className="h-[220px] overflow-hidden rounded-[20px] bg-lime-tint"
              >
                {showMap ? <TripMap stops={post.stops} className="absolute inset-0" /> : null}
                <View className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-2xl bg-white/95 px-3 py-[7px]">
                  <Ionicons name="expand" size={16} color={colors.deepGreen} />
                  <Text className="text-[13px] font-bold text-deep-green">{t("post.openMap")}</Text>
                </View>
              </Pressable>

              <View className="mb-6 mt-3.5">
                <PrimaryButton title={goLabel} icon="navigate" onPress={go} />
                {post.tookTrip || wantToGo ? (
                  <View className="mt-3 items-center">
                    <FaceStack
                      names={post.commenters ?? []}
                      text={[
                        post.tookTrip ? t("post.tookTrip", { count: compactNumber(post.tookTrip) }) : "",
                        wantToGo ? t("post.wantToGoCount", { count: compactNumber(wantToGo) }) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </View>
                ) : null}
              </View>

              {kind === "trip" ? <TripStops stops={post.stops} /> : null}
            </>
          ) : null}

          <Divider />

          <Text className={SECTION_TITLE}>
            {kind === "question" ? t("post.answers") : t("post.comments")}
            <Text className="font-normal text-muted"> · {compactNumber(commentCount)}</Text>
          </Text>

          {comments.length === 0 ? (
            <Text className="text-sm text-muted">{t("post.noComments")}</Text>
          ) : (
            threads.map(({ root, replies }) => {
              // Long conversations show the latest replies; older ones are one tap away
              const open = expanded.has(root.id) || replies.length <= VISIBLE_REPLIES;
              const shown = open ? replies : replies.slice(-VISIBLE_REPLIES);
              const hidden = replies.length - shown.length;
              return (
                <View key={root.id}>
                  <CommentRow comment={root} onReply={startReply} />
                  {hidden > 0 ? (
                    <Pressable
                      onPress={() => setExpanded((prev) => new Set(prev).add(root.id))}
                      accessibilityRole="button"
                      hitSlop={6}
                      className="ml-[46px] flex-row items-center gap-2 py-1.5"
                    >
                      <View className="h-0.5 w-6 bg-muted" />
                      <Text className="text-[13px] font-bold text-muted">
                        {hidden === 1 ? t("post.viewRepliesOne") : t("post.viewReplies", { count: hidden })}
                      </Text>
                    </Pressable>
                  ) : null}
                  {shown.map((reply) => (
                    <CommentRow
                      key={reply.id}
                      comment={reply}
                      onReply={startReply}
                      reply
                      // @name only when it answers someone other than the thread starter
                      mention={reply.replyTo && reply.replyTo.id !== root.author.id ? reply.replyTo.name : undefined}
                    />
                  ))}
                </View>
              );
            })
          )}
        </View>
      </AnimatedScrollView>

      {/* Buttons stay fixed; the white bar and title fade in once the hero scrolls away */}
      <View className="absolute left-0 right-0 top-0 flex-row items-start gap-2.5 px-4" style={{ height: barHeight, paddingTop: insets.top + 8 }}>
        <AnimatedView className="absolute inset-0 border-b border-line bg-white" style={{ opacity: barOpacity }} />
        <RoundButton icon="chevron-back" label={t("post.back")} onPress={() => router.back()} />
        <AnimatedText className="h-[42px] flex-1 text-[17px] font-bold leading-[42px] text-ink" style={{ opacity: barOpacity }} numberOfLines={1}>
          {post.title ?? post.place.name}
        </AnimatedText>
        <RoundButton icon="paper-plane-outline" label={t("feed.share")} onPress={share} />
        {isMine ? (
          <RoundButton icon="ellipsis-horizontal" label={t("post.more")} onPress={openMenu} />
        ) : (
          <RoundButton
            icon={saved ? "flag" : "flag-outline"}
            color={saved ? colors.deepGreen : colors.inkBlack}
            label={saved ? t("feed.onMyList") : t("feed.wantToGo")}
            onPress={toggleSave}
          />
        )}
      </View>

      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <View className="flex-1 bg-lime-tint">
          <TripMap stops={post.stops} interactive className="absolute inset-0" />
          <View className="absolute left-4 right-4 flex-row items-center gap-3" style={{ top: insets.top + 8 }}>
            <RoundButton icon="close" label={t("post.closeMap")} onPress={() => setMapOpen(false)} />
            <View className="flex-1 rounded-[21px] bg-white/95 px-4 py-2">
              <Text className="text-base font-bold text-ink" numberOfLines={1}>{post.title ?? post.place.name}</Text>
              <Text className="text-xs text-muted">{mapSubtitle}</Text>
            </View>
          </View>
          <View className="absolute bottom-0 left-4 right-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <PrimaryButton title={goLabel} icon="navigate" onPress={go} />
          </View>
        </View>
      </Modal>

      {replyTo ? (
        <View className="flex-row items-center gap-2 border-t border-line bg-soft-gray px-4 py-2">
          <Text className="flex-1 text-[13px] text-muted" numberOfLines={1}>
            {t("post.replyingTo")} <Text className="font-bold text-ink">{replyTo.name}</Text>
          </Text>
          <Pressable onPress={() => setReplyTo(null)} accessibilityRole="button" accessibilityLabel={t("post.cancelReply")} hitSlop={10}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-end gap-2.5 border-t border-line bg-white px-4 pt-2.5" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {user ? <Avatar name={user.name} size={36} uri={user.avatarUrl} /> : null}
        <TextInput
          ref={inputRef}
          className="max-h-[110px] min-h-10 flex-1 rounded-[20px] bg-soft-gray px-4 py-2.5 text-[15px] text-ink"
          value={draft}
          onChangeText={setDraft}
          placeholder={
            replyTo ? t("post.replyPlaceholder", { name: replyTo.name }) : kind === "question" ? t("post.addAnswer") : t("post.addComment")
          }
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.tealGreen}
          cursorColor={colors.deepGreen}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel={t("post.send")}
          className={cn("h-10 w-10 items-center justify-center rounded-full bg-deep-green active:bg-teal-green", !draft.trim() && "opacity-40")}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const VISIBLE_REPLIES = 2;
const SECTION_TITLE = "mb-1.5 text-lg font-bold text-ink";

function Divider() {
  return <View className="my-4.5 h-px bg-line" />;
}

function CommentRow({
  comment,
  onReply,
  reply = false,
  mention,
}: {
  comment: FeedComment;
  onReply: (comment: FeedComment) => void;
  reply?: boolean;
  mention?: string;
}) {
  const { user } = useAuth();
  const openAuthor = () => openProfile(comment.author.id, user?.id);
  return (
    <View className={cn("flex-row gap-3 py-2.5", reply && "ml-[46px] py-1.5")}>
      <Pressable onPress={openAuthor} accessibilityRole="button" accessibilityLabel={comment.author.name} hitSlop={4}>
        <Avatar name={comment.author.name} size={reply ? 28 : 34} uri={comment.author.avatarUrl} />
      </Pressable>
      <View className="flex-1 gap-[3px]">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-sm font-bold text-ink" onPress={openAuthor}>{comment.author.name}</Text>
          <Text className="text-xs text-muted">{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text className="text-[15px] leading-[21px] text-ink">
          {mention ? <Text className="font-bold text-deep-green">@{mention} </Text> : null}
          {comment.text}
        </Text>
        <Pressable onPress={() => onReply(comment)} accessibilityRole="button" hitSlop={8} className="self-start pt-0.5">
          <Text className="text-[13px] font-bold text-muted">{t("post.reply")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

/** Translucent round button floating over the photo / map */
function RoundButton({
  icon,
  label,
  onPress,
  color = colors.inkBlack,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="h-[42px] w-[42px] items-center justify-center rounded-full border border-line bg-white/90 active:bg-soft-gray"
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

function InfoChip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-2xl bg-lime-tint px-3 py-[7px]">
      <Ionicons name={icon} size={14} color={colors.deepGreen} />
      <Text className="text-[13px] font-bold text-deep-green">{label}</Text>
    </View>
  );
}

function NotFound() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white" style={{ paddingTop: insets.top }}>
      <Ionicons name="compass" size={56} color={colors.limeGreen} />
      <Text className="text-[17px] font-bold text-ink">{t("post.notFound")}</Text>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
        <Text className="text-base font-bold text-teal-green">{t("post.back")}</Text>
      </Pressable>
    </View>
  );
}
