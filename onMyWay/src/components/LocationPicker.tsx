import { useMemo, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { cn } from "../lib/cn";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { t } from "../i18n";
import { colors } from "../lib/theme";
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
      <View className="flex-1 bg-lime-tint">
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
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          {/* Lifted so the icon's tip (not its middle) sits on the map center */}
          <Ionicons
            name="location"
            size={PIN}
            color={colors.deepGreen}
            style={{ marginTop: -PIN, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 6 }}
          />
          <View className="-mt-0.5 h-1 w-2.5 rounded-full bg-black/25" />
        </View>

        <View className="absolute left-4 right-4 top-0 flex-row items-center gap-2.5" style={{ paddingTop: insets.top + 8 }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("picker.close")} className={ROUND}>
            <Ionicons name="close" size={22} color={colors.inkBlack} />
          </Pressable>
          <View className="h-11 flex-1 flex-row items-center gap-2 rounded-[22px] bg-white px-3.5 shadow-md">
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              className="flex-1 py-0 text-[15px] text-ink"
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

        <View className="absolute bottom-0 left-4 right-4 gap-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Pressable onPress={goToMe} accessibilityRole="button" accessibilityLabel={t("picker.myLocation")} className={cn(ROUND, "self-end")}>
            <Ionicons name="locate" size={22} color={colors.deepGreen} />
          </Pressable>
          <View className="gap-2 rounded-[20px] bg-white p-4 shadow-lg">
            <Text className="text-[13px] text-muted">{t("picker.hint")}</Text>
            <Text className="mb-1 text-[15px] font-bold text-ink">
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
// Round white floating button over the map
const ROUND = "h-11 w-11 items-center justify-center rounded-full bg-white shadow-md";
