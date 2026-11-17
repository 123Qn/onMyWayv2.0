import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../../lib/cn";
import { compactNumber } from "../../lib/format";
import { colors } from "../../lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

/** White rounded panel used on gray screens (profile cards) */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn("gap-2.5 rounded-lg bg-white p-4.5", className)}>{children}</View>;
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn("mt-1 text-lg font-bold text-ink", className)}>{children}</Text>;
}

/** Gray box with an icon and a message for empty lists */
export function EmptyState({ icon, text, title, className }: { icon: IconName; text: string; title?: string; className?: string }) {
  return (
    <View className={cn("items-center gap-2 rounded-md bg-soft-gray px-6 py-7", className)}>
      <Ionicons name={icon} size={28} color={colors.textMuted} />
      {title ? <Text className="text-center text-base font-bold text-ink">{title}</Text> : null}
      <Text className="text-center text-sm text-muted">{text}</Text>
    </View>
  );
}

/** Centered spinner for a screen or section that is loading */
export function Loading({ className }: { className?: string }) {
  return <ActivityIndicator color={colors.deepGreen} className={cn("mt-6", className)} />;
}

/** Big number with a label under it (compact: a little smaller, for tight sheets) */
export function Stat({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className={cn("font-bold text-ink", compact ? "text-xl" : "text-[22px]")}>{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

/** A row of stats separated by thin dividers (countries · places · km) */
export function StatRow({ items, className }: { items: { value: string; label: string }[]; className?: string }) {
  return (
    <View className={cn("flex-row items-center rounded-lg bg-white py-4", className)}>
      {items.map((item, i) => (
        <View key={item.label} className="flex-1 flex-row items-center">
          {i > 0 ? <View className="h-8 w-px bg-line" /> : null}
          <Stat value={item.value} label={item.label} />
        </View>
      ))}
    </View>
  );
}

/** Posts / followers / following count; tappable when onPress is given */
export function CountStat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} hitSlop={6} className="items-center">
      <Text className="text-[17px] font-bold text-ink">{compactNumber(value)}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </Pressable>
  );
}
