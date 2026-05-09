// Typed, file-per-locale internationalization.
//
// Adding a new language:
//   1. Copy `en.ts` → `xx.ts`, translate every value.
//   2. Declare `const xx: Strings = { ... }` so TypeScript catches any
//      missing keys at compile time.
//   3. Add `xx` to the `LOCALES` and `LOCALE_LABELS` maps below.
//
// At runtime, `useStrings()` reads the user's preferred locale (from
// GameContext, which persists it alongside the other `fc_*` keys) and
// returns the matching dictionary. Missing keys in any language are a
// TypeScript error, not a silent fallback to English.

import en from "./en";
import es from "./es";
import pt from "./pt";
import fr from "./fr";
import de from "./de";
import it from "./it";

// Shape of every locale module, inferred from English.
export type Strings = typeof en;

// Supported locale codes; using `as const` so they narrow to a literal
// union in type-land.
export const LOCALE_CODES = ["en", "es", "pt", "fr", "de", "it"] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const LOCALES: Record<LocaleCode, Strings> = {
  en,
  es,
  pt,
  fr,
  de,
  it,
};

// Human-readable names (in each language's own script) for the settings
// picker. Not translated — users shouldn't have to guess what "Alemán"
// means when their UI is currently in Portuguese.
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
};

export function isLocaleCode(x: string): x is LocaleCode {
  return (LOCALE_CODES as readonly string[]).includes(x);
}

// Simple `{placeholder}` substitution. Not a full ICU implementation —
// just enough to plug in scores, names, and counts without shipping
// `i18n-js` or `formatjs` (which are heavier than we need).
export function format(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
