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

/** "1 stop" / "4 stops" (short: the compact form used on feed cards) */
export const stopsLabel = (count: number, short = false) =>
  short
    ? count === 1
      ? t("feed.stopsShortOne")
      : t("feed.stopsShort", { count })
    : count === 1
      ? t("post.stopsCountOne")
      : t("post.stopsCount", { count });

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Best months as ranges, wrapping over the new year: [11,12,1,2,3,4] -> "Nov – Apr", [3,4,10,11] -> "Mar – Apr, Oct – Nov" */
export function monthRanges(months: number[]) {
  const set = new Set(months);
  if (set.size === 12) return t("assistant.allYear");
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((a, b) => a - b);
  return starts
    .map((start) => {
      let end = start;
      while (set.has(end === 12 ? 1 : end + 1)) end = end === 12 ? 1 : end + 1;
      return start === end ? SHORT_MONTHS[start - 1] : `${SHORT_MONTHS[start - 1]} – ${SHORT_MONTHS[end - 1]}`;
    })
    .join(", ");
}

// "VN" -> 🇻🇳 (regional indicator symbols)
export const flagEmoji = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
