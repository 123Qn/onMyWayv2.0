import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../../i18n";
import { useAuth } from "../../lib/AuthContext";
import type { FeedPost, TripStop } from "../../lib/feed";
import { usePost } from "../../lib/usePost";
import { refreshMyProfile } from "../../lib/profileApi";
import {
  LocationPermissionError,
  currentPosition,
  endTrip,
  fetchRoute,
  startTrip,
  useTripRecorder,
  type Route,
} from "../../lib/tripRecorder";
import { colors } from "../../lib/theme";
import { LiveTripMap } from "../../components/LiveTripMap";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Stat } from "../../components/ui";

const OFF_ROUTE_M = 300;
const REROUTE_MIN_MS = 60_000;
const PREVIEW_REFRESH_MS = 2 * 60 * 1000;

type Point = { latitude: number; longitude: number };

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { post, missing } = usePost(Number(id));
  if (!post && !missing) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white">
        <ActivityIndicator color={colors.deepGreen} />
      </View>
    );
  }
  if (!post || post.stops.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white">
        <Text className="text-[17px] font-bold text-ink">{t("post.notFound")}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <Text className="text-sm font-bold text-deep-green">{t("post.back")}</Text>
        </Pressable>
      </View>
    );
  }
  return <TripMode post={post} />;
}

