import * as SecureStore from "expo-secure-store";
import type { User } from "../lib/api";

const SESSION_KEY = "auth_session";

export type Session = { accessToken: string; refreshToken: string; user: User };

export const saveSession = (session: Session) =>
  SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));

export const getSession = async (): Promise<Session | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    // Sessions saved by the old single-token flow have no refresh token
    return session.accessToken && session.refreshToken ? session : null;
  } catch {
    return null;
  }
};

export const clearSession = () => SecureStore.deleteItemAsync(SESSION_KEY);
