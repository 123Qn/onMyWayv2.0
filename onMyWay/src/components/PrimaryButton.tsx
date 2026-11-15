import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius } from "../lib/theme";

type Variant = "primary" | "outline" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
};

const tint: Record<Variant, string> = {
  primary: colors.white,
  outline: colors.deepGreen,
  danger: colors.error,
};

export function PrimaryButton({ title, onPress, loading, disabled, variant = "primary", icon }: Props) {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && pressedStyles[variant],
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint[variant]} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={tint[variant]} /> : null}
          <Text style={[styles.title, { color: tint[variant] }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primary: { backgroundColor: colors.deepGreen },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.deepGreen },
  danger: { backgroundColor: colors.errorBg },
  inactive: { opacity: 0.6 },
  title: { fontSize: 16, fontWeight: font.bold },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.tealGreen },
  outline: { backgroundColor: colors.softGray },
  danger: { opacity: 0.8 },
});
