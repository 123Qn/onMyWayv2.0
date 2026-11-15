import { t } from "../i18n";

/** "Just now", "25m", "3h", "2d" */
export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("feed.justNow");
  if (minutes < 60) return t("feed.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("feed.hoursAgo", { count: hours });
  return t("feed.daysAgo", { count: Math.floor(hours / 24) });
}

/** 950 -> "950", 1520 -> "1.5k", 12000 -> "12k" */
export const compactNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);

// "VN" -> 🇻🇳 (regional indicator symbols)
export const flagEmoji = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
