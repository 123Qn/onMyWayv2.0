import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { FRAMES, getBadge, isFrameUnlocked, rarityColor, useRewards, type FrameDef } from "../lib/rewards";
import { colors, font, radius } from "../lib/theme";
import { AvatarFrame, FramePreview } from "../components/AvatarFrame";
import { PrimaryButton } from "../components/PrimaryButton";

// Pick an avatar frame: big live preview on top, collection below
export default function FramesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { frame: equipped, equipFrame } = useRewards();
  const [previewId, setPreviewId] = useState(equipped);
  const preview = FRAMES.find((f) => f.id === previewId)!;
  const unlocked = isFrameUnlocked(preview);
  const tone = rarityColor[preview.rarity];

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
        <Text style={styles.title}>{t("rewards.framesTitle")}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <AvatarFrame name={user?.name ?? "?"} frame={preview.id} avatarSize={120} />
          <Text style={styles.frameName}>{t(`rewards.frames.${preview.id}`)}</Text>
          <View style={[styles.rarity, { backgroundColor: tone.light }]}>
            <Text style={[styles.rarityText, { color: tone.dark }]}>{t(`rewards.rarity.${preview.rarity}`)}</Text>
          </View>
          {!unlocked ? (
            <View style={styles.requirement}>
              <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              <Text style={styles.requirementText}>{requirement(preview)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grid}>
          {FRAMES.map((f) => {
            const open = isFrameUnlocked(f);
            const active = f.id === previewId;
            return (
              <Pressable
                key={f.id}
                onPress={() => setPreviewId(f.id)}
                accessibilityRole="button"
                accessibilityLabel={t(`rewards.frames.${f.id}`)}
                accessibilityState={{ selected: active }}
                style={[styles.cell, active && { borderColor: rarityColor[f.rarity].main }]}
              >
                <View style={!open && styles.lockedArt}>
                  <FramePreview frame={f.id} size={72} />
                </View>
                {f.id === equipped ? (
                  <View style={styles.equippedTag}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  </View>
                ) : null}
                {!open ? (
                  <View style={styles.lockTag}>
                    <Ionicons name="lock-closed" size={11} color={colors.white} />
                  </View>
                ) : null}
                <View style={[styles.rarityBar, { backgroundColor: rarityColor[f.rarity].main }]} />
                <Text style={styles.cellName} numberOfLines={1}>{t(`rewards.frames.${f.id}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title={preview.id === equipped ? t("rewards.equipped") : t("rewards.equip")}
          icon={preview.id === equipped ? "checkmark-circle" : unlocked ? "color-palette" : "lock-closed"}
          disabled={!unlocked || preview.id === equipped}
          onPress={() => equipFrame(preview.id)}
        />
      </View>
    </SafeAreaView>
  );
}

function requirement(frame: FrameDef) {
  return "level" in frame.unlock
    ? t("rewards.unlockAtLevel", { level: frame.unlock.level })
    : t("rewards.unlockWithBadge", { badge: t(`rewards.badges.${getBadge(frame.unlock.badge).id}`) });
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
  content: { padding: 16, paddingBottom: 24, gap: 16 },
  stage: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  frameName: { color: colors.inkBlack, fontSize: 20, fontWeight: font.bold, marginTop: 4 },
  rarity: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  rarityText: { fontSize: 12, fontWeight: font.bold },
  requirement: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingHorizontal: 24 },
  requirementText: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    width: "31%",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  lockedArt: { opacity: 0.35 },
  equippedTag: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
  },
  lockTag: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textMuted,
  },
  rarityBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3 },
  cellName: { color: colors.inkBlack, fontSize: 12, fontWeight: font.bold, paddingHorizontal: 6 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.softGray },
});
