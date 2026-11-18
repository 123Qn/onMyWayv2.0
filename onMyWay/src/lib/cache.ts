import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { Directory, File, Paths } from "expo-file-system";

// Stale-while-revalidate cache for GET requests.
// A screen shows the last data it had right away, then refreshes it in the background.
// The same request asked for twice at once goes to the server once.
// persist: also kept on disk, so the screen has data at the next app start (before the network answers).

type Entry = { data?: unknown; at: number; inflight?: Promise<unknown> };

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

// Data belongs to the signed-in user: one account never sees another's cache
let scope: number | null = null;
const DIR = new Directory(Paths.cache, "query-cache");

/** Called by api.ts whenever the signed-in user changes; signing out wipes the cache */
export function setCacheScope(userId: number | null) {
  if (userId === scope) return;
  scope = userId;
  entries.clear();
  listeners.forEach((set) => set.forEach((l) => l()));
  if (userId === null) {
    try {
      if (DIR.exists) DIR.delete();
    } catch {}
  }
}

const diskFile = (key: string) => new File(DIR, `${scope}-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

function readDisk(key: string): Entry | undefined {
  if (scope === null) return undefined;
  try {
    const file = diskFile(key);
    if (!file.exists) return undefined;
    const { at, data } = JSON.parse(file.textSync());
    return { at, data };
  } catch {
    return undefined;
  }
}

function writeDisk(key: string, entry: Entry) {
  if (scope === null) return;
  try {
    DIR.create({ intermediates: true, idempotent: true });
    diskFile(key).write(JSON.stringify({ at: entry.at, data: entry.data })).catch(() => {});
  } catch {}
}

const persisted = new Set<string>();

function entry(key: string): Entry | undefined {
  let e = entries.get(key);
  // Disk is read once per key, on first use
  if (!e && persisted.has(key)) {
    e = readDisk(key);
    if (e) entries.set(key, e);
  }
  return e;
}

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

/** The cached value, without fetching */
export function peekCache<T>(key: string, opts: { persist?: boolean } = {}): T | undefined {
  if (opts.persist) persisted.add(key);
  return entry(key)?.data as T | undefined;
}

/** Store a value got some other way (e.g. a POST that returns the fresh object) */
export function setCache<T>(key: string, data: T, opts: { persist?: boolean } = {}) {
  if (opts.persist) persisted.add(key);
  const e: Entry = { ...entries.get(key), data, at: Date.now() };
  entries.set(key, e);
  if (persisted.has(key)) writeDisk(key, e);
  notify(key);
}

/** Change a cached value in place (optimistic updates); no-op when nothing is cached */
export function updateCache<T>(key: string, fn: (data: T) => T) {
  const e = entry(key);
  if (e?.data === undefined) return;
  setCache(key, fn(e.data as T));
}

/** Mark matching keys stale so the next read goes to the server */
export function invalidateCache(prefix: string) {
  for (const [key, e] of entries) if (key.startsWith(prefix)) e.at = 0;
}

export type FetchOptions = {
  /** Data younger than this is returned without a request (ms) */
  maxAge?: number;
  persist?: boolean;
  /** Always ask the server (pull-to-refresh) */
  force?: boolean;
};

/** Cached data if fresh enough, otherwise one shared request */
export function cachedFetch<T>(key: string, fetcher: () => Promise<T>, { maxAge = 0, persist = false, force = false }: FetchOptions = {}): Promise<T> {
  if (persist) persisted.add(key);
  const e = entry(key);
  if (e?.inflight) return e.inflight as Promise<T>;
  if (!force && e?.data !== undefined && Date.now() - e.at < maxAge) return Promise.resolve(e.data as T);

  const requestScope = scope;
  const inflight = fetcher().then(
    (data) => {
      // Signed out (or switched account) while it was loading: drop it
      if (scope === requestScope) setCache(key, data);
      return data;
    },
    (err) => {
      const current = entries.get(key);
      if (current) current.inflight = undefined;
      throw err;
    }
  );
  entries.set(key, { ...e, at: e?.at ?? 0, inflight });
  inflight.finally(() => {
    const current = entries.get(key);
    if (current?.inflight === inflight) current.inflight = undefined;
  }).catch(() => {});
  return inflight;
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

export type QueryOptions = {
  persist?: boolean;
  /** Skip the background refresh when the data is younger than this (ms). Default 3 s: covers mount + focus firing together */
  maxAge?: number;
  /** Refresh whenever the screen comes back into focus (default true) */
  refetchOnFocus?: boolean;
};

/**
 * Data for a screen: the cached value right away (undefined only the very first time),
 * refreshed in the background on mount / focus. key null = not ready to load yet.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, { persist = false, maxAge = 3000, refetchOnFocus = true }: QueryOptions = {}) {
  if (key && persist) persisted.add(key);
  const data = useSyncExternalStore(
    useCallback((l: () => void) => (key ? subscribe(key, l) : () => {}), [key]),
    () => (key ? (entry(key)?.data as T | undefined) : undefined)
  );
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // The fetcher may be a new closure each render; the key decides what is loaded
  const latest = useRef(fetcher);
  latest.current = fetcher;

  const load = useCallback(
    (force: boolean) => {
      if (!key) return Promise.resolve();
      return cachedFetch(key, () => latest.current(), { maxAge, persist, force }).then(
        () => setFailed(false),
        () => setFailed(true)
      );
    },
    [key, maxAge, persist]
  );

  useEffect(() => {
    setFailed(false);
    if (!refetchOnFocus) load(false);
  }, [load, refetchOnFocus]);

  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus) load(false);
    }, [load, refetchOnFocus])
  );

  /** Pull-to-refresh: always asks the server */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return { data, failed: failed && data === undefined, refreshing, refresh, reload: () => load(true) };
}
