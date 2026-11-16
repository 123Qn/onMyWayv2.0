import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import type { TripStop } from "../lib/feed";
import { colors } from "../lib/theme";

type Props = {
  stops: TripStop[];
  visited: Set<string>;
  /** Road route as [lat, lng] pairs */
  route: [number, number][] | null;
  user: { latitude: number; longitude: number } | null;
  /** Bump to re-fit the map around the route and the user */
  fitKey: number;
  style?: StyleProp<ViewStyle>;
};

// Leaflet map for a running trip: road route, stops (ticked when reached) and the user's dot.
// The page loads once; changes are pushed in with injectJavaScript so the map never reloads.
export function LiveTripMap({ stops, visited, route, user, fitKey, style }: Props) {
  const webview = useRef<ComponentRef<typeof WebView>>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildHtml(), []);

  const run = (js: string) => webview.current?.injectJavaScript(`${js}; true;`);

  useEffect(() => {
    if (!ready) return;
    const data = stops.map((s, i) => ({ id: s.id, n: i + 1, lat: s.latitude, lng: s.longitude, name: s.name, done: visited.has(s.id) }));
    run(`setStops(${JSON.stringify(data)})`);
  }, [ready, stops, visited]);

  useEffect(() => {
    if (ready) run(`setRoute(${JSON.stringify(route ?? [])})`);
  }, [ready, route]);

  useEffect(() => {
    if (ready && user) run(`setUser(${user.latitude}, ${user.longitude})`);
  }, [ready, user]);

  useEffect(() => {
    if (ready) run("fitAll()");
  }, [ready, fitKey]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webview}
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://onmyway.app/" }}
        style={styles.webview}
        onLoadEnd={() => setReady(true)}
        javaScriptEnabled
        setBuiltInZoomControls={false}
      />
    </View>
  );
}

function buildHtml() {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: ${colors.limeTint}; }
  .pin { width: 30px; height: 30px; border-radius: 15px; background: ${colors.deepGreen}; color: #fff;
         border: 3px solid #fff; box-sizing: border-box; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
         font: 700 13px/24px -apple-system, Roboto, sans-serif; text-align: center; }
  .pin.done { background: ${colors.limeGreen}; color: ${colors.inkBlack}; }
  .me { width: 18px; height: 18px; border-radius: 9px; background: ${colors.skyBlue}; border: 3px solid #fff;
        box-sizing: border-box; box-shadow: 0 0 0 6px rgba(76,180,230,0.25); }
  .leaflet-control-attribution { font-size: 9px; }
  .leaflet-popup-content { font: 700 13px -apple-system, Roboto, sans-serif; color: ${colors.inkBlack}; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, zoomSnap: 0.25 }).setView([16.05, 108.2], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  map.attributionControl.setPrefix(false);

  var stopLayer = L.layerGroup().addTo(map);
  var routeBase = null, routeDash = null, me = null, bounds = [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }

  function setStops(stops) {
    stopLayer.clearLayers();
    bounds = stops.map(function (s) { return [s.lat, s.lng]; });
    stops.forEach(function (s) {
      var icon = L.divIcon({ className: '', html: '<div class="pin' + (s.done ? ' done' : '') + '">' + (s.done ? '&#10003;' : s.n) + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
      L.marker([s.lat, s.lng], { icon: icon, keyboard: false }).bindPopup(s.n + '. ' + esc(s.name)).addTo(stopLayer);
    });
  }

  function setRoute(coords) {
    if (routeBase) { map.removeLayer(routeBase); map.removeLayer(routeDash); routeBase = routeDash = null; }
    if (!coords.length) return;
    routeBase = L.polyline(coords, { color: '${colors.inkBlack}', weight: 7, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    routeDash = L.polyline(coords, { color: '${colors.limeGreen}', weight: 2.5, dashArray: '6 8', lineCap: 'round' }).addTo(map);
    stopLayer.eachLayer(function (m) { m.bringToFront && m.bringToFront(); });
  }

  function setUser(lat, lng) {
    var icon = L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    if (me) me.setLatLng([lat, lng]); else me = L.marker([lat, lng], { icon: icon, keyboard: false, zIndexOffset: 1000 }).addTo(map);
  }

  function fitAll() {
    var pts = bounds.slice();
    if (me) pts.push(me.getLatLng());
    if (routeBase) pts = pts.concat(routeBase.getLatLngs());
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(pts, { paddingTopLeft: [40, 120], paddingBottomRight: [40, 300], maxZoom: 16 });
  }
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", backgroundColor: colors.limeTint },
  webview: { flex: 1, backgroundColor: "transparent" },
});
