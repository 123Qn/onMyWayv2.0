import { t } from "../i18n";

// Native Google Sign-In. The module is missing in Expo Go, so it is loaded lazily
// and the app keeps working there (the Google button just shows an error).
type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let mod: GoogleSigninModule | null | undefined;
let configured = false;

function load(): GoogleSigninModule | null {
  if (mod === undefined) {
    try {
      mod = require("@react-native-google-signin/google-signin") as GoogleSigninModule;
    } catch {
      mod = null;
    }
  }
  return mod;
}

export class GoogleAuthError extends Error {}

/** Opens the Google account picker. Returns the ID token, or null if the user cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!WEB_CLIENT_ID) {
    throw new GoogleAuthError(t("auth.google.notConfigured"));
  }
  const g = load();
  if (!g) {
    throw new GoogleAuthError(t("auth.google.needsDevBuild"));
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = g;

  if (!configured) {
    // webClientId makes Google issue an ID token the backend can verify
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
    configured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // cancelled
    if (!response.data.idToken) {
      throw new GoogleAuthError(t("auth.google.noToken"));
    }
    return response.data.idToken;
  } catch (e) {
    if (e instanceof GoogleAuthError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleAuthError(t("auth.google.noPlayServices"));
      }
    }
    throw new GoogleAuthError(t("auth.google.failed"));
  }
}

/** Clears the cached Google account so the picker shows again next time. */
export async function signOutGoogle() {
  if (!configured) return;
  await load()?.GoogleSignin.signOut().catch(() => {});
}
