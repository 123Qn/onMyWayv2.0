import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../i18n";
import type { SpecialBadgeId } from "../lib/badges";
import { compactNumber } from "../lib/format";
import { rarityColor, useRewards, type BadgeDef, type BadgeProgress } from "../lib/rewards";
import { colors, font } from "../lib/theme";
import { BadgeIcon } from "./BadgeIcon";
import { PrimaryButton } from "./PrimaryButton";
import { Ionicons } from "@expo/vector-icons";

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
  const tone = rarityColor[badge.rarity];
  const isPinned = pinned.includes(badge.id);

  const pin = () => {
    if (!togglePin(badge.id)) Alert.alert(t("rewards.pinLimit"));
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("rewards.close")} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <BadgeIcon badge={badge} unlocked={unlocked} size={120} />
        <View style={[styles.rarity, { backgroundColor: unlocked ? tone.light : colors.softGray }]}>
          <Text style={[styles.rarityText, { color: unlocked ? tone.dark : colors.textMuted }]}>
            {t(`rewards.rarity.${badge.rarity}`)}
          </Text>
        </View>
        <Text style={styles.name}>{t(`rewards.badges.${badge.id}`)}</Text>
        <Text style={styles.desc}>{badgeDescription(badge)}</Text>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(current / goal) * 100}%`, backgroundColor: unlocked ? tone.main : colors.tealGreen },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {unlocked
              ? t("rewards.unlocked")
              : t("rewards.progress", { current: compactNumber(current), goal: compactNumber(goal) })}
          </Text>
        </View>

        {!readOnly && !unlocked && badge.category !== "social" && badge.category !== "community" ? (
          <View style={styles.howTo}>
            <Ionicons name="shield-checkmark" size={16} color={colors.deepGreen} />
            <Text style={styles.howToText}>{t("rewards.howToEarn")}</Text>
          </View>
        ) : null}

        {unlocked && !readOnly ? (
          <View style={styles.button}>
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(27,43,40,0.45)" },
  sheet: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  rarity: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  rarityText: { fontSize: 12, fontWeight: font.bold },
  name: { color: colors.inkBlack, fontSize: 22, fontWeight: font.bold, textAlign: "center" },
  desc: { color: colors.textMuted, fontSize: 15, fontWeight: font.regular, textAlign: "center" },
  progressWrap: { alignSelf: "stretch", gap: 6, marginTop: 8 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.softGray, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { color: colors.textMuted, fontSize: 13, fontWeight: font.bold, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: 8 },
  howTo: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.limeTint,
  },
  howToText: { flex: 1, color: colors.inkBlack, fontSize: 13, lineHeight: 18, fontWeight: font.regular },
});
