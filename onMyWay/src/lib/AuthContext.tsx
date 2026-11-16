import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as api from "./api";
import type { User } from "./api";
import { getGoogleIdToken, signOutGoogle } from "./googleAuth";
import { refreshMyProfile } from "./profileApi";
import { resetMyProfile } from "./rewards";
import { refreshUnreadCount, resetNotifications } from "./notifications";
import { resetTripRecorder, restoreTrip } from "./tripRecorder";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  /** Resolves false if the user closed the Google account picker */
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // api.ts reports every session change: login, token refresh, forced sign-out
    const unsubscribe = api.subscribeSession((session) => setUser(session?.user ?? null));

    api
      .loadSession()
      .then((session) => {
        if (!session) return;
        setUser(session.user);
        // Check the session in the background; an expired refresh token signs the user out
        api.fetchMe().catch(() => {});
      })
      .finally(() => setLoading(false));

    return unsubscribe;
  }, []);

  // My stats, frame and pinned badges follow the signed-in user
  useEffect(() => {
    if (!user) {
      resetMyProfile();
      resetNotifications();
      resetTripRecorder().catch(() => {});
      return;
    }
    restoreTrip().catch(() => {});
    refreshMyProfile(user.id).catch(() => {});
    refreshUnreadCount().catch(() => {});
    // Check for new notifications every minute while signed in
    const timer = setInterval(() => refreshUnreadCount().catch(() => {}), 60_000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    await api.login(email.trim(), password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    await api.register(name.trim(), email.trim(), password);
  };

  const signInWithGoogle = async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return false;
    await api.googleLogin(idToken);
    return true;
  };

  const signOut = async () => {
    await api.logout();
    await signOutGoogle();
  };

  const deleteAccount = async () => {
    await api.deleteAccount();
    await signOutGoogle();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
