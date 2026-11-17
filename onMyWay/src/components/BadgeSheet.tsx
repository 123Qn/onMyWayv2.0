import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import type { SpecialBadgeId } from "../lib/badges";
import { compactNumber } from "../lib/format";
import { rarityColor, useRewards, type BadgeDef, type BadgeProgress } from "../lib/rewards";
import { colors } from "../lib/theme";
import { BadgeIcon } from "./BadgeIcon";
import { PrimaryButton } from "./PrimaryButton";

export function badgeDescription(badge: BadgeDef) {
  return badge.metric && badge.goal
    ? t(`rewards.desc.${badge.metric}`, { count: badge.goal.toLocaleString("en-US") })
    : t(`rewards.specialDesc.${badge.id as SpecialBadgeId}`);
}

// Bottom sheet with a badge's details, progress and pin toggle (readOnly: someone else's badge)
export function BadgeSheet({
  progress,
  onClose,
  readOnly = false,
}: {
  progress: BadgeProgress | null;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { pinned, togglePin } = useRewards();

  if (!progress) return null;
  const { badge, unlocked, current, goal } = progress;
  // Rarity colors are data-driven, so they stay inline styles
  const tone = rarityColor[badge.rarity];
  const isPinned = pinned.includes(badge.id);

  const pin = () => {
    if (!togglePin(badge.id)) Alert.alert(t("rewards.pinLimit"));
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-ink/45" onPress={onClose} accessibilityLabel={t("rewards.close")} />
      <View className="items-center gap-2.5 rounded-t-[28px] bg-white px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="mb-2.5 h-1 w-10 rounded-sm bg-line" />
        <BadgeIcon badge={badge} unlocked={unlocked} size={120} />
        <View className="rounded-xl px-3 py-1" style={{ backgroundColor: unlocked ? tone.light : colors.softGray }}>
          <Text className="text-xs font-bold" style={{ color: unlocked ? tone.dark : colors.textMuted }}>
            {t(`rewards.rarity.${badge.rarity}`)}
          </Text>
        </View>
        <Text className="text-center text-[22px] font-bold text-ink">{t(`rewards.badges.${badge.id}`)}</Text>
        <Text className="text-center text-[15px] text-muted">{badgeDescription(badge)}</Text>

        <View className="mt-2 gap-1.5 self-stretch">
          <View className="h-2 overflow-hidden rounded bg-soft-gray">
            <View
              className="h-full rounded"
              style={{ width: `${(current / goal) * 100}%`, backgroundColor: unlocked ? tone.main : colors.tealGreen }}
            />
          </View>
          <Text className="text-center text-[13px] font-bold text-muted">
            {unlocked ? t("rewards.unlocked") : t("rewards.progress", { current: compactNumber(current), goal: compactNumber(goal) })}
          </Text>
        </View>

        {!readOnly && !unlocked && badge.category !== "social" && badge.category !== "community" ? (
          <View className="mt-2 flex-row gap-2 self-stretch rounded-md bg-lime-tint p-3">
            <Ionicons name="shield-checkmark" size={16} color={colors.deepGreen} />
            <Text className="flex-1 text-[13px] leading-[18px] text-ink">{t("rewards.howToEarn")}</Text>
          </View>
        ) : null}

        {unlocked && !readOnly ? (
          <View className="mt-2 self-stretch">
            <PrimaryButton
              title={isPinned ? t("rewards.unpin") : t("rewards.pin")}
              icon="pin"
              variant={isPinned ? "outline" : "primary"}
              onPress={pin}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
