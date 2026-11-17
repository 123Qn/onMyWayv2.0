import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { cn } from "../lib/cn";
import { flagEmoji } from "../lib/format";
import { colors } from "../lib/theme";

export type Destination = { code: string; name: string; count: number };

const postsLabel = (count: number) =>
  count === 1 ? t("feed.destination.postsOne") : t("feed.destination.postsOther", { count });

type Props = {
  destinations: Destination[];
  /** Selected country code, or null for all destinations */
  value: string | null;
  onChange: (code: string | null) => void;
  totalCount: number;
};

export function DestinationFilter({ destinations, value, onChange, totalCount }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = destinations.find((d) => d.code === value);

  const pick = (code: string | null) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t("feed.destination.choose")}: ${selected?.name ?? t("feed.destination.all")}`}
        className={cn("h-9 flex-row items-center gap-1.5 self-start rounded-[18px] px-3.5 active:opacity-80", value ? "bg-deep-green" : "bg-lime-tint")}
      >
        {selected ? (
          <Text className="text-base">{flagEmoji(selected.code)}</Text>
        ) : (
          <Ionicons name="location" size={16} color={colors.deepGreen} />
        )}
        <Text className={cn("max-w-[220px] text-sm font-bold", value ? "text-white" : "text-deep-green")} numberOfLines={1}>
          {selected?.name ?? t("feed.destination.all")}
        </Text>
        <Ionicons name="chevron-down" size={16} color={value ? colors.white : colors.deepGreen} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-ink/40"
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t("feed.destination.close")}
        />
        <View className="max-h-[75%] rounded-t-lg bg-white px-4 pt-2.5" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-3.5 h-1 w-10 self-center rounded-sm bg-line" />
          <Text className="mb-2 px-1 text-xl font-bold text-ink">{t("feed.destination.title")}</Text>

          <ScrollView className="grow-0" bounces={false}>
            <Option
              icon={<Ionicons name="earth" size={22} color={colors.deepGreen} />}
              label={t("feed.destination.all")}
              count={totalCount}
              selected={value === null}
              onPress={() => pick(null)}
            />
            {destinations.map((d) => (
              <Option
                key={d.code}
                icon={<Text className="text-2xl">{flagEmoji(d.code)}</Text>}
                label={d.name}
                count={d.count}
                selected={d.code === value}
                onPress={() => pick(d.code)}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

type OptionProps = {
  icon: ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
};

function Option({ icon, label, count, selected, onPress }: OptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn("flex-row items-center gap-3.5 rounded-md p-3", selected ? "bg-lime-tint" : "active:bg-soft-gray")}
    >
      <View className="w-8 items-center">{icon}</View>
      <View className="flex-1 gap-0.5">
        <Text className={cn("text-base text-ink", selected && "font-bold")}>{label}</Text>
        <Text className="text-[13px] text-muted">{postsLabel(count)}</Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.deepGreen} /> : null}
    </Pressable>
  );
}
