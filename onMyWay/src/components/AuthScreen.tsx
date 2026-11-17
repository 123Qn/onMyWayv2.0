import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "./BrandLogo";
import { colors } from "../lib/theme";

type Props = {
  title: string;
  subtitle: string;
  error?: string;
  children: ReactNode;
  footer: ReactNode;
};

// Shared shell for login / register: brand header, form card, footer link
export function AuthScreen({ title, subtitle, error, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="grow justify-center px-6"
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[420px] gap-6 self-center">
          <BrandLogo iconSize={88} wordmarkSize={34} />

          <View className="gap-1.5">
            <Text className="text-center text-[26px] font-bold text-ink">{title}</Text>
            <Text className="text-center text-[15px] leading-[21px] text-muted">{subtitle}</Text>
          </View>

          {error ? (
            <View
              className="flex-row items-center gap-2 rounded-md bg-error-bg px-3.5 py-3"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text className="flex-1 text-sm text-error">{error}</Text>
            </View>
          ) : null}

          <View className="gap-4">{children}</View>

          <View className="flex-row items-center justify-center gap-1">{footer}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Classes for the "Don't have an account? Sign up" line under the form */
export const footerText = "text-[15px] text-muted";
export const footerLink = "text-[15px] font-bold text-teal-green";
