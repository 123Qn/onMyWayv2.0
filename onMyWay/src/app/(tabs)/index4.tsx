import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/AuthContext";
import { ApiError } from "../../lib/api";
import { t } from "../../i18n";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";
import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, font, radius } from "../../lib/theme";

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const [busy, setBusy] = useState<"logout" | "delete" | null>(null);

  const confirmSignOut = () => {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        onPress: async () => {
          setBusy("logout");
          await signOut(); // root layout switches to (auth)
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      t("profile.deleteAccount"),
      t("profile.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deleteConfirmButton"),
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteAccount(); // root layout switches to (auth)
            } catch (e) {
              setBusy(null);
              Alert.alert(
                t("profile.deleteFailed"),
                e instanceof ApiError ? e.message : t("common.tryAgainLater")
              );
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
      >
        <Text style={styles.heading}>{t("profile.title")}</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={t("profile.signOut")}
            icon="log-out"
            variant="outline"
            onPress={confirmSignOut}
            loading={busy === "logout"}
            disabled={busy !== null}
          />
          <PrimaryButton
            title={t("profile.deleteAccount")}
            icon="trash"
            variant="danger"
            onPress={confirmDelete}
            loading={busy === "delete"}
            disabled={busy !== null}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  content: { padding: 20, gap: 20 },
  heading: { color: colors.inkBlack, fontSize: 28, fontWeight: font.bold },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.limeGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.inkBlack, fontSize: 26, fontWeight: font.bold },
  info: { flex: 1, gap: 4 },
  name: { color: colors.inkBlack, fontSize: 20, fontWeight: font.bold },
  email: { color: colors.textMuted, fontSize: 15, fontWeight: font.regular },
  actions: { gap: 12 },
});
