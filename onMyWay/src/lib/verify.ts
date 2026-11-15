import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

// A photo picked for a post, with where it was taken when we can prove it.
// "Verified" means the location came from the device GPS at capture time (in-app camera)
// or from the photo's own GPS metadata — screenshots and downloaded images have neither.
export type PostPhoto = {
  uri: string;
  source: "camera" | "library";
  verified: boolean;
  latitude?: number;
  longitude?: number;
  takenAt?: string; // ISO
  place?: { name: string; country: string; countryCode: string };
};

export class PermissionError extends Error {}

export async function takePhoto(): Promise<PostPhoto | null> {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  if (!camera.granted) throw new PermissionError("camera");

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, exif: true });
  if (result.canceled) return null;

  const fix = await currentFix();
  const photo: PostPhoto = { uri: result.assets[0].uri, source: "camera", verified: false, takenAt: new Date().toISOString() };
  // A mocked (fake GPS app) location never verifies
  if (fix && !fix.mocked) {
    photo.latitude = fix.coords.latitude;
    photo.longitude = fix.coords.longitude;
    photo.verified = true;
    photo.place = await placeAt(photo.latitude, photo.longitude);
  }
  return photo;
}

export async function pickPhotos(limit: number): Promise<PostPhoto[]> {
  const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!library.granted) throw new PermissionError("library");

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    exif: true,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
  });
  if (result.canceled) return [];

  return Promise.all(
    result.assets.map(async (asset): Promise<PostPhoto> => {
      const gps = readExifGps(asset.exif);
      const photo: PostPhoto = { uri: asset.uri, source: "library", verified: false, takenAt: readExifDate(asset.exif) };
      if (gps) {
        photo.latitude = gps.latitude;
        photo.longitude = gps.longitude;
        photo.verified = true;
        photo.place = await placeAt(gps.latitude, gps.longitude);
      }
      return photo;
    })
  );
}

// Neither GPS nor the geocoder should be able to block posting
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

async function currentFix() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  try {
    const fix = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 10_000);
    // Fall back to a recent known position (at most 2 minutes old) when no fresh fix arrives in time
    return fix ?? (await Location.getLastKnownPositionAsync({ maxAge: 120_000 }));
  } catch {
    return null;
  }
}

async function placeAt(latitude: number, longitude: number): Promise<PostPhoto["place"]> {
  try {
    const [address] = (await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), 8_000)) ?? [];
    if (!address) return undefined;
    // Android often has no city and returns a Plus Code ("324P+H95") as the name; skip those
    const feature = address.name && !/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(address.name) ? address.name : null;
    const name = address.city || address.subregion || address.district || feature || address.region;
    if (!name || !address.country) return undefined;
    return { name, country: address.country, countryCode: (address.isoCountryCode ?? "").toUpperCase() };
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// EXIF parsing. Android returns flat keys (GPSLatitude as a number or "deg/1,min/1,sec/100"),
// iOS nests them under GPS / {GPS}.
// ---------------------------------------------------------------------------
type Exif = Record<string, unknown> | null | undefined;

function toDegrees(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || !value) return undefined;
  const parts = value.split(",").map((part) => {
    const [num, den] = part.split("/").map(Number);
    return den ? num / den : num;
  });
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  const [deg = 0, min = 0, sec = 0] = parts;
  return deg + min / 60 + sec / 3600;
}

export function readExifGps(exif: Exif): { latitude: number; longitude: number } | null {
  if (!exif) return null;
  const nested = (exif.GPS ?? exif["{GPS}"]) as Record<string, unknown> | undefined;
  const lat = toDegrees(nested?.Latitude ?? exif.GPSLatitude);
  const lng = toDegrees(nested?.Longitude ?? exif.GPSLongitude);
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) return null;
  const latRef = String(nested?.LatitudeRef ?? exif.GPSLatitudeRef ?? "N");
  const lngRef = String(nested?.LongitudeRef ?? exif.GPSLongitudeRef ?? "E");
  return {
    latitude: latRef === "S" ? -Math.abs(lat) : Math.abs(lat),
    longitude: lngRef === "W" ? -Math.abs(lng) : Math.abs(lng),
  };
}

function readExifDate(exif: Exif): string | undefined {
  const nested = exif?.["{Exif}"] as Record<string, unknown> | undefined;
  const raw = (exif?.DateTimeOriginal ?? nested?.DateTimeOriginal) as string | undefined;
  // "2026:11:15 05:42:10" -> ISO
  const match = raw?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s] = match;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`).toISOString();
}
