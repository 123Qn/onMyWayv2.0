import { ActivityIndicator, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../lib/cn";
import { colors } from "../lib/theme";

type Variant = "primary" | "outline" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
};

// Icon and spinner need a raw color; the text uses the matching class
const tint: Record<Variant, string> = {
  primary: colors.white,
  outline: colors.deepGreen,
  danger: colors.error,
};

const look: Record<Variant, { button: string; text: string }> = {
  primary: { button: "bg-deep-green active:bg-teal-green", text: "text-white" },
  outline: { button: "border-[1.5px] border-deep-green bg-white active:bg-soft-gray", text: "text-deep-green" },
  danger: { button: "bg-error-bg active:opacity-80", text: "text-error" },
};

export function PrimaryButton({ title, onPress, loading, disabled, variant = "primary", icon }: Props) {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn("h-[54px] flex-row items-center justify-center gap-2.5 rounded-md", look[variant].button, inactive && "opacity-60")}
    >
      {loading ? (
        <ActivityIndicator color={tint[variant]} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={tint[variant]} /> : null}
          <Text className={cn("text-base font-bold", look[variant].text)}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
