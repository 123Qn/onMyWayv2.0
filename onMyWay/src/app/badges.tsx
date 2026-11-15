import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import type { BadgeCategory } from "../lib/badges";
import { BADGES, useRewards, type BadgeProgress } from "../lib/rewards";
import { colors, font, radius } from "../lib/theme";
import { BadgeIcon } from "../components/BadgeIcon";
import { BadgeSheet } from "../components/BadgeSheet";

type Filter = BadgeCategory | "all";
const FILTERS: Filter[] = ["all", "explorer", "terrain", "distance", "creator", "social", "community", "special"];

export default function BadgesScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<BadgeProgress | null>(null);
  const { progress, unlocked } = useRewards();

  // Unlocked first, then the locked ones closest to unlocking
  const items = useMemo(() => {
    const list = filter === "all" ? progress : progress.filter((p) => p.badge.category === filter);
    return [...list].sort(
      (a, b) => Number(b.unlocked) - Number(a.unlocked) || b.current / b.goal - a.current / a.goal
    );
  }, [filter, progress]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("post.back")}
          hitSlop={8}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.inkBlack} />
        </Pressable>
        <Text style={styles.title}>{t("rewards.badgesTitle")}</Text>
        <View style={styles.back} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.badge.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.top}>
            <View style={styles.summary}>
              <Text style={styles.summaryCount}>
                {unlocked.length}
                <Text style={styles.summaryTotal}> / {BADGES.length}</Text>
              </Text>
              <Text style={styles.summaryLabel}>
                {t("rewards.collected", { count: unlocked.length, total: BADGES.length })}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(unlocked.length / BADGES.length) * 100}%` }]} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => {
                const active = f === filter;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(`rewards.categories.${f}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            accessibilityRole="button"
            accessibilityLabel={t(`rewards.badges.${item.badge.id}`)}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          >
            <BadgeIcon badge={item.badge} unlocked={item.unlocked} size={64} />
            <Text style={[styles.name, !item.unlocked && styles.nameLocked]} numberOfLines={2}>
              {t(`rewards.badges.${item.badge.id}`)}
            </Text>
            {!item.unlocked ? (
              <View style={styles.miniTrack}>
                <View style={[styles.miniFill, { width: `${(item.current / item.goal) * 100}%` }]} />
              </View>
            ) : null}
          </Pressable>
        )}
      />

      <BadgeSheet progress={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  top: { gap: 16, marginBottom: 16 },
  summary: { backgroundColor: colors.inkBlack, borderRadius: radius.lg, padding: 20, gap: 6 },
  summaryCount: { color: colors.limeGreen, fontSize: 34, fontWeight: font.bold },
  summaryTotal: { color: colors.white, fontSize: 20, fontWeight: font.bold },
  summaryLabel: { color: "#C9D3D1", fontSize: 14, fontWeight: font.regular },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", marginTop: 6 },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.limeGreen },
  chips: { gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen },
  chipText: { color: colors.inkBlack, fontSize: 14, fontWeight: font.regular },
  chipTextActive: { color: colors.white, fontWeight: font.bold },
  row: { gap: 10, marginBottom: 10 },
  cell: {
    flex: 1 / 3,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.75 },
  name: { color: colors.inkBlack, fontSize: 12, fontWeight: font.bold, textAlign: "center", minHeight: 30 },
  nameLocked: { color: colors.textMuted },
  miniTrack: { alignSelf: "stretch", height: 4, borderRadius: 2, marginHorizontal: 8, backgroundColor: colors.softGray },
  miniFill: { height: "100%", borderRadius: 2, backgroundColor: colors.tealGreen },
});
