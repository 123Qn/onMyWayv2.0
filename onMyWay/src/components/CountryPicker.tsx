import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { fetchCountries, type Country } from "../lib/communityApi";
import { flagEmoji } from "../lib/format";
import { colors } from "../lib/theme";
import { Loading, ScreenHeader, SearchField } from "./ui";

let cached: Country[] | null = null;

/** Full-screen searchable list of countries */
export function CountryPicker({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string | null;
  onSelect: (country: Country | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [countries, setCountries] = useState<Country[] | null>(cached);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible || cached) return;
    fetchCountries().then(
      (list) => {
        cached = list;
        setCountries(list);
      },
      () => setCountries([])
    );
  }, [visible]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? (countries ?? []).filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) : (countries ?? []);
  }, [countries, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ScreenHeader title={t("editProfile.country")} icon="close" onBack={onClose} />
        <SearchField value={query} onChangeText={setQuery} placeholder={t("editProfile.searchCountry")} className="mx-4 mb-2" />
        {countries === null ? (
          <Loading className="mt-8" />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListHeaderComponent={
              value ? (
                <Pressable onPress={() => onSelect(null)} accessibilityRole="button" className="flex-row items-center gap-3 px-5 py-3.25">
                  <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
                  <Text className="flex-1 text-base text-muted">{t("editProfile.noCountry")}</Text>
                </Pressable>
              ) : undefined
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.code === value }}
                className="flex-row items-center gap-3 px-5 py-3.25 active:bg-soft-gray"
              >
                <Text className="text-[22px]">{flagEmoji(item.code)}</Text>
                <Text className="flex-1 text-base text-ink">{item.name}</Text>
                {item.code === value ? <Ionicons name="checkmark" size={20} color={colors.deepGreen} /> : null}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
