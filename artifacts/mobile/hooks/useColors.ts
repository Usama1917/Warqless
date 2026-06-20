import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useThemeContext } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the active color scheme.
 *
 * The scheme comes from the app ThemeProvider (which honors the user's
 * light/dark/system preference). When this hook is used above the provider
 * (e.g. the crash fallback), it falls back to the device appearance.
 *
 * The returned object contains all color tokens for the active palette plus
 * scheme-independent values like `radius`.
 */
export function useColors() {
  const deviceScheme = useColorScheme();
  const theme = useThemeContext();
  const scheme =
    theme?.scheme ?? (deviceScheme === "dark" ? "dark" : "light");

  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
