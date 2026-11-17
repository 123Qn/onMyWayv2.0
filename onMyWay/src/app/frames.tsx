import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/cn";
import { FRAMES, getBadge, rarityColor, useRewards, type FrameDef } from "../lib/rewards";
import { colors } from "../lib/theme";
import { AvatarFrame, FramePreview } from "../components/AvatarFrame";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen, ScreenHeader } from "../components/ui";

// Pick an avatar frame: big live preview on top, collection below
export default function FramesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { frame: equipped, equipFrame, isFrameUnlocked } = useRewards();
  const [previewId, setPreviewId] = useState(equipped);
  const preview = FRAMES.find((f) => f.id === previewId)!;
  const unlocked = isFrameUnlocked(preview);
  // Rarity colors are data-driven, so they stay inline styles
  const tone = rarityColor[preview.rarity];

  return (
    <Screen className="flex-1 bg-soft-gray" edges={["top"]}>
      <ScreenHeader title={t("rewards.framesTitle")} />

      <ScrollView contentContainerClassName="gap-4 p-4 pb-6" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-2 rounded-lg bg-white py-6">
          <AvatarFrame name={user?.name ?? "?"} frame={preview.id} avatarSize={120} uri={user?.avatarUrl} />
          <Text className="mt-1 text-xl font-bold text-ink">{t(`rewards.frames.${preview.id}`)}</Text>
          <View className="rounded-xl px-3 py-1" style={{ backgroundColor: tone.light }}>
            <Text className="text-xs font-bold" style={{ color: tone.dark }}>{t(`rewards.rarity.${preview.rarity}`)}</Text>
          </View>
          {!unlocked ? (
            <View className="mt-1 flex-row items-center gap-1.5 px-6">
              <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              <Text className="text-center text-sm text-muted">{requirement(preview)}</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2.5">
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
                className="w-[31%] items-center gap-1.5 overflow-hidden rounded-[18px] border-2 border-transparent bg-white pb-2.5 pt-3"
                style={active ? { borderColor: rarityColor[f.rarity].main } : undefined}
              >
                <View className={cn(!open && "opacity-35")}>
                  <FramePreview frame={f.id} size={72} />
                </View>
                {f.id === equipped ? (
                  <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-deep-green">
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                  </View>
                ) : null}
                {!open ? (
                  <View className="absolute left-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-muted">
                    <Ionicons name="lock-closed" size={11} color={colors.white} />
                  </View>
                ) : null}
                <View className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: rarityColor[f.rarity].main }} />
                <Text className="px-1.5 text-xs font-bold text-ink" numberOfLines={1}>{t(`rewards.frames.${f.id}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="bg-soft-gray px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <PrimaryButton
          title={preview.id === equipped ? t("rewards.equipped") : t("rewards.equip")}
          icon={preview.id === equipped ? "checkmark-circle" : unlocked ? "color-palette" : "lock-closed"}
          disabled={!unlocked || preview.id === equipped}
          onPress={() => equipFrame(preview.id)}
        />
      </View>
    </Screen>
  );
}

function requirement(frame: FrameDef) {
  return "level" in frame.unlock
    ? t("rewards.unlockAtLevel", { level: frame.unlock.level })
    : t("rewards.unlockWithBadge", { badge: t(`rewards.badges.${getBadge(frame.unlock.badge).id}`) });
}
