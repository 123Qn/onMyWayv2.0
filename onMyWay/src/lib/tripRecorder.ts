import { useSyncExternalStore } from "react";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { apiFetch, loadSession } from "./api";
import { t } from "../i18n";
import { colors } from "./theme";

// Records the user's position every few minutes while a trip is running, also with the screen
// off (Android foreground service with a notification). Points go to the server, which keeps the
// track, the real distance and the stops reached.

export const TRIP_TASK = "onmyway-trip-location";
const ACTIVE_KEY = "onmyway.activeTrip";
// Every 3 minutes in real builds; every 15 s in development so a fake-GPS drive can be tested quickly
const INTERVAL_MS = __DEV__ ? 15 * 1000 : 3 * 60 * 1000;
const MIN_DISTANCE_M = 50;

export type TripRun = {
  id: number;
  postId: number | null;
  startedAt: string;
  endedAt: string | null;
  distanceKm: number;
  visitedStops: string[];
  lastPosition: { latitude: number; longitude: number; at: string } | null;
};

type Position = { latitude: number; longitude: number; accuracy?: number | null };

type RecorderState = {
  run: TripRun | null;
  position: Position | null;
  /** "background": screen-off recording; "foreground": only while the app is open */
  mode: "background" | "foreground" | null;
};

let state: RecorderState = { run: null, position: null, mode: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<RecorderState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useTripRecorder = () => useSyncExternalStore(subscribe, () => state);

type PointInput = { latitude: number; longitude: number; accuracy: number | null; recordedAt: string };

const toPoint = (l: Location.LocationObject): PointInput => ({
  latitude: l.coords.latitude,
  longitude: l.coords.longitude,
  accuracy: l.coords.accuracy ?? null,
  recordedAt: new Date(l.timestamp).toISOString(),
});

async function sendPoints(locations: Location.LocationObject[]) {
  // Mocked (fake GPS) fixes never count in real builds; development accepts them for testing
  const real = locations.filter((l) => __DEV__ || !l.mocked);
  if (real.length === 0) return;
  const latest = real[real.length - 1];
  setState({ position: { latitude: latest.coords.latitude, longitude: latest.coords.longitude, accuracy: latest.coords.accuracy } });

  const saved = await SecureStore.getItemAsync(ACTIVE_KEY);
  if (!saved) return;
  const { runId } = JSON.parse(saved) as { runId: number };
  // The background task can run before the app UI: make sure the session is loaded
  await loadSession();
  const run = await apiFetch<TripRun>(`/trip-runs/${runId}/points`, { method: "POST", body: { points: real.map(toPoint) } });
  setState({ run });
}

// Must be defined at module load (imported from the root layout) so Android can wake it up
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TRIP_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await sendPoints(data.locations).catch(() => {});
});

// Foreground fallback when "Allow all the time" was not granted
let watcher: Location.LocationSubscription | null = null;

async function startForegroundWatch() {
  watcher?.remove();
  watcher = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: INTERVAL_MS, distanceInterval: MIN_DISTANCE_M },
    (l) => sendPoints([l]).catch(() => {})
  );
}

async function startUpdates(): Promise<RecorderState["mode"]> {
  const background = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  if (background?.granted) {
    await Location.startLocationUpdatesAsync(TRIP_TASK, {
      // GPS-grade fixes: "Balanced" relies on Wi-Fi/cell and drifts on roads (and gets no fixes on emulators)
      accuracy: Location.Accuracy.High,
      timeInterval: INTERVAL_MS,
      distanceInterval: MIN_DISTANCE_M,
      deferredUpdatesInterval: INTERVAL_MS,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: t("trip.notificationTitle"),
        notificationBody: t("trip.notificationBody"),
        notificationColor: colors.deepGreen,
      },
    });
    return "background";
  }
  await startForegroundWatch();
  return "foreground";
}

async function stopUpdates() {
  watcher?.remove();
  watcher = null;
  if (await Location.hasStartedLocationUpdatesAsync(TRIP_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TRIP_TASK).catch(() => {});
  }
}

export class LocationPermissionError extends Error {}

export async function startTrip(postId: number) {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new LocationPermissionError("location");

  const run = await apiFetch<TripRun>("/trip-runs", { method: "POST", body: { postId } });
  await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify({ runId: run.id, postId }));
  setState({ run, position: null });

  // A first fix right away so the map shows where you are
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    .then((l) => sendPoints([l]))
    .catch(() => {});

  setState({ mode: await startUpdates() });
  return run;
}

export async function endTrip() {
  const run = state.run;
  await stopUpdates();
  await SecureStore.deleteItemAsync(ACTIVE_KEY);
  setState({ run: null, mode: null });
  if (run) return apiFetch<TripRun>(`/trip-runs/${run.id}/end`, { method: "POST" });
  return null;
}

/** After sign-in / app start: pick up a trip that is still running on the server */
export async function restoreTrip() {
  const run = await apiFetch<TripRun | null>("/trip-runs/active");
  if (!run) {
    await stopUpdates();
    await SecureStore.deleteItemAsync(ACTIVE_KEY);
    setState({ run: null, mode: null });
    return;
  }
  await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify({ runId: run.id, postId: run.postId }));
  const position = run.lastPosition ? { latitude: run.lastPosition.latitude, longitude: run.lastPosition.longitude } : null;
  setState({ run, position });
  // (Re)start with the current options; calling it again on a running task just updates them
  setState({ mode: await startUpdates() });
}

/** Sign-out: stop recording on this device (the server run stays until ended) */
export async function resetTripRecorder() {
  await stopUpdates();
  await SecureStore.deleteItemAsync(ACTIVE_KEY).catch(() => {});
  setState({ run: null, position: null, mode: null });
}

/** One-off fix for the map before a trip starts */
export async function currentPosition(): Promise<Position | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const fix =
    (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(() => null)) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
  return fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy } : null;
}

export type Route = { coordinates: [number, number][]; distanceKm: number; durationMin: number };

export const fetchRoute = (points: { latitude: number; longitude: number }[]) =>
  apiFetch<Route>(`/route?points=${points.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join(";")}`);
