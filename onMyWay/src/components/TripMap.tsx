import { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "../lib/cn";
import { WebView } from "react-native-webview";
import type { TripStop } from "../lib/feed";
import { colors } from "../lib/theme";

type Props = {
  stops: TripStop[];
  /** false = static preview (no gestures), true = pan/zoom and tappable pins */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

// Leaflet map in a WebView: numbered pins + the route drawn like the onMyWay logo road
// (dark line with lime dashes). OpenStreetMap tiles need no API key — fine for development;
// switch to a hosted tile provider before production (OSM's tile usage policy).
export function TripMap({ stops, interactive = false, style, className }: Props) {
  const html = useMemo(() => buildHtml(stops, interactive), [stops, interactive]);

  return (
    <View className={cn("overflow-hidden bg-lime-tint", className)} style={style} pointerEvents={interactive ? "auto" : "none"}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://onmyway.app/" }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        javaScriptEnabled
      />
    </View>
  );
}

function buildHtml(stops: TripStop[], interactive: boolean) {
  const points = stops.map((s) => ({
    lat: s.latitude,
    lng: s.longitude,
    name: s.name,
    caption: s.caption,
  }));

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: ${colors.limeTint}; }
  .pin {
    width: 30px; height: 30px; border-radius: 15px;
    background: ${colors.deepGreen}; color: #fff;
    border: 3px solid #fff; box-sizing: border-box;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    font: 700 13px/24px -apple-system, Roboto, sans-serif; text-align: center;
  }
  .leaflet-popup-content { font: 400 13px/1.4 -apple-system, Roboto, sans-serif; color: ${colors.inkBlack}; }
  .leaflet-popup-content b { display: block; font-weight: 700; font-size: 14px; margin-bottom: 2px; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var points = ${JSON.stringify(points)};
  var interactive = ${interactive ? "true" : "false"};
  var map = L.map('map', {
    zoomControl: false,
    dragging: interactive,
    touchZoom: interactive,
    doubleClickZoom: interactive,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: interactive,
    zoomSnap: 0.25,
    attributionControl: true
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.attributionControl.setPrefix(false);

  var latlngs = points.map(function (p) { return [p.lat, p.lng]; });
  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '${colors.inkBlack}', weight: 7, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    L.polyline(latlngs, { color: '${colors.limeGreen}', weight: 2.5, dashArray: '6 8', lineCap: 'round' }).addTo(map);
  }

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  points.forEach(function (p, i) {
    var icon = L.divIcon({ className: '', html: '<div class="pin">' + (i + 1) + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
    var marker = L.marker([p.lat, p.lng], { icon: icon, keyboard: false }).addTo(map);
    if (interactive) marker.bindPopup('<b>' + (i + 1) + '. ' + esc(p.name) + '</b>' + esc(p.caption));
  });

  function fit() {
    if (latlngs.length === 1) map.setView(latlngs[0], 13);
    // Full-screen map has overlays at the top (title) and bottom (button)
    else if (interactive) map.fitBounds(latlngs, { paddingTopLeft: [40, 150], paddingBottomRight: [40, 150], maxZoom: 15 });
    else map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 15 });
  }
  fit();
  // The WebView can report its final size a moment after load
  setTimeout(function () { map.invalidateSize(); fit(); }, 300);
</script>
</body>
</html>`;
}
