import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius } from "../lib/theme";
import { t } from "../i18n";

export type TextInputRef = ComponentRef<typeof TextInput>;

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Adds a show/hide toggle and hides the text by default */
  password?: boolean;
  ref?: Ref<TextInputRef>;
};

export function FormField({ label, icon, password, ref, style, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Ionicons name={icon} size={20} color={focused ? colors.deepGreen : colors.textMuted} />
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.tealGreen}
          cursorColor={colors.deepGreen}
          secureTextEntry={password && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t("fields.showPassword") : t("fields.hidePassword")}
          >
            <Ionicons name={hidden ? "eye" : "eye-off"} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { color: colors.inkBlack, fontSize: 14, fontWeight: font.regular },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.softGray,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 54,
  },
  fieldFocused: { borderColor: colors.tealGreen, backgroundColor: colors.white },
  input: {
    flex: 1,
    height: "100%",
    color: colors.inkBlack,
    fontSize: 16,
    fontWeight: font.regular,
  },
});
