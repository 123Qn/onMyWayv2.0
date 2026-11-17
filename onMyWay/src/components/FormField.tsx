import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../lib/cn";
import { colors } from "../lib/theme";
import { t } from "../i18n";

export type TextInputRef = ComponentRef<typeof TextInput>;

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Adds a show/hide toggle and hides the text by default */
  password?: boolean;
  ref?: Ref<TextInputRef>;
};

export function FormField({ label, icon, password, ref, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View className="gap-2">
      <Text className="text-sm text-ink">{label}</Text>
      <View
        className={cn(
          "h-[54px] flex-row items-center gap-2.5 rounded-md border-[1.5px] px-3.5",
          focused ? "border-teal-green bg-white" : "border-line bg-soft-gray"
        )}
      >
        <Ionicons name={icon} size={20} color={focused ? colors.deepGreen : colors.textMuted} />
        <TextInput
          ref={ref}
          className="h-full flex-1 text-base text-ink"
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
