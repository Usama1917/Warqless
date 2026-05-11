import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { I18nManager } from "react-native";

import { Language, TranslationKeys, getTranslation } from "@/i18n";

const STORAGE_KEY = "warqless_language";

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  t: TranslationKeys;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "ar" || stored === "en") {
        setLanguageState(stored);
        const shouldBeRTL = stored === "ar";
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
        }
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    const shouldBeRTL = lang === "ar";
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, []);

  const isRTL = language === "ar";
  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, isRTL, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
