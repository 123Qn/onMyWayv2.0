import { Pressable, ScrollView, Text } from "react-native";
import { t } from "../i18n";
import { cn } from "../lib/cn";
import type { PlaceCategory } from "../lib/feed";

export type CategoryFilter = PlaceCategory | "all";

const CATEGORIES: CategoryFilter[] = ["all", "beach", "island", "mountain", "city", "food", "nature", "culture"];

type Props = { value: CategoryFilter; onChange: (value: CategoryFilter) => void };

export function CategoryChips({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
      {CATEGORIES.map((category) => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={cn(
              "h-[38px] justify-center rounded-[19px] border px-4",
              selected ? "border-deep-green bg-deep-green" : "border-line bg-white active:bg-lime-tint"
            )}
          >
            <Text className={cn("text-sm", selected ? "font-bold text-white" : "text-ink")}>{t(`feed.categories.${category}`)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
