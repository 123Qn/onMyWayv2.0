import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { t } from "../i18n";
import { timeAgo } from "../lib/format";
import { fetchNotifications, markAllRead, type AppNotification } from "../lib/notifications";
import type { FrameId } from "../lib/rewards";
import { colors, font } from "../lib/theme";
import { AvatarFrame } from "../components/AvatarFrame";

const TYPE_ICON = {
  like: { name: "heart", color: colors.heart },
  comment: { name: "chatbubble", color: colors.tealGreen },
  answer: { name: "chatbubbles", color: colors.deepGreen },
  reply: { name: "return-down-forward", color: colors.tealGreen },
  follow: { name: "person-add", color: colors.skyBlue },
} as const;

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setItems(list);
      setFailed(false);
      // Seen now: clear the bell (the list keeps showing which ones were new)
      if (list.some((n) => !n.read)) markAllRead().catch(() => {});
    } catch {
      setFailed(true);
      setItems((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("post.back")} hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.inkBlack} />
        </Pressable>
        <Text style={styles.title}>{t("notifications.title")}</Text>
        <View style={styles.back} />
      </View>

      {items === null ? (
        <ActivityIndicator style={styles.loading} color={colors.deepGreen} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={failed ? "cloud-offline" : "notifications"} size={48} color={colors.limeGreen} />
              <Text style={styles.emptyTitle}>{failed ? t("common.networkError") : t("notifications.empty")}</Text>
              {!failed ? <Text style={styles.emptyHint}>{t("notifications.emptyHint")}</Text> : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const icon = TYPE_ICON[item.type];
  const text =
    item.type === "like"
      ? t("notifications.like", { name: item.actor.name })
      : item.type === "comment"
        ? t("notifications.comment", { name: item.actor.name })
        : item.type === "answer"
          ? t("notifications.answer", { name: item.actor.name })
          : item.type === "reply"
            ? t("notifications.reply", { name: item.actor.name })
            : t("notifications.follow", { name: item.actor.name });
  // Bold the actor's name inside the translated sentence
  const [before, after] = text.includes(item.actor.name) ? text.split(item.actor.name) : [text, ""];

  const open = () => {
    if (item.post) router.push({ pathname: "/post/[id]", params: { id: String(item.post.id) } });
    else router.push({ pathname: "/user/[id]", params: { id: String(item.actor.id) } });
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.pressed]}
    >
      <View>
        <AvatarFrame name={item.actor.name} frame={(item.actor.frame as FrameId | undefined) ?? "classic"} avatarSize={40} />
        <View style={styles.typeBadge}>
          <Ionicons name={icon.name} size={11} color={icon.color} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.text}>
          {before}
          <Text style={styles.bold}>{item.actor.name}</Text>
          {after}
          {item.post?.title ? <Text style={styles.muted}> · {item.post.title}</Text> : null}
        </Text>
        {item.comment ? (
          <Text style={styles.comment} numberOfLines={2}>
            “{item.comment}”
          </Text>
        ) : null}
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {item.post?.imageUrl ? <Image source={item.post.imageUrl} style={styles.thumb} contentFit="cover" /> : null}
      {!item.read ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold },
  loading: { marginTop: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingLeft: 8, paddingRight: 16 },
  rowUnread: { backgroundColor: colors.limeTint },
  pressed: { opacity: 0.7 },
  typeBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: { flex: 1, gap: 3 },
  text: { color: colors.inkBlack, fontSize: 14, lineHeight: 20, fontWeight: font.regular },
  bold: { fontWeight: font.bold },
  muted: { color: colors.textMuted },
  comment: { color: colors.inkBlack, fontSize: 13, fontStyle: "italic" },
  time: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.limeTint },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.deepGreen, marginLeft: 4 },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  emptyTitle: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold, textAlign: "center" },
  emptyHint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
});
