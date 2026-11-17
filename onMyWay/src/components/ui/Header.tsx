import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../../i18n";
import { cn } from "../../lib/cn";
import { colors } from "../../lib/theme";

type BackIcon = "chevron-back" | "close";

/** Back (or close) button. round: white circle, for screens on a colored or photo background */
export function BackButton({
  icon = "chevron-back",
  round = false,
  onPress = () => router.back(),
  className,
}: {
  icon?: BackIcon;
  round?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={icon === "close" ? t("common.cancel") : t("post.back")}
      hitSlop={8}
      className={cn(round && "h-10 w-10 items-center justify-center rounded-full bg-white", className)}
    >
      <Ionicons name={icon} size={round ? 22 : 24} color={colors.inkBlack} />
    </Pressable>
  );
}

/** Top bar: back/close on the left, a centered title, optional actions on the right */
export function ScreenHeader({
  title,
  icon = "chevron-back",
  onBack,
  right,
  bordered = false,
}: {
  title?: string;
  icon?: BackIcon;
  onBack?: () => void;
  right?: ReactNode;
  /** Thin line under the bar (on white screens with a list right under it) */
  bordered?: boolean;
}) {
  return (
    <View className={cn("flex-row items-center justify-between px-3 py-2", bordered && "border-b border-line")}>
      <View className="h-10 w-10 items-center justify-center">
        <BackButton icon={icon} onPress={onBack} />
      </View>
      <Text className="flex-1 text-center text-lg font-bold text-ink" numberOfLines={1}>
        {title ?? ""}
      </Text>
      <View className="h-10 w-10 items-center justify-center">{right}</View>
    </View>
  );
}
