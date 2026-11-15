import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { flagEmoji } from "../lib/format";
import { colors, font, radius } from "../lib/theme";

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
        style={({ pressed }) => [styles.pill, value && styles.pillActive, pressed && styles.pillPressed]}
      >
        {selected ? (
          <Text style={styles.flag}>{flagEmoji(selected.code)}</Text>
        ) : (
          <Ionicons name="location" size={16} color={colors.deepGreen} />
        )}
        <Text style={[styles.pillText, value && styles.pillTextActive]} numberOfLines={1}>
          {selected?.name ?? t("feed.destination.all")}
        </Text>
        <Ionicons name="chevron-down" size={16} color={value ? colors.white : colors.deepGreen} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t("feed.destination.close")}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{t("feed.destination.title")}</Text>

          <ScrollView style={styles.list} bounces={false}>
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
                icon={<Text style={styles.optionFlag}>{flagEmoji(d.code)}</Text>}
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
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}
    >
      <View style={styles.optionIcon}>{icon}</View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
        <Text style={styles.optionCount}>{postsLabel(count)}</Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.deepGreen} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.limeTint,
  },
  pillActive: { backgroundColor: colors.deepGreen },
  pillPressed: { opacity: 0.8 },
  pillText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold, maxWidth: 220 },
  pillTextActive: { color: colors.white },
  flag: { fontSize: 16 },

  backdrop: { flex: 1, backgroundColor: "rgba(27,43,40,0.4)" },
  sheet: {
    maxHeight: "75%",
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  sheetTitle: {
    color: colors.inkBlack,
    fontSize: 20,
    fontWeight: font.bold,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  optionSelected: { backgroundColor: colors.limeTint },
  optionPressed: { backgroundColor: colors.softGray },
  optionIcon: { width: 32, alignItems: "center" },
  optionFlag: { fontSize: 24 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: colors.inkBlack, fontSize: 16, fontWeight: font.regular },
  optionLabelSelected: { fontWeight: font.bold },
  optionCount: { color: colors.textMuted, fontSize: 13, fontWeight: font.regular },
});
