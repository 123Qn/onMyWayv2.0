import * as Device from "expo-device";
import { clearSession, getSession, saveSession, Session } from "./authStorage";
import { t } from "../i18n";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.254:3000/api";

export type User = { id: number; name: string; email: string; avatarUrl?: string | null };

export class ApiError extends Error {
  // status 0 = could not reach the server
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Session held in memory, mirrored to SecureStore
// ---------------------------------------------------------------------------
let current: Session | null = null;
let onSessionChange: ((session: Session | null) => void) | null = null;

export function subscribeSession(listener: (session: Session | null) => void) {
  onSessionChange = listener;
  return () => {
    if (onSessionChange === listener) onSessionChange = null;
  };
}

export async function loadSession() {
  current = await getSession();
  return current;
}

async function setSession(session: Session | null) {
  current = session;
  if (session) await saveSession(session);
  else await clearSession();
  onSessionChange?.(session);
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Send body as raw bytes with this Content-Type (photo uploads) */
  contentType?: string;
};

async function send(path: string, { method = "GET", body, auth = true, contentType }: RequestOptions) {
  const raw = contentType !== undefined;
  const headers: Record<string, string> = { "Content-Type": contentType ?? "application/json" };
  if (auth && current) headers.Authorization = `Bearer ${current.accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : raw ? (body as BodyInit) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(t("common.networkError"), 0);
  }
  const json = await res.json().catch(() => null);
  return { res, json };
}

// One refresh at a time: concurrent 401s wait for the same request
let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = current?.refreshToken;
      if (!refreshToken) return false;
      const { res, json } = await send("/auth/refresh", {
        method: "POST",
        body: { refreshToken },
        auth: false,
      });
      if (!res.ok) {
        // Refresh token expired or revoked: sign out
        if (res.status === 401 || res.status === 400) await setSession(null);
        return false;
      }
      await setSession(json.data as Session);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let { res, json } = await send(path, options);

  if (res.status === 401 && options.auth !== false && current) {
    if (await refreshTokens()) {
      ({ res, json } = await send(path, options));
    }
  }

  if (!res.ok) {
    throw new ApiError(json?.message ?? t("common.genericError"), res.status);
  }
  return json?.data as T;
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
const deviceName = () => Device.modelName ?? undefined;

export async function login(email: string, password: string) {
  const session = await apiFetch<Session>("/auth/login", {
    method: "POST",
    body: { email, password, deviceName: deviceName() },
    auth: false,
  });
  await setSession(session);
  return session.user;
}

export async function register(name: string, email: string, password: string) {
  const session = await apiFetch<Session>("/auth/register", {
    method: "POST",
    body: { name, email, password, deviceName: deviceName() },
    auth: false,
  });
  await setSession(session);
  return session.user;
}

export async function googleLogin(idToken: string) {
  const session = await apiFetch<Session>("/auth/google", {
    method: "POST",
    body: { idToken, deviceName: deviceName() },
    auth: false,
  });
  await setSession(session);
  return session.user;
}

export async function deleteAccount() {
  await apiFetch("/auth/me", { method: "DELETE" });
  await setSession(null);
}

export async function logout() {
  const refreshToken = current?.refreshToken;
  await setSession(null);
  if (refreshToken) {
    // Best effort: local sign-out already happened
    send("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }).catch(() => {});
  }
}

export async function fetchMe() {
  const user = await apiFetch<User>("/auth/me");
  if (current) await setSession({ ...current, user });
  return user;
}
