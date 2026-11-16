import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import {
  fetchLeaderboard,
  fetchSuggestedTravelers,
  fetchTravelers,
  openProfile,
  type Leaderboard,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type SuggestedTraveler,
  type Traveler,
} from "../../lib/communityApi";
import { compactNumber, flagEmoji } from "../../lib/format";
import type { FrameId } from "../../lib/rewards";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { colors, font, radius } from "../../lib/theme";
import { AvatarFrame } from "../../components/AvatarFrame";
import { FollowButton } from "../../components/FollowButton";

type Section = "travelers" | "leaderboard";

export default function CommunityScreen() {
  const [section, setSection] = useState<Section>("travelers");
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("community.title")}</Text>
        <View style={styles.segment}>
          {(["travelers", "leaderboard"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSection(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === s }}
              style={[styles.segmentItem, section === s && styles.segmentActive]}
            >
              <Ionicons
                name={s === "travelers" ? "people" : "trophy"}
                size={16}
                color={section === s ? colors.white : colors.deepGreen}
              />
              <Text style={[styles.segmentText, section === s && styles.segmentTextActive]}>{t(`community.${s}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {section === "travelers" ? <TravelersSection /> : <LeaderboardSection />}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Travelers: search, people to follow, everyone
// ---------------------------------------------------------------------------
function TravelersSection() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [travelers, setTravelers] = useState<Traveler[] | null>(null);
  const [suggested, setSuggested] = useState<SuggestedTraveler[]>([]);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const q = query.trim();
  const latestQuery = useRef(q);
  latestQuery.current = q;

  const load = useCallback(async (search: string) => {
    const [list, sug] = await Promise.allSettled([fetchTravelers(search), search ? Promise.resolve(null) : fetchSuggestedTravelers()]);
    if (list.status === "fulfilled") setTravelers(list.value);
    if (sug.status === "fulfilled" && sug.value) setSuggested(sug.value);
    setFailed(list.status === "rejected");
  }, []);

  // Search as you type, a moment after the last key
  useEffect(() => {
    const timer = setTimeout(() => load(q), q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, load]);

  // Fresh follow state when coming back from a profile
  useFocusEffect(
    useCallback(() => {
      load(latestQuery.current);
    }, [load])
  );

  const reload = async () => {
    setRefreshing(true);
    await load(q);
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={onScrollHideTabBar}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
    >
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("community.search")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={colors.tealGreen}
          cursorColor={colors.deepGreen}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel={t("common.cancel")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {failed ? <Text style={styles.error}>{t("community.loadFailed")}</Text> : null}

      {!q && suggested.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t("community.suggested")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedRow}>
            {suggested.map((s) => (
              <SuggestedCard key={s.id} traveler={s} myId={user?.id} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>{q ? t("community.results") : t("community.allTravelers")}</Text>
      {travelers === null ? (
        <ActivityIndicator color={colors.deepGreen} style={styles.loading} />
      ) : travelers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t("community.noResults")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {travelers.map((tr) => (
            <TravelerRow key={tr.id} traveler={tr} myId={user?.id} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SuggestedCard({ traveler, myId }: { traveler: SuggestedTraveler; myId?: number }) {
  const r = traveler.reason;
  const reason =
    r.type === "friends" ? t("community.reason.friends", { count: r.count }) : t(`community.reason.${r.type}`);
  return (
    <Pressable
      onPress={() => openProfile(traveler.id, myId)}
      accessibilityRole="button"
      accessibilityLabel={traveler.name}
      style={({ pressed }) => [styles.suggestedCard, pressed && styles.pressed]}
    >
      <AvatarFrame name={traveler.name} frame={traveler.frame as FrameId} avatarSize={56} uri={traveler.avatarUrl} />
      <Text style={styles.suggestedName} numberOfLines={1}>{traveler.name}</Text>
      <Text style={styles.muted} numberOfLines={1}>
        {traveler.countryCode ? `${flagEmoji(traveler.countryCode)} ` : ""}
        {traveler.country ?? ""}
      </Text>
      <Text style={styles.reason} numberOfLines={2}>{reason}</Text>
      <FollowButton user={traveler} initial={traveler.following} compact />
    </Pressable>
  );
}

function TravelerRow({ traveler, myId }: { traveler: Traveler; myId?: number }) {
  return (
    <Pressable
      onPress={() => openProfile(traveler.id, myId)}
      accessibilityRole="button"
      accessibilityLabel={traveler.name}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AvatarFrame name={traveler.name} frame={traveler.frame as FrameId} avatarSize={44} uri={traveler.avatarUrl} />
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>
          {traveler.name}
          {traveler.countryCode ? `  ${flagEmoji(traveler.countryCode)}` : ""}
        </Text>
        {traveler.bio ? <Text style={styles.muted} numberOfLines={1}>{traveler.bio}</Text> : null}
        <Text style={styles.small}>{t("community.followers", { count: compactNumber(traveler.followers) })}</Text>
      </View>
      <FollowButton user={traveler} initial={traveler.following} compact />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard: real kilometres, countries and trips per period
// ---------------------------------------------------------------------------
const METRICS: LeaderboardMetric[] = ["km", "countries", "trips"];
const PERIODS: LeaderboardPeriod[] = ["week", "month", "all"];
const MEDALS = [colors.gold, "#A7B1B5", "#C98A5A"];

function LeaderboardSection() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<LeaderboardMetric>("km");
  const [period, setPeriod] = useState<LeaderboardPeriod>("month");
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await fetchLeaderboard(metric, period));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [metric, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reload = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Only show the board that matches the selected tabs (no flash of the previous one)
  const current = board && board.metric === metric && board.period === period ? board : null;
  const meInTop = current?.me && current.entries.some((e) => e.user.id === current.me!.user.id);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.boardContent]}
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
      >
        <View style={styles.chips}>
          {METRICS.map((m) => (
            <Chip key={m} label={t(`community.metric.${m}`)} active={metric === m} onPress={() => setMetric(m)} />
          ))}
        </View>
        <View style={styles.periods}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === p }}
              style={[styles.period, period === p && styles.periodActive]}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{t(`community.period.${p}`)}</Text>
            </Pressable>
          ))}
        </View>

        {failed ? <Text style={styles.error}>{t("community.loadFailed")}</Text> : null}

        {!current ? (
          failed ? null : <ActivityIndicator color={colors.deepGreen} style={styles.loading} />
        ) : current.entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t("community.emptyBoard")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {current.entries.map((e) => (
              <RankRow key={e.user.id} entry={e} metric={metric} mine={e.user.id === user?.id} myId={user?.id} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* My standing stays visible when I'm not in the list (or not ranked at all) */}
      {current && !meInTop ? (
        <View style={styles.meBar}>
          {current.me ? (
            <RankRow entry={current.me} metric={metric} mine myId={user?.id} />
          ) : (
            <View style={styles.notRanked}>
              <Text style={styles.rowName}>{t("community.notRanked")}</Text>
              <Text style={styles.muted}>{t(`community.notRankedHint.${metric}`)}</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function RankRow({ entry, metric, mine, myId }: { entry: LeaderboardEntry; metric: LeaderboardMetric; mine: boolean; myId?: number }) {
  const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;
  const value = metric === "km" ? compactNumber(Math.round(entry.value)) : String(entry.value);
  return (
    <Pressable
      onPress={() => openProfile(entry.user.id, myId)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.rank}. ${entry.user.name}, ${value} ${t(`community.unit.${metric}`)}`}
      style={({ pressed }) => [styles.row, mine && styles.rowMine, pressed && styles.pressed]}
    >
      <View style={[styles.rank, medal ? { backgroundColor: medal } : null]}>
        <Text style={[styles.rankText, medal ? styles.rankTextMedal : null]}>{entry.rank}</Text>
      </View>
      <AvatarFrame name={entry.user.name} frame={entry.user.frame as FrameId} avatarSize={40} uri={entry.user.avatarUrl} />
      <Text style={[styles.rowName, styles.flex]} numberOfLines={1}>
        {mine ? `${entry.user.name} (${t("community.you")})` : entry.user.name}
        {entry.user.countryCode ? `  ${flagEmoji(entry.user.countryCode)}` : ""}
      </Text>
      <View style={styles.score}>
        <Text style={styles.scoreValue}>{value}</Text>
        <Text style={styles.small}>{t(`community.unit.${metric}`)}</Text>
      </View>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  title: { color: colors.inkBlack, fontSize: 28, fontWeight: font.bold },
  segment: { flexDirection: "row", padding: 4, borderRadius: 22, backgroundColor: colors.limeTint },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 18,
  },
  segmentActive: { backgroundColor: colors.deepGreen },
  segmentText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },
  segmentTextActive: { color: colors.white },
  content: { padding: 16, paddingBottom: 120, gap: 14 },
  boardContent: { paddingBottom: 110 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.softGray,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.inkBlack, fontSize: 15 },
  sectionTitle: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold, marginTop: 4 },
  error: { color: colors.error, fontSize: 13 },
  loading: { marginTop: 24 },
  muted: { color: colors.textMuted, fontSize: 13 },
  small: { color: colors.textMuted, fontSize: 12 },
  suggestedRow: { gap: 12 },
  suggestedCard: {
    width: 156,
    alignItems: "center",
    gap: 4,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.softGray,
  },
  suggestedName: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold, marginTop: 4 },
  reason: { color: colors.tealGreen, fontSize: 12, textAlign: "center", minHeight: 32 },
  list: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: radius.md },
  rowMine: { backgroundColor: colors.limeTint },
  rowName: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  empty: { alignItems: "center", gap: 8, paddingVertical: 28, borderRadius: radius.md, backgroundColor: colors.softGray },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { borderColor: colors.deepGreen, backgroundColor: colors.deepGreen },
  chipText: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  chipTextActive: { color: colors.white },
  periods: { flexDirection: "row", borderRadius: radius.md, backgroundColor: colors.softGray, padding: 3 },
  period: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 11 },
  periodActive: { backgroundColor: colors.white },
  periodText: { color: colors.textMuted, fontSize: 13, fontWeight: font.bold },
  periodTextActive: { color: colors.inkBlack },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.softGray,
  },
  rankText: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  rankTextMedal: { color: colors.white },
  score: { alignItems: "flex-end" },
  scoreValue: { color: colors.deepGreen, fontSize: 17, fontWeight: font.bold },
  meBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  notRanked: { padding: 10, gap: 2 },
});
