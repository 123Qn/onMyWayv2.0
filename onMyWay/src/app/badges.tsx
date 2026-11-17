import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { t } from "../i18n";
import type { BadgeCategory } from "../lib/badges";
import { cn } from "../lib/cn";
import { BADGES, useRewards, type BadgeProgress } from "../lib/rewards";
import { BadgeIcon } from "../components/BadgeIcon";
import { BadgeSheet } from "../components/BadgeSheet";
import { Chip, Screen, ScreenHeader } from "../components/ui";

type Filter = BadgeCategory | "all";
const FILTERS: Filter[] = ["all", "explorer", "terrain", "distance", "creator", "social", "community", "special"];

export default function BadgesScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<BadgeProgress | null>(null);
  const { progress, unlocked } = useRewards();

  // Unlocked first, then the locked ones closest to unlocking
  const items = useMemo(() => {
    const list = filter === "all" ? progress : progress.filter((p) => p.badge.category === filter);
    return [...list].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.current / b.goal - a.current / a.goal);
  }, [filter, progress]);

  return (
    <Screen className="flex-1 bg-soft-gray" edges={["top"]}>
      <ScreenHeader title={t("rewards.badgesTitle")} />

      <FlatList
        data={items}
        keyExtractor={(p) => p.badge.id}
        numColumns={3}
        columnWrapperClassName="mb-2.5 gap-2.5"
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <View className="gap-1.5 rounded-lg bg-ink p-5">
              <Text className="text-[34px] font-bold text-lime-green">
                {unlocked.length}
                <Text className="text-xl font-bold text-white"> / {BADGES.length}</Text>
              </Text>
              <Text className="text-sm text-[#C9D3D1]">{t("rewards.collected", { count: unlocked.length, total: BADGES.length })}</Text>
              <View className="mt-1.5 h-2 overflow-hidden rounded bg-white/15">
                <View className="h-full rounded bg-lime-green" style={{ width: `${(unlocked.length / BADGES.length) * 100}%` }} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {FILTERS.map((f) => (
                <Chip key={f} label={t(`rewards.categories.${f}`)} active={f === filter} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            accessibilityRole="button"
            accessibilityLabel={t(`rewards.badges.${item.badge.id}`)}
            className="items-center gap-1.5 rounded-[18px] bg-white px-1.5 py-3.5 active:opacity-75"
            style={{ flex: 1 / 3 }}
          >
            <BadgeIcon badge={item.badge} unlocked={item.unlocked} size={64} />
            <Text className={cn("min-h-[30px] text-center text-xs font-bold", item.unlocked ? "text-ink" : "text-muted")} numberOfLines={2}>
              {t(`rewards.badges.${item.badge.id}`)}
            </Text>
            {!item.unlocked ? (
              <View className="mx-2 h-1 self-stretch rounded-sm bg-soft-gray">
                <View className="h-full rounded-sm bg-teal-green" style={{ width: `${(item.current / item.goal) * 100}%` }} />
              </View>
            ) : null}
          </Pressable>
        )}
      />

      <BadgeSheet progress={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}
