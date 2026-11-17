import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/AuthContext";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { GoogleAuthError } from "../lib/googleAuth";
import { colors } from "../lib/theme";
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
  const inactive = disabled || loading;

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
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line" />
        <Text className="text-sm text-muted">{t("common.or")}</Text>
        <View className="h-px flex-1 bg-line" />
      </View>

      <Pressable
        onPress={handlePress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={t("auth.google.continue")}
        accessibilityState={{ disabled: inactive, busy: loading }}
        className={cn(
          "h-[54px] flex-row items-center justify-center gap-2.5 rounded-md border-[1.5px] border-line bg-white active:bg-soft-gray",
          inactive && "opacity-60"
        )}
      >
        {loading ? (
          <ActivityIndicator color={colors.deepGreen} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={colors.inkBlack} />
            <Text className="text-base font-bold text-ink">{t("auth.google.continue")}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
