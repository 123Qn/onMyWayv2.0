import { PixelRatio } from "react-native";
import { Image } from "expo-image";

// Photos are downloaded at the size they are shown, not at full size: an avatar ring of 72 dp
// needs ~220 px, not the 1000 px cover. Widths snap to a few steps so the same photo shown at
// similar sizes shares one cached file.
const STEPS = [160, 320, 640, 1000, 1400];

// Only image CDNs that resize by URL; uploads served by our backend are returned as they are
const RESIZABLE = /^https:\/\/images\.unsplash\.com\//;

/** The photo URL for something widthDp wide on screen */
export function sizedImage(uri: string, widthDp: number): string;
export function sizedImage(uri: string | null | undefined, widthDp: number): string | null | undefined;
export function sizedImage(uri: string | null | undefined, widthDp: number) {
  if (!uri || !RESIZABLE.test(uri)) return uri;
  const px = PixelRatio.getPixelSizeForLayoutSize(widthDp);
  // 10% slack: a full-width photo (~980-1080 px) stays on the 1000 px file the feed already loaded
  const w = STEPS.find((s) => s >= px * 0.9) ?? STEPS[STEPS.length - 1];
  return /[?&]w=\d+/.test(uri) ? uri.replace(/([?&])w=\d+/, `$1w=${w}`) : `${uri}${uri.includes("?") ? "&" : "?"}w=${w}`;
}

/** Download photos to the disk cache ahead of time (e.g. the next feed page) so they show instantly */
export function prefetchImages(uris: (string | null | undefined)[]) {
  const list = [...new Set(uris.filter((u): u is string => !!u))];
  if (list.length) Image.prefetch(list, "disk").catch(() => {});
}
