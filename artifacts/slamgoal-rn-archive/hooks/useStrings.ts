import { useGame } from "@/context/GameContext";
import { format, LOCALES, type Strings } from "@/constants/i18n";

// `useStrings()` — returns the active locale's string dictionary plus a
// `t()` helper for substituting `{placeholder}` tokens.
//
// Usage:
//   const { s, t } = useStrings();
//   <Text>{s.home.play}</Text>
//   <Text>{t(s.game.goatSub, { name: "Pulga" })}</Text>
export function useStrings(): {
  s: Strings;
  t: (template: string, vars: Record<string, string | number>) => string;
} {
  const { locale } = useGame();
  const s = LOCALES[locale] ?? LOCALES.en;
  return { s, t: format };
}
