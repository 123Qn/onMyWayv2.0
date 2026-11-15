import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../lib/AuthContext";
import { ApiError } from "../../lib/api";
import { t } from "../../i18n";
import { compactNumber } from "../../lib/format";
import {
  ALL_PROGRESS,
  BADGES,
  MY_LEVEL,
  MY_STATS,
  UNLOCKED,
  getBadge,
  useRewards,
  type BadgeProgress,
} from "../../lib/rewards";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { AvatarFrame } from "../../components/AvatarFrame";
import { BadgeIcon } from "../../components/BadgeIcon";
import { BadgeSheet } from "../../components/BadgeSheet";
import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, font, radius } from "../../lib/theme";

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { frame, pinned } = useRewards();
  const [busy, setBusy] = useState<"logout" | "delete" | null>(null);
  const [selected, setSelected] = useState<BadgeProgress | null>(null);

  const confirmSignOut = () => {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        onPress: async () => {
          setBusy("logout");
          await signOut(); // root layout switches to (auth)
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      t("profile.deleteAccount"),
      t("profile.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deleteConfirmButton"),
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteAccount(); // root layout switches to (auth)
            } catch (e) {
              setBusy(null);
              Alert.alert(
                t("profile.deleteFailed"),
                e instanceof ApiError ? e.message : t("common.tryAgainLater")
              );
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  const progressOf = (id: (typeof pinned)[number]) => ALL_PROGRESS.find((p) => p.badge.id === id)!;
  // Newest-looking unlocks first: rarest at the end of each series
  const recent = [...UNLOCKED].reverse().slice(0, 10);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable
            onPress={() => router.push("/frames")}
            accessibilityRole="button"
            accessibilityLabel={t("profile.editFrame")}
          >
            <AvatarFrame name={user.name} frame={frame} avatarSize={96} />
            <View style={styles.editFrame}>
              <Ionicons name="color-palette" size={16} color={colors.white} />
            </View>
          </Pressable>

          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>

          <View style={styles.levelPill}>
            <Text style={styles.levelText}>{t("rewards.level", { level: MY_LEVEL.level })}</Text>
            <View style={styles.levelDot} />
            <Text style={styles.levelTitle}>{t(`rewards.levelTitles.${MY_LEVEL.title}`)}</Text>
          </View>

          <View style={styles.xpWrap}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${(MY_LEVEL.current / MY_LEVEL.needed) * 100}%` }]} />
            </View>
            <Text style={styles.xpText}>
              {t("rewards.xp", { current: MY_LEVEL.current, next: MY_LEVEL.needed })}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={String(MY_STATS.countries)} label={t("rewards.stats.countries")} />
          <View style={styles.statDivider} />
          <Stat value={String(MY_STATS.places)} label={t("rewards.stats.places")} />
          <View style={styles.statDivider} />
          <Stat value={compactNumber(MY_STATS.km)} label={t("rewards.stats.km")} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("rewards.showcase")}</Text>
          </View>
          {pinned.length ? (
            <View style={styles.showcase}>
              {pinned.map((id) => {
                const badge = getBadge(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelected(progressOf(id))}
                    accessibilityRole="button"
                    style={styles.showcaseItem}
                  >
                    <BadgeIcon badge={badge} unlocked size={76} />
                    <Text style={styles.showcaseName} numberOfLines={2}>{t(`rewards.badges.${id}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.hint}>{t("rewards.showcaseHint")}</Text>
          )}
        </View>

        <Pressable
          onPress={() => router.push("/badges")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t("rewards.badgesTitle")}</Text>
            <View style={styles.viewAll}>
              <Text style={styles.viewAllText}>{t("rewards.viewAll")}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.deepGreen} />
            </View>
          </View>
          <Text style={styles.hint}>
            {t("rewards.collected", { count: UNLOCKED.length, total: BADGES.length })}
          </Text>
          <View style={styles.collectTrack}>
            <View style={[styles.collectFill, { width: `${(UNLOCKED.length / BADGES.length) * 100}%` }]} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recent}>
            {recent.map((p) => (
              <BadgeIcon key={p.badge.id} badge={p.badge} unlocked size={46} />
            ))}
          </ScrollView>
        </Pressable>

        <Text style={styles.sectionLabel}>{t("profile.account")}</Text>
        <View style={styles.actions}>
          <PrimaryButton
            title={t("profile.signOut")}
            icon="log-out"
            variant="outline"
            onPress={confirmSignOut}
            loading={busy === "logout"}
            disabled={busy !== null}
          />
          <PrimaryButton
            title={t("profile.deleteAccount")}
            icon="trash"
            variant="danger"
            onPress={confirmDelete}
            loading={busy === "delete"}
            disabled={busy !== null}
          />
        </View>
      </ScrollView>

      <BadgeSheet progress={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  hero: { alignItems: "center", gap: 8, paddingTop: 8 },
  editFrame: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
    borderWidth: 3,
    borderColor: colors.softGray,
  },
  name: { color: colors.inkBlack, fontSize: 24, fontWeight: font.bold },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.inkBlack,
  },
  levelText: { color: colors.limeGreen, fontSize: 13, fontWeight: font.bold },
  levelDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted },
  levelTitle: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  xpWrap: { alignSelf: "stretch", gap: 6, paddingHorizontal: 40, marginTop: 4 },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 4, backgroundColor: colors.limeGreen },
  xpText: { color: colors.textMuted, fontSize: 12, fontWeight: font.bold, textAlign: "center" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: colors.inkBlack, fontSize: 22, fontWeight: font.bold },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 10 },
  pressed: { opacity: 0.8 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },
  hint: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
  showcase: { flexDirection: "row", justifyContent: "space-around" },
  showcaseItem: { width: 96, alignItems: "center", gap: 6 },
  showcaseName: { color: colors.inkBlack, fontSize: 12, fontWeight: font.bold, textAlign: "center" },
  collectTrack: { height: 6, borderRadius: 3, backgroundColor: colors.softGray, overflow: "hidden" },
  collectFill: { height: "100%", borderRadius: 3, backgroundColor: colors.tealGreen },
  recent: { gap: 8, paddingTop: 4 },
  sectionLabel: { color: colors.textMuted, fontSize: 13, fontWeight: font.bold, marginTop: 8, marginLeft: 4 },
  actions: { gap: 12 },
});
