import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../../i18n";
import { cn } from "../../lib/cn";
import { colors } from "../../lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

/** Rounded search box with a clear button */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  className,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <View className={cn("flex-row items-center gap-2 rounded-md bg-soft-gray px-3.5", className)}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className="flex-1 py-3 text-[15px] text-ink"
        returnKeyType="search"
        autoCorrect={false}
        selectionColor={colors.tealGreen}
        cursorColor={colors.deepGreen}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} accessibilityRole="button" accessibilityLabel={t("common.cancel")} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Outlined pill that fills deep green when selected */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={cn("rounded-full border px-3.5 py-2", active ? "border-deep-green bg-deep-green" : "border-line bg-white")}
    >
      <Text className={cn("text-sm font-bold", active ? "text-white" : "text-ink")}>{label}</Text>
    </Pressable>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; icon?: IconName };

/**
 * One-of-many switch.
 * pill: green segments on a lime track (main sections) · subtle: white segment on gray (filters)
 * · underline: tabs with a green underline (lists)
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "pill",
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "pill" | "subtle" | "underline";
}) {
  const track = {
    pill: "flex-row rounded-full bg-lime-tint p-1",
    subtle: "flex-row rounded-md bg-soft-gray p-[3px]",
    underline: "flex-row border-b border-line",
  }[variant];
  return (
    <View className={track}>
      {options.map((o) => {
        const active = o.value === value;
        const item = {
          pill: cn("flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5", active && "bg-deep-green"),
          subtle: cn("flex-1 items-center rounded-[11px] py-[7px]", active && "bg-white"),
          underline: cn("flex-1 items-center border-b-2 py-3", active ? "border-deep-green" : "border-transparent"),
        }[variant];
        const text = {
          pill: cn("text-sm font-bold", active ? "text-white" : "text-deep-green"),
          subtle: cn("text-[13px] font-bold", active ? "text-ink" : "text-muted"),
          underline: cn("text-[15px] font-bold", active ? "text-deep-green" : "text-muted"),
        }[variant];
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={item}
          >
            {o.icon ? <Ionicons name={o.icon} size={16} color={active ? colors.white : colors.deepGreen} /> : null}
            <Text className={text}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
