import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { askAssistant, fetchConversation, fetchConversations, type AssistantMessage, type PlaceCard } from "../lib/assistantApi";
import { cn } from "../lib/cn";
import type { FeedPost } from "../lib/feed";
import { flagEmoji, monthRanges } from "../lib/format";
import { sizedImage } from "../lib/image";
import { colors } from "../lib/theme";
import { AssistantMascot } from "../components/AssistantMascot";
import { Img, Screen, ScreenHeader } from "../components/ui";

// Shown before the first question; tapping one asks it
const SUGGESTIONS = ["assistant.suggest.beach", "assistant.suggest.hiking", "assistant.suggest.kyoto", "assistant.suggest.family"] as const;

// Chat with the onMyWay travel assistant (answers come from onMyWay data via a local model)
export default function AssistantScreen() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  // Pick up the latest conversation
  useEffect(() => {
    fetchConversations()
      .then(async (list) => {
        if (!list[0]) return;
        const c = await fetchConversation(list[0].id);
        setConversationId(c.id);
        setMessages(c.messages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setDraft("");
    // Show my question right away
    const mine: AssistantMessage = { id: -Date.now(), role: "user", content: question, createdAt: new Date().toISOString(), places: [], posts: [] };
    setMessages((prev) => [...prev, mine]);
    setThinking(true);
    try {
      const res = await askAssistant(question, conversationId);
      setConversationId(res.conversationId);
      setMessages((prev) => [...prev, res.message]);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== mine.id));
      setDraft(question);
      Alert.alert(t("assistant.failed"), e instanceof Error ? e.message : t("common.genericError"));
    } finally {
      setThinking(false);
    }
  };

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  return (
    <Screen className="flex-1 bg-soft-gray" edges={["top", "bottom"]}>
      <ScreenHeader
        title={t("assistant.title")}
        bordered
        right={
          <Pressable onPress={newChat} accessibilityRole="button" accessibilityLabel={t("assistant.newChat")} hitSlop={8}>
            <Ionicons name="create-outline" size={24} color={colors.inkBlack} />
          </Pressable>
        }
      />

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          ref={scroll}
          contentContainerClassName="gap-3 p-4"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {loading ? (
            <ActivityIndicator color={colors.deepGreen} className="mt-10" />
          ) : messages.length === 0 ? (
            <Welcome onAsk={ask} />
          ) : (
            messages.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.content} /> : <AssistantBubble key={m.id} message={m} />))
          )}
          {thinking ? (
            <View className="flex-row items-center gap-2 self-start">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-deep-green">
                <AssistantMascot size={24} mood="thinking" />
              </View>
              <View className="flex-row items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3">
                <ActivityIndicator size="small" color={colors.deepGreen} />
                <Text className="text-sm text-muted">{t("assistant.thinking")}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View className="flex-row items-end gap-2.5 border-t border-line bg-white px-4 py-2.5">
          <TextInput
            className="max-h-[110px] min-h-10 flex-1 rounded-[20px] bg-soft-gray px-4 py-2.5 text-[15px] text-ink"
            value={draft}
            onChangeText={setDraft}
            placeholder={t("assistant.placeholder")}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.tealGreen}
            cursorColor={colors.deepGreen}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={() => ask(draft)}
            disabled={!draft.trim() || thinking}
            accessibilityRole="button"
            accessibilityLabel={t("post.send")}
            className={cn("h-10 w-10 items-center justify-center rounded-full bg-deep-green active:bg-teal-green", (!draft.trim() || thinking) && "opacity-40")}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Welcome({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <View className="items-center gap-3 px-2 pt-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-deep-green">
        <AssistantMascot size={68} />
      </View>
      <Text className="text-center text-xl font-bold text-ink">{t("assistant.welcomeTitle")}</Text>
      <Text className="text-center text-sm leading-5 text-muted">{t("assistant.welcomeBody")}</Text>
      <View className="mt-2 gap-2 self-stretch">
        {SUGGESTIONS.map((key) => (
          <Pressable
            key={key}
            onPress={() => onAsk(t(key))}
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-md border border-line bg-white px-3.5 py-3 active:bg-lime-tint"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.deepGreen} />
            <Text className="flex-1 text-sm text-ink">{t(key)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-deep-green px-4 py-2.5">
      <Text className="text-[15px] leading-[21px] text-white">{text}</Text>
    </View>
  );
}

function AssistantBubble({ message }: { message: AssistantMessage }) {
  return (
    <View className="gap-2 self-stretch">
      <View className="max-w-[90%] flex-row gap-2 self-start">
        <View className="mt-1 h-8 w-8 items-center justify-center rounded-full bg-deep-green">
          <AssistantMascot size={24} animated={false} />
        </View>
        <View className="shrink rounded-2xl rounded-tl-sm bg-white px-4 py-2.5">
          <Text className="text-[15px] leading-[21px] text-ink">{message.content}</Text>
        </View>
      </View>
      {message.places.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pl-9 pr-4">
          {message.places.map((p) => (
            <PlaceCardView key={p.id} place={p} />
          ))}
        </ScrollView>
      ) : null}
      {message.posts.length ? (
        <View className="gap-1.5 pl-9">
          <Text className="text-xs font-bold text-muted">{t("assistant.fromTravelers")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-4">
            {message.posts.map((p) => (
              <PostChip key={p.id} post={p} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function PlaceCardView({ place }: { place: PlaceCard }) {
  const openMap = () => {
    if (place.latitude === null || place.longitude === null) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert(t("post.mapsError")));
  };
  return (
    <View className="w-60 gap-1.5 rounded-md bg-white p-3.5">
      <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{place.name}</Text>
      <Text className="text-[13px] text-muted" numberOfLines={1}>
        {flagEmoji(place.countryCode)} {[place.city, place.country].filter(Boolean).join(", ")}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="calendar-outline" size={14} color={colors.deepGreen} />
        <Text className="text-[13px] font-bold text-deep-green" numberOfLines={1}>
          {t("assistant.bestTime", { months: monthRanges(place.bestMonths) })}
        </Text>
      </View>
      {place.seasonNotes ? <Text className="text-xs leading-4 text-muted" numberOfLines={2}>{place.seasonNotes}</Text> : null}
      {place.latitude !== null ? (
        <Pressable onPress={openMap} accessibilityRole="button" className="mt-1 flex-row items-center gap-1 self-start active:opacity-70">
          <Ionicons name="map-outline" size={14} color={colors.tealGreen} />
          <Text className="text-xs font-bold text-teal-green">{t("assistant.openMap")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PostChip({ post }: { post: FeedPost }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: String(post.id) } })}
      accessibilityRole="button"
      accessibilityLabel={post.title ?? post.place.name}
      className="w-44 overflow-hidden rounded-md bg-white active:opacity-80"
    >
      <Img source={sizedImage(post.imageUrl, 176)} className="h-24 w-44 bg-lime-tint" contentFit="cover" transition={150} />
      <View className="gap-0.5 p-2.5">
        <Text className="text-[13px] font-bold text-ink" numberOfLines={1}>{post.title ?? post.place.name}</Text>
        <Text className="text-xs text-muted" numberOfLines={1}>{post.author.name}</Text>
      </View>
    </Pressable>
  );
}
