import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import { compactNumber, flagEmoji, timeAgo } from "../../lib/format";
import { getPostById, isByUser, postKind, type FeedComment, type TripStop } from "../../lib/feed";
import { fetchComments } from "../../lib/postsApi";
import { useFollowing, usePostState } from "../../lib/postStore";
import { useTripRecorder } from "../../lib/tripRecorder";
import { colors, font, radius } from "../../lib/theme";
import { Avatar } from "../../components/Avatar";
import { FaceStack } from "../../components/FaceStack";
import { AvatarFrame } from "../../components/AvatarFrame";
import { useAuthorFrame } from "../../lib/rewards";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TripMap } from "../../components/TripMap";
import { TripStops } from "../../components/TripStops";

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = getPostById(Number(id));
  return post ? <PostDetail postId={post.id} /> : <NotFound />;
}

function PostDetail({ postId }: { postId: number }) {
  const post = getPostById(postId)!;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { liked, saved, likes, wantToGo, newComments, toggleLike, toggleSave, addComment } = usePostState(post);
  const isMine = isByUser(post, user);
  const frame = useAuthorFrame(post.author, isMine);
  const [loadedComments, setLoadedComments] = useState<FeedComment[]>([]);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const { isFollowing, toggleFollow } = useFollowing(post.author, post.followingAuthor);
  const kind = postKind(post);
  // A trip shows its route; a moment shows where it was taken; a question has no map
  const hasMap = kind !== "question" && post.stops.length > 0;
  const recorder = useTripRecorder();
  const tripRunning = recorder.run?.postId === post.id;
  const goLabel = kind === "trip" ? (tripRunning ? t("trip.continue") : t("post.goOnTrip")) : t("post.getDirections");
  // Trips open the in-app trip map; a single place still opens Google Maps
  const go = () => {
    if (kind === "trip") {
      setMapOpen(false);
      router.push({ pathname: "/trip/[id]", params: { id: String(post.id) } });
    } else openDirections(post.stops);
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

  useEffect(() => {
    fetchComments(post.id).then(setLoadedComments, () => {});
  }, [post.id]);

  const comments = useMemo(() => {
    // Comments I just added may also be in the loaded list
    const added = new Set(newComments.map((c) => c.id));
    return [...loadedComments.filter((c) => !added.has(c.id)), ...newComments];
  }, [loadedComments, newComments]);
  const commentCount = Math.max(post.comments + newComments.length, comments.length);

  const share = () => {
    Share.share({ message: `${post.place.name}, ${post.place.country} — ${post.caption}` }).catch(() => {});
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      await addComment(text);
      setDraft("");
    } catch (e) {
      Alert.alert(e instanceof Error ? e.message : t("common.genericError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={post.imageUrl || null}
          style={[styles.hero, { height: heroHeight }]}
          contentFit="cover"
          transition={250}
          accessibilityLabel={post.place.name}
        />

        <View style={styles.sheet}>
          <Text style={styles.placeName}>{post.title ?? post.place.name}</Text>
          <Text style={styles.country}>
            {flagEmoji(post.place.countryCode)} {post.title ? [post.place.name, post.place.country].filter(Boolean).join(", ") : post.place.country}
          </Text>

          <View style={styles.chips}>
            {post.verified ? <Chip icon="shield-checkmark" label={t("create.verifiedHere")} /> : null}
            <Chip icon="pricetag" label={t(`feed.categories.${post.category}`)} />
            {post.tripDays ? <Chip icon="map" label={t("feed.tripDays", { count: post.tripDays })} /> : null}
          </View>

          <View style={styles.authorRow}>
            <AvatarFrame name={post.author.name} frame={frame} avatarSize={44} />
            <View style={styles.authorText}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              <Text style={styles.muted} numberOfLines={1}>
                {timeAgo(post.createdAt)}
              </Text>
            </View>
            {!isMine ? (
            <Pressable
              onPress={toggleFollow}
              accessibilityRole="button"
              accessibilityState={{ selected: isFollowing }}
              style={({ pressed }) => [styles.follow, isFollowing && styles.followActive, pressed && styles.sendPressed]}
            >
              {isFollowing ? <Ionicons name="checkmark" size={16} color={colors.deepGreen} /> : null}
              <Text style={[styles.followText, isFollowing && styles.followTextActive]}>
                {isFollowing ? t("post.following") : t("post.follow")}
              </Text>
            </Pressable>
            ) : null}
          </View>

          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

          <View style={styles.statsRow}>
            <Pressable
              onPress={toggleLike}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={liked ? t("feed.unlike") : t("feed.like")}
              accessibilityState={{ selected: liked }}
              style={styles.stat}
            >
              <Ionicons name={liked ? "heart" : "heart-outline"} size={26} color={liked ? colors.heart : colors.inkBlack} />
              <Text style={styles.statText}>{compactNumber(likes)}</Text>
            </Pressable>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={23} color={colors.inkBlack} />
              <Text style={styles.statText}>{compactNumber(commentCount)}</Text>
            </View>
          </View>

          {hasMap ? (
            <>
              <View style={styles.divider} />

              <View style={styles.sectionHeader}>
                {kind === "trip" ? (
                  <Text style={styles.sectionTitle}>
                    {t("post.tripRoute")}{" "}
                    <Text style={styles.sectionCount}>· {stopsLabel(post.stops.length)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.sectionTitle}>{t("post.location")}</Text>
                )}
              </View>

              <Pressable
                onPress={() => setMapOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t("post.openMap")}
                style={styles.mapPreview}
              >
                <TripMap stops={post.stops} style={StyleSheet.absoluteFill} />
                <View style={styles.expandBadge}>
                  <Ionicons name="expand" size={16} color={colors.deepGreen} />
                  <Text style={styles.expandText}>{t("post.openMap")}</Text>
                </View>
              </Pressable>

              <View style={styles.goButton}>
                <PrimaryButton title={goLabel} icon="navigate" onPress={go} />
                {post.tookTrip || wantToGo ? (
                  <View style={styles.tookTrip}>
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

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {kind === "question" ? t("post.answers") : t("post.comments")}{" "}
            <Text style={styles.sectionCount}>· {compactNumber(commentCount)}</Text>
          </Text>

          {comments.length === 0 ? (
            <Text style={styles.muted}>{t("post.noComments")}</Text>
          ) : (
            comments.map((c) => <CommentRow key={c.id} comment={c} />)
          )}
        </View>
      </Animated.ScrollView>

      <View style={[styles.topBar, { height: barHeight, paddingTop: insets.top + 8 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.topBarBg, { opacity: barOpacity }]} />
        <RoundButton icon="chevron-back" label={t("post.back")} onPress={() => router.back()} />
        <Animated.Text style={[styles.topBarTitle, { opacity: barOpacity }]} numberOfLines={1}>
          {post.title ?? post.place.name}
        </Animated.Text>
        <RoundButton icon="paper-plane-outline" label={t("feed.share")} onPress={share} />
        <RoundButton
          icon={saved ? "flag" : "flag-outline"}
          color={saved ? colors.deepGreen : colors.inkBlack}
          label={saved ? t("feed.onMyList") : t("feed.wantToGo")}
          onPress={toggleSave}
        />
      </View>

      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <View style={styles.mapModal}>
          <TripMap stops={post.stops} interactive style={StyleSheet.absoluteFill} />
          <View style={[styles.mapModalTop, { top: insets.top + 8 }]}>
            <RoundButton icon="close" label={t("post.closeMap")} onPress={() => setMapOpen(false)} />
            <View style={styles.mapModalTitle}>
              <Text style={styles.mapModalTitleText} numberOfLines={1}>{post.title ?? post.place.name}</Text>
              <Text style={styles.mapModalSubtitle}>{mapSubtitle}</Text>
            </View>
          </View>
          <View style={[styles.mapModalBottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <PrimaryButton title={goLabel} icon="navigate" onPress={go} />
          </View>
        </View>
      </Modal>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {user ? <Avatar name={user.name} size={36} /> : null}
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={kind === "question" ? t("post.addAnswer") : t("post.addComment")}
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
          style={({ pressed }) => [
            styles.sendButton,
            !draft.trim() && styles.sendDisabled,
            pressed && styles.sendPressed,
          ]}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const stopsLabel = (n: number) => (n === 1 ? t("post.stopsCountOne") : t("post.stopsCount", { count: n }));

// Google Maps directions along the trip: first stop -> middle stops -> last stop.
// (The Android Maps app ignores waypoints unless an origin is given.)
// A single-stop trip gets directions from the user's current location.
function openDirections(stops: TripStop[]) {
  if (stops.length === 0) return;
  const coord = (s: TripStop) => encodeURIComponent(`${s.latitude},${s.longitude}`);
  let url = `https://www.google.com/maps/dir/?api=1&destination=${coord(stops[stops.length - 1])}`;
  if (stops.length > 1) {
    url += `&origin=${coord(stops[0])}`;
    const middle = stops.slice(1, -1);
    if (middle.length) url += `&waypoints=${middle.map(coord).join(encodeURIComponent("|"))}`;
  }
  Linking.openURL(url).catch(() => Alert.alert(t("post.mapsError")));
}

function CommentRow({ comment }: { comment: FeedComment }) {
  return (
    <View style={styles.comment}>
      <Avatar name={comment.author.name} size={34} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.author.name}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

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
      style={({ pressed }) => [styles.roundButton, pressed && styles.roundButtonPressed]}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

function Chip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={colors.deepGreen} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function NotFound() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.notFound, { paddingTop: insets.top }]}>
      <Ionicons name="compass" size={56} color={colors.limeGreen} />
      <Text style={styles.notFoundText}>{t("post.notFound")}</Text>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.link}>{t("post.back")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingBottom: 24 },
  hero: { width: "100%", backgroundColor: colors.limeTint },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
  },
  topBarBg: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    flex: 1,
    height: 42,
    lineHeight: 42,
    color: colors.inkBlack,
    fontSize: 17,
    fontWeight: font.bold,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  roundButtonPressed: { backgroundColor: colors.softGray },

  sheet: {
    marginTop: -28,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  placeName: { color: colors.inkBlack, fontSize: 26, fontWeight: font.bold },
  country: { color: colors.textMuted, fontSize: 15, fontWeight: font.regular, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.limeTint,
  },
  chipText: { color: colors.deepGreen, fontSize: 13, fontWeight: font.bold },

  authorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, marginLeft: -12 },
  authorText: { flex: 1, gap: 2 },
  follow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.deepGreen,
  },
  followActive: { backgroundColor: colors.limeTint },
  followText: { color: colors.white, fontSize: 14, fontWeight: font.bold },
  followTextActive: { color: colors.deepGreen },
  tookTrip: { marginTop: 12, alignItems: "center" },
  authorName: { color: colors.inkBlack, fontSize: 16, fontWeight: font.bold },
  muted: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
  caption: {
    color: colors.inkBlack,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: font.regular,
    marginTop: 14,
  },

  statsRow: { flexDirection: "row", gap: 24, marginTop: 18 },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { color: colors.inkBlack, fontSize: 15, fontWeight: font.regular },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 18 },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold, marginBottom: 6 },
  mapPreview: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.limeTint,
  },
  expandBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  expandText: { color: colors.deepGreen, fontSize: 13, fontWeight: font.bold },
  goButton: { marginTop: 14, marginBottom: 24 },
  mapModal: { flex: 1, backgroundColor: colors.limeTint },
  mapModalTop: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapModalTitle: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  mapModalTitleText: { color: colors.inkBlack, fontSize: 16, fontWeight: font.bold },
  mapModalSubtitle: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  mapModalBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
  },
  sectionCount: { color: colors.textMuted, fontWeight: font.regular },
  comment: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  commentBody: { flex: 1, gap: 3 },
  commentHeader: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  commentAuthor: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  commentTime: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  commentText: { color: colors.inkBlack, fontSize: 15, lineHeight: 21, fontWeight: font.regular },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    backgroundColor: colors.softGray,
    color: colors.inkBlack,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
  },
  sendDisabled: { opacity: 0.4 },
  sendPressed: { backgroundColor: colors.tealGreen },

  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.white },
  notFoundText: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  link: { color: colors.tealGreen, fontSize: 16, fontWeight: font.bold },
});
