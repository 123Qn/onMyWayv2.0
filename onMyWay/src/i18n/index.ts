import { en } from "./locales/en";

// Same shape as `en`, with any string values. New locales are typed with this so a
// missing or misspelled key is a type error:
//   export const vi: Translations = { common: { cancel: "Hủy", ... }, ... };
type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
export type Translations = DeepStrings<typeof en>;

// To add a language: create locales/<code>.ts and register it here.
const translations = {
  en,
} satisfies Record<string, Translations>;

export type Locale = keyof typeof translations;

// Dot paths to every string, e.g. "auth.login.title"
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type TranslationKey = Paths<typeof en>;

const DEFAULT_LOCALE: Locale = "en";
let locale: Locale = DEFAULT_LOCALE;

export const getLocale = () => locale;

// Not reactive yet: call before the UI renders (e.g. from the device language with expo-localization).
export function setLocale(next: string) {
  locale = next in translations ? (next as Locale) : DEFAULT_LOCALE;
}

function lookup(table: Translations, key: string): string | undefined {
  let node: unknown = table;
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const text = lookup(translations[locale], key) ?? lookup(translations[DEFAULT_LOCALE], key) ?? key;
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}
