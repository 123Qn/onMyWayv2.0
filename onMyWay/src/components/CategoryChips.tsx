import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { t } from "../i18n";
import type { PlaceCategory } from "../lib/feed";
import { colors, font } from "../lib/theme";

export type CategoryFilter = PlaceCategory | "all";

const CATEGORIES: CategoryFilter[] = ["all", "beach", "island", "mountain", "city", "food", "nature", "culture"];

type Props = { value: CategoryFilter; onChange: (value: CategoryFilter) => void };

export function CategoryChips({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CATEGORIES.map((category) => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && !selected && styles.chipPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {t(`feed.categories.${category}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen },
  chipPressed: { backgroundColor: colors.limeTint },
  label: { color: colors.inkBlack, fontSize: 14, fontWeight: font.regular },
  labelSelected: { color: colors.white, fontWeight: font.bold },
});
