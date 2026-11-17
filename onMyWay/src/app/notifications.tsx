import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { cn } from "../lib/cn";
import { timeAgo } from "../lib/format";
import { useFocusLoad, useRefresh } from "../lib/hooks";
import { fetchNotifications, markAllRead, type AppNotification } from "../lib/notifications";
import type { FrameId } from "../lib/rewards";
import { colors } from "../lib/theme";
import { AvatarFrame } from "../components/AvatarFrame";
import { Img, Loading, Screen, ScreenHeader } from "../components/ui";

const TYPE_ICON = {
  like: { name: "heart", color: colors.heart },
  comment: { name: "chatbubble", color: colors.tealGreen },
  answer: { name: "chatbubbles", color: colors.deepGreen },
  reply: { name: "return-down-forward", color: colors.tealGreen },
  follow: { name: "person-add", color: colors.skyBlue },
} as const;

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
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
  useFocusLoad(load);
  const { refreshing, onRefresh } = useRefresh(load);

  return (
    <Screen className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title={t("notifications.title")} bordered />

      {items === null ? (
        <Loading className="mt-12" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.deepGreen]} tintColor={colors.deepGreen} />}
          contentContainerClassName={items.length === 0 ? "grow" : undefined}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-2 p-8">
              <Ionicons name={failed ? "cloud-offline" : "notifications"} size={48} color={colors.limeGreen} />
              <Text className="text-center text-[17px] font-bold text-ink">{failed ? t("common.networkError") : t("notifications.empty")}</Text>
              {!failed ? <Text className="text-center text-sm text-muted">{t("notifications.emptyHint")}</Text> : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const icon = TYPE_ICON[item.type];
  const text = t(`notifications.${item.type}`, { name: item.actor.name });
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
      className={cn("flex-row items-center gap-1.5 py-3 pl-2 pr-4 active:opacity-70", !item.read && "bg-lime-tint")}
    >
      <View>
        <AvatarFrame name={item.actor.name} frame={(item.actor.frame as FrameId | undefined) ?? "classic"} avatarSize={40} />
        <View className="absolute bottom-1 right-1 h-5 w-5 items-center justify-center rounded-full border border-line bg-white">
          <Ionicons name={icon.name} size={11} color={icon.color} />
        </View>
      </View>
      <View className="flex-1 gap-[3px]">
        <Text className="text-sm leading-5 text-ink">
          {before}
          <Text className="font-bold">{item.actor.name}</Text>
          {after}
          {item.post?.title ? <Text className="text-muted"> · {item.post.title}</Text> : null}
        </Text>
        {item.comment ? (
          <Text className="text-[13px] italic text-ink" numberOfLines={2}>
            “{item.comment}”
          </Text>
        ) : null}
        <Text className="text-xs text-muted">{timeAgo(item.createdAt)}</Text>
      </View>
      {item.post?.imageUrl ? <Img source={item.post.imageUrl} className="h-12 w-12 rounded-[10px] bg-lime-tint" contentFit="cover" /> : null}
      {!item.read ? <View className="ml-1 h-2 w-2 rounded-full bg-deep-green" /> : null}
    </Pressable>
  );
}