function TripMode({ post }: { post: FeedPost }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const recorder = useTripRecorder();
  const activeHere = !!recorder.run && recorder.run.postId === post.id;
  const activeElsewhere = !!recorder.run && !activeHere;

  const [previewPosition, setPreviewPosition] = useState<Point | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [routeFailed, setRouteFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const [, setTick] = useState(0);

  const position: Point | null = activeHere ? (recorder.position ?? previewPosition) : previewPosition;
  const visited = useMemo(() => new Set(activeHere ? recorder.run!.visitedStops : []), [activeHere, recorder.run]);
  const remaining = useMemo(() => post.stops.filter((s) => !visited.has(s.id)), [post.stops, visited]);
  const nextStop: TripStop | undefined = remaining[0];

  // Where you are before the trip starts (and between recorder updates), every couple of minutes
  useEffect(() => {
    let alive = true;
    const update = () => currentPosition().then((p) => alive && p && setPreviewPosition(p));
    update();
    const timer = setInterval(update, PREVIEW_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Elapsed time on screen
  useEffect(() => {
    if (!activeHere) return;
    const timer = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, [activeHere]);

  // Road route: from you through the stops left once the trip runs, otherwise through all stops
  // (a single place is routed from where you are).
  // Redrawn when a stop is reached or when you are more than 300 m off the drawn route.
  const lastRouteAt = useRef(0);
  const routeKey = useRef("");

  const requestRoute = useCallback(
    async (points: Point[], key: string) => {
      lastRouteAt.current = Date.now();
      routeKey.current = key;
      try {
        setRoute(await fetchRoute(points));
        setRouteFailed(false);
      } catch {
        setRouteFailed(true);
      }
    },
    []
  );

  useEffect(() => {
    const stops = activeHere ? remaining : post.stops;
    const from = (activeHere || stops.length < 2) && position ? [position] : [];
    const points = [...from, ...stops];
    if (points.length < 2) {
      // Nothing to route yet (e.g. a single place before your location is known)
      setRoute(null);
      setRouteFailed(stops.length > 0 && !!position);
      return;
    }
    const key = `${activeHere}|${stops.map((s) => s.id).join(",")}`;
    const changedStops = key !== routeKey.current;
    const offRoute =
      activeHere && position && route ? distanceToPolylineM(position, route.coordinates) > OFF_ROUTE_M : false;
    const waited = Date.now() - lastRouteAt.current > REROUTE_MIN_MS;
    if (changedStops || (offRoute && waited) || (activeHere && position && !route && waited)) {
      requestRoute(points, key);
    }
  }, [activeHere, remaining, post.stops, position, route, requestRoute]);

  // Fit the map once something meaningful appears
  const fittedFor = useRef("");
  useEffect(() => {
    const key = `${!!route}|${!!position}|${activeHere}`;
    if (route && key !== fittedFor.current) {
      fittedFor.current = key;
      setFitKey((k) => k + 1);
    }
  }, [route, position, activeHere]);

  const start = async () => {
    setBusy(true);
    try {
      await startTrip(post.id);
    } catch (e) {
      if (e instanceof LocationPermissionError) Alert.alert(t("trip.permissionTitle"), t("trip.permissionBody"));
      else Alert.alert(t("trip.startFailed"), e instanceof Error ? e.message : t("common.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnd = () =>
    Alert.alert(t("trip.endTitle"), t("trip.endBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("trip.end"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            const ended = await endTrip();
            if (ended) {
              Alert.alert(
                t("trip.summaryTitle"),
                t("trip.summaryBody", {
                  km: ended.distanceKm.toFixed(1),
                  stops: ended.visitedStops.length,
                  total: post.stops.length,
                })
              );
            }
            // Real kilometres can unlock badges
            if (user) refreshMyProfile(user.id).catch(() => {});
          } catch (e) {
            Alert.alert(e instanceof Error ? e.message : t("common.genericError"));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const openInMaps = () => {
    const target = nextStop ?? post.stops[post.stops.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${target.latitude},${target.longitude}`)}`;
    Linking.openURL(url).catch(() => Alert.alert(t("post.mapsError")));
  };

  const elapsed = activeHere ? formatElapsed(Date.now() - Date.parse(recorder.run!.startedAt)) : null;

  return (
    <View className="flex-1 bg-lime-tint">
      <LiveTripMap
        stops={post.stops}
        visited={visited}
        route={route?.coordinates ?? null}
        user={position}
        fitKey={fitKey}
        className="absolute inset-0"
      />

      <View className="absolute left-4 right-4 top-0 flex-row items-center gap-2.5" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("post.back")} className={ROUND}>
          <Ionicons name="chevron-back" size={22} color={colors.inkBlack} />
        </Pressable>
        <View className="min-h-11 flex-1 justify-center rounded-[22px] bg-white px-4 py-1.5 shadow-md">
          <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{post.title ?? post.place.name}</Text>
          {activeHere ? (
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-error" />
              <Text className="text-xs font-bold text-error">{t("trip.recording")}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={() => setFitKey((k) => k + 1)} accessibilityRole="button" accessibilityLabel={t("trip.recenter")} className={ROUND}>
          <Ionicons name="locate" size={20} color={colors.deepGreen} />
        </Pressable>
      </View>

      <View className="absolute bottom-0 left-0 right-0 gap-3.5 rounded-t-[28px] bg-white px-5 pt-4.5 shadow-xl" style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        {nextStop ? (
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-deep-green">
              <Text className="text-[15px] font-bold text-white">{post.stops.indexOf(nextStop) + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted">{post.stops.length === 1 ? t("trip.destination") : activeHere ? t("trip.nextStop") : t("trip.firstStop")}</Text>
              <Text className="text-[17px] font-bold text-ink" numberOfLines={1}>{nextStop.name}</Text>
            </View>
            {route ? (
              <Text className="text-sm font-bold text-deep-green">
                {t("trip.routeSummary", { km: route.distanceKm.toFixed(1), time: formatElapsed(route.durationMin * 60_000) })}
              </Text>
            ) : routeFailed ? (
              <Text className="text-xs text-muted">{t("trip.noRoute")}</Text>
            ) : (
              <ActivityIndicator size="small" color={colors.deepGreen} />
            )}
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <Ionicons name="trophy" size={28} color={colors.gold} />
            <Text className="flex-1 text-[17px] font-bold text-ink">{t("trip.allStops")}</Text>
          </View>
        )}

        {activeHere ? (
          <View className="flex-row rounded-md bg-soft-gray py-3">
            <Stat compact value={recorder.run!.distanceKm.toFixed(1)} label={t("trip.kmRecorded")} />
            <Stat compact value={`${visited.size}/${post.stops.length}`} label={t("trip.stops")} />
            <Stat compact value={elapsed ?? "0m"} label={t("trip.elapsed")} />
          </View>
        ) : null}

        {activeHere && recorder.mode === "foreground" ? (
          <Text className="text-xs leading-[17px] text-muted">{t("trip.foregroundOnly")}</Text>
        ) : null}

        <View className="gap-2.5">
          {activeHere ? (
            <PrimaryButton title={t("trip.end")} icon="flag" variant="danger" onPress={confirmEnd} loading={busy} />
          ) : (
            <PrimaryButton
              title={activeElsewhere ? t("trip.switch") : t("trip.start")}
              icon="navigate"
              onPress={start}
              loading={busy}
            />
          )}
          <Pressable onPress={openInMaps} accessibilityRole="button" className="flex-row items-center justify-center gap-1.5 py-1">
            <Ionicons name="open-outline" size={16} color={colors.deepGreen} />
            <Text className="text-sm font-bold text-deep-green">{t("trip.openGoogleMaps")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Round white floating button over the map
const ROUND = "h-11 w-11 items-center justify-center rounded-full bg-white shadow-md";

function formatElapsed(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

// Shortest distance from a point to a [lat, lng] polyline, in metres (flat-earth approximation)
function distanceToPolylineM(p: Point, line: [number, number][]) {
  if (line.length === 0) return Infinity;
  const k = Math.cos((p.latitude * Math.PI) / 180);
  const toXY = (lat: number, lng: number) => [lng * k * 111_320, lat * 110_540];
  const [px, py] = toXY(p.latitude, p.longitude);
  let best = Infinity;
  for (let i = 0; i < line.length; i++) {
    const [ax, ay] = toXY(line[i][0], line[i][1]);
    const [bx, by] = i + 1 < line.length ? toXY(line[i + 1][0], line[i + 1][1]) : [ax, ay];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  return best;
}
