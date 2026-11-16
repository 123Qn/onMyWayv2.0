import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { fetchCountries, type Country } from "../lib/communityApi";
import { flagEmoji } from "../lib/format";
import { colors, font, radius } from "../lib/theme";

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
    fetchCountries().then((list) => {
      cached = list;
      setCountries(list);
    }, () => setCountries([]));
  }, [visible]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? (countries ?? []).filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) : (countries ?? []);
  }, [countries, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.cancel")} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.inkBlack} />
          </Pressable>
          <Text style={styles.title}>{t("editProfile.country")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("editProfile.searchCountry")}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            selectionColor={colors.tealGreen}
            cursorColor={colors.deepGreen}
          />
        </View>
        {countries === null ? (
          <ActivityIndicator color={colors.deepGreen} style={styles.loading} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListHeaderComponent={
              value ? (
                <Pressable onPress={() => onSelect(null)} accessibilityRole="button" style={styles.row}>
                  <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
                  <Text style={[styles.name, styles.muted]}>{t("editProfile.noCountry")}</Text>
                </Pressable>
              ) : undefined
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.code === value }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.flag}>{flagEmoji(item.code)}</Text>
                <Text style={styles.name}>{item.name}</Text>
                {item.code === value ? <Ionicons name="checkmark" size={20} color={colors.deepGreen} /> : null}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  headerSpacer: { width: 24 },
  title: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.softGray,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.inkBlack, fontSize: 15 },
  loading: { marginTop: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13 },
  pressed: { backgroundColor: colors.softGray },
  flag: { fontSize: 22 },
  name: { flex: 1, color: colors.inkBlack, fontSize: 16 },
  muted: { color: colors.textMuted },
});
