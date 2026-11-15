import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/AuthContext";
import { ApiError } from "../lib/api";
import { GoogleAuthError } from "../lib/googleAuth";
import { colors, font, radius } from "../lib/theme";
import { t } from "../i18n";

function googleErrorMessage(e: unknown) {
  if (e instanceof GoogleAuthError) return e.message;
  if (e instanceof ApiError) {
    if (e.status === 503) return t("auth.google.serverNotConfigured");
    if (e.status === 401) return t("auth.google.verifyFailed");
    return e.message;
  }
  return t("auth.google.failed");
}

type Props = { onError: (message: string) => void; disabled?: boolean };

// "or" divider + "Continue with Google"; used on login and register
export function GoogleSignInButton({ onError, disabled }: Props) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    onError("");
    setLoading(true);
    try {
      // On success the root layout switches to (tabs)
      if (await signInWithGoogle()) return;
    } catch (e) {
      onError(googleErrorMessage(e));
    }
    setLoading(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>{t("common.or")}</Text>
        <View style={styles.line} />
      </View>

      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={t("auth.google.continue")}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          (disabled || loading) && styles.inactive,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.deepGreen} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={colors.inkBlack} />
            <Text style={styles.title}>{t("auth.google.continue")}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 14, fontWeight: font.regular },
  button: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pressed: { backgroundColor: colors.softGray },
  inactive: { opacity: 0.6 },
  title: { color: colors.inkBlack, fontSize: 16, fontWeight: font.bold },
});
