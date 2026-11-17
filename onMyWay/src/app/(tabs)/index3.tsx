import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
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
import { cn } from "../../lib/cn";
import { compactNumber, flagEmoji } from "../../lib/format";
import { useFocusLoad, useRefresh } from "../../lib/hooks";
import type { FrameId } from "../../lib/rewards";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { colors } from "../../lib/theme";
import { AvatarFrame } from "../../components/AvatarFrame";
import { FollowButton } from "../../components/FollowButton";
import { Chip, EmptyState, Loading, Screen, SearchField, SectionTitle, SegmentedControl, UserRow } from "../../components/ui";

type Section = "travelers" | "leaderboard";

export default function CommunityScreen() {
  const [section, setSection] = useState<Section>("travelers");
  return (
    <Screen className="flex-1 bg-white" edges={["top"]}>
      <View className="gap-3 px-4 pt-2">
        <Text className="text-[28px] font-bold text-ink">{t("community.title")}</Text>
        <SegmentedControl
          value={section}
          onChange={setSection}
          options={[
            { value: "travelers", label: t("community.travelers"), icon: "people" },
            { value: "leaderboard", label: t("community.leaderboard"), icon: "trophy" },
          ]}
        />
      </View>
      {section === "travelers" ? <TravelersSection /> : <LeaderboardSection />}
    </Screen>
  );
}

const refreshControl = (refreshing: boolean, onRefresh: () => void) => (
  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />
);

// ---------------------------------------------------------------------------
// Travelers: search, people to follow, everyone
// ---------------------------------------------------------------------------
function TravelersSection() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [travelers, setTravelers] = useState<Traveler[] | null>(null);
  const [suggested, setSuggested] = useState<SuggestedTraveler[]>([]);
  const [failed, setFailed] = useState(false);
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
  useFocusLoad(() => load(latestQuery.current));
  const { refreshing, onRefresh } = useRefresh(() => load(latestQuery.current));

  return (
    <ScrollView
      contentContainerClassName="gap-3.5 p-4 pb-[120px]"
      keyboardShouldPersistTaps="handled"
      onScroll={onScrollHideTabBar}
      scrollEventThrottle={16}
      refreshControl={refreshControl(refreshing, onRefresh)}
    >
      <SearchField value={query} onChangeText={setQuery} placeholder={t("community.search")} />

      {failed ? <Text className="text-[13px] text-error">{t("community.loadFailed")}</Text> : null}

      {!q && suggested.length > 0 ? (
        <>
          <SectionTitle>{t("community.suggested")}</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {suggested.map((s) => (
              <SuggestedCard key={s.id} traveler={s} myId={user?.id} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionTitle>{q ? t("community.results") : t("community.allTravelers")}</SectionTitle>
      {travelers === null ? (
        <Loading />
      ) : travelers.length === 0 ? (
        <EmptyState icon="person-outline" text={t("community.noResults")} />
      ) : (
        <View className="gap-1.5">
          {travelers.map((tr) => (
            <UserRow
              key={tr.id}
              user={tr}
              lines={[tr.bio, t("community.followers", { count: compactNumber(tr.followers) })]}
              onPress={() => openProfile(tr.id, user?.id)}
              trailing={<FollowButton user={tr} initial={tr.following} compact />}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SuggestedCard({ traveler, myId }: { traveler: SuggestedTraveler; myId?: number }) {
  const r = traveler.reason;
  const reason = r.type === "friends" ? t("community.reason.friends", { count: r.count }) : t(`community.reason.${r.type}`);
  return (
    <Pressable
      onPress={() => openProfile(traveler.id, myId)}
      accessibilityRole="button"
      accessibilityLabel={traveler.name}
      className="w-[156px] items-center gap-1 rounded-md bg-soft-gray p-3.5 active:opacity-80"
    >
      <AvatarFrame name={traveler.name} frame={traveler.frame as FrameId} avatarSize={56} uri={traveler.avatarUrl} />
      <Text className="mt-1 text-[15px] font-bold text-ink" numberOfLines={1}>{traveler.name}</Text>
      <Text className="text-[13px] text-muted" numberOfLines={1}>
        {traveler.countryCode ? `${flagEmoji(traveler.countryCode)} ` : ""}
        {traveler.country ?? ""}
      </Text>
      <Text className="min-h-8 text-center text-xs text-teal-green" numberOfLines={2}>{reason}</Text>
      <FollowButton user={traveler} initial={traveler.following} compact />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard: real kilometres, countries and trips per period
// ---------------------------------------------------------------------------
const METRICS: LeaderboardMetric[] = ["km", "countries", "trips"];
const PERIODS: LeaderboardPeriod[] = ["week", "month", "all"];
// Gold, silver, bronze
const MEDALS = ["bg-gold", "bg-[#A7B1B5]", "bg-[#C98A5A]"];

function LeaderboardSection() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<LeaderboardMetric>("km");
  const [period, setPeriod] = useState<LeaderboardPeriod>("month");
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await fetchLeaderboard(metric, period));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [metric, period]);

  // On focus, and again whenever the metric or period changes
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  const { refreshing, onRefresh } = useRefresh(load);

  // Only show the board that matches the selected tabs (no flash of the previous one)
  const current = board && board.metric === metric && board.period === period ? board : null;
  const meInTop = current?.me && current.entries.some((e) => e.user.id === current.me!.user.id);

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="gap-3.5 p-4 pb-[110px]"
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        refreshControl={refreshControl(refreshing, onRefresh)}
      >
        <View className="flex-row gap-2">
          {METRICS.map((m) => (
            <Chip key={m} label={t(`community.metric.${m}`)} active={metric === m} onPress={() => setMetric(m)} />
          ))}
        </View>
        <SegmentedControl
          variant="subtle"
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ value: p, label: t(`community.period.${p}`) }))}
        />

        {failed ? <Text className="text-[13px] text-error">{t("community.loadFailed")}</Text> : null}

        {!current ? (
          failed ? null : <Loading />
        ) : current.entries.length === 0 ? (
          <EmptyState icon="trophy-outline" text={t("community.emptyBoard")} />
        ) : (
          <View className="gap-1.5">
            {current.entries.map((e) => (
              <RankRow key={e.user.id} entry={e} metric={metric} mine={e.user.id === user?.id} myId={user?.id} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* My standing stays visible when I'm not in the list (or not ranked at all) */}
      {current && !meInTop ? (
        <View className="absolute bottom-3 left-3 right-3 rounded-md bg-white p-1 shadow-lg">
          {current.me ? (
            <RankRow entry={current.me} metric={metric} mine myId={user?.id} />
          ) : (
            <View className="gap-0.5 p-2.5">
              <Text className="text-[15px] font-bold text-ink">{t("community.notRanked")}</Text>
              <Text className="text-[13px] text-muted">{t(`community.notRankedHint.${metric}`)}</Text>
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
    <UserRow
      user={entry.user}
      avatarSize={40}
      highlight={mine}
      label={mine ? `${entry.user.name} (${t("community.you")})` : undefined}
      onPress={() => openProfile(entry.user.id, myId)}
      leading={
        <View className={cn("h-[30px] w-[30px] items-center justify-center rounded-full", medal ?? "bg-soft-gray")}>
          <Text className={cn("text-sm font-bold", medal ? "text-white" : "text-ink")}>{entry.rank}</Text>
        </View>
      }
      trailing={
        <View className="items-end">
          <Text className="text-[17px] font-bold text-deep-green">{value}</Text>
          <Text className="text-xs text-muted">{t(`community.unit.${metric}`)}</Text>
        </View>
      }
    />
  );
}
