import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "./BrandLogo";
import { colors, font, radius } from "../lib/theme";

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <BrandLogo iconSize={88} wordmarkSize={34} />

          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {error ? (
            <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>{children}</View>

          <View style={styles.footer}>{footer}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
  inner: { width: "100%", maxWidth: 420, alignSelf: "center", gap: 24 },
  heading: { gap: 6 },
  title: { color: colors.inkBlack, fontSize: 26, fontWeight: font.bold, textAlign: "center" },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: font.regular,
    textAlign: "center",
    lineHeight: 21,
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 14, fontWeight: font.regular },
  form: { gap: 16 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
});

export const footerStyles = StyleSheet.create({
  text: { color: colors.textMuted, fontSize: 15, fontWeight: font.regular },
  link: { color: colors.tealGreen, fontSize: 15, fontWeight: font.bold },
});
