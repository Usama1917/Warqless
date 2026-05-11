import ar from "./ar";
import en from "./en";

export type Language = "en" | "ar";
export type { TranslationKeys } from "./en";

export const translations = { en, ar } as const;

export function getTranslation(lang: Language) {
  return translations[lang];
}

export { en, ar };
