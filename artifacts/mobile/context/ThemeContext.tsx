import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

const STORAGE_KEY = "warqless_theme_preference";

/** What the user picked. "system" follows the device appearance. */
export type ThemePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's saved choice. */
  preference: ThemePreference;
  /** The resolved scheme actually in use right now. */
  scheme: ColorScheme;
  /** Convenience: preference === "system". */
  followSystem: boolean;
  setPreference: (preference: ThemePreference) => void;
  /** Toggle the "follow device settings" switch. */
  setFollowSystem: (follow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "system" || stored === "light" || stored === "dark") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const scheme: ColorScheme =
    preference === "system"
      ? deviceScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const setFollowSystem = useCallback(
    (follow: boolean) => {
      // Turning the switch off keeps the current look, but now as an explicit
      // manual choice the user can then flip between light/dark.
      setPreference(follow ? "system" : scheme);
    },
    [scheme, setPreference]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      scheme,
      followSystem: preference === "system",
      setPreference,
      setFollowSystem,
    }),
    [preference, scheme, setPreference, setFollowSystem]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Returns the theme context, or `null` when used above the provider (e.g. the
 * error fallback). Prefer {@link useTheme} inside the normal app tree.
 */
export function useThemeContext() {
  return useContext(ThemeContext);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
