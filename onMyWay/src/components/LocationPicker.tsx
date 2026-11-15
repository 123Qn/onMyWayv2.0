import { useMemo, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { t } from "../i18n";
import { colors, font } from "../lib/theme";
import { PrimaryButton } from "./PrimaryButton";

export type Coords = { latitude: number; longitude: number };

type Props = {
  visible: boolean;
  /** Where to open the map; falls back to the user's position, then Vietnam */
  initial?: Coords;
  /** Text to search right away (e.g. the place name already typed) */
  initialQuery?: string;
  onConfirm: (coords: Coords) => void;
  onClose: () => void;
};

const DEFAULT_CENTER: Coords = { latitude: 16.05, longitude: 108.2 };

// Full-screen map with a fixed pin in the middle: search an address or drag the map under the pin
export function LocationPicker({ visible, initial, initialQuery, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const webview = useRef<ComponentRef<typeof WebView>>(null);
  const [center, setCenter] = useState<Coords>(initial ?? DEFAULT_CENTER);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [searching, setSearching] = useState(false);

  // Built once per opening so panning doesn't reload the page
  const html = useMemo(() => buildHtml(initial ?? DEFAULT_CENTER, initial ? 16 : 5), [initial]);

  const moveTo = (c: Coords, zoom = 16) => {
    setCenter(c);
    webview.current?.injectJavaScript(`map.setView([${c.latitude}, ${c.longitude}], ${zoom}); true;`);
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const [hit] = await Location.geocodeAsync(q);
      if (hit) moveTo({ latitude: hit.latitude, longitude: hit.longitude });
      else Alert.alert(t("picker.noResults", { query: q }));
    } catch {
      Alert.alert(t("picker.noResults", { query: q }));
    } finally {
      setSearching(false);
    }
  };

  const goToMe = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return;
    const fix =
      (await Location.getLastKnownPositionAsync({ maxAge: 300_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
    if (fix) moveTo(fix.coords);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const { lat, lng } = JSON.parse(e.nativeEvent.data);
      setCenter({ latitude: lat, longitude: lng });
    } catch {
      // ignore anything that isn't a center update
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <WebView
          ref={webview}
          originWhitelist={["*"]}
          source={{ html, baseUrl: "https://onmyway.app/" }}
          style={StyleSheet.absoluteFill}
          onMessage={onMessage}
          // No pin yet but a name was typed: look it up straight away
          onLoadEnd={() => {
            if (!initial && query.trim()) search();
          }}
          javaScriptEnabled
          setBuiltInZoomControls={false}
        />

        {/* The pin stays in the middle; its tip marks the chosen spot */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <Ionicons name="location" size={44} color={colors.deepGreen} style={styles.pin} />
          <View style={styles.pinShadow} />
        </View>

        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("picker.close")} style={styles.round}>
            <Ionicons name="close" size={22} color={colors.inkBlack} />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              placeholder={t("picker.searchPlaceholder")}
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.deepGreen}
              returnKeyType="search"
            />
            {searching ? <ActivityIndicator size="small" color={colors.deepGreen} /> : null}
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={goToMe} accessibilityRole="button" accessibilityLabel={t("picker.myLocation")} style={[styles.round, styles.meButton]}>
            <Ionicons name="locate" size={22} color={colors.deepGreen} />
          </Pressable>
          <View style={styles.sheet}>
            <Text style={styles.hint}>{t("picker.hint")}</Text>
            <Text style={styles.coords}>
              {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
            </Text>
            <PrimaryButton title={t("picker.confirm")} icon="checkmark" onPress={() => onConfirm(center)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildHtml(start: Coords, zoom: number) {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: ${colors.limeTint}; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${start.latitude}, ${start.longitude}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  map.attributionControl.setPrefix(false);
  function report() {
    var c = map.getCenter();
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lng: c.lng }));
  }
  map.on('moveend', report);
  report();
</script>
</body>
</html>`;
}

const PIN = 44;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.limeTint },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  // Lift the icon so its tip (not its middle) sits on the map center
  pin: { marginTop: -PIN, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 6 },
  pinShadow: { width: 10, height: 4, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.25)", marginTop: -2 },
  top: { position: "absolute", left: 16, right: 16, top: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.inkBlack,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchBox: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    elevation: 3,
  },
  searchInput: { flex: 1, color: colors.inkBlack, fontSize: 15, paddingVertical: 0 },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 0, gap: 12 },
  meButton: { alignSelf: "flex-end" },
  sheet: { gap: 8, padding: 16, borderRadius: 20, backgroundColor: colors.white, elevation: 4 },
  hint: { color: colors.textMuted, fontSize: 13, fontWeight: font.regular },
  coords: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold, marginBottom: 4 },
});
