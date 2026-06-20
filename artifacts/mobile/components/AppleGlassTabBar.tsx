/**
 * AppleGlassTabBar - iOS Liquid Glass bottom navigation.
 *
 * On iPhones that support Liquid Glass (iOS 26+), the bar and the active-tab
 * capsule are rendered with the real `expo-glass-effect` material, giving the
 * authentic Apple refraction / specular look. Everywhere else (older iOS,
 * Android, web, or a runtime without the native module e.g. some Expo Go
 * builds) it gracefully falls back to a frosted `expo-blur` glass so it always
 * renders and never crashes.
 *
 * Colors follow the device light/dark appearance: icons/labels use the active
 * design tokens, the glass material auto-adapts, and the blur fallback switches
 * tint + tones between light and dark. Icons and labels are always drawn above
 * the glass so they stay sharp.
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

/**
 * Detect (once) whether the real iOS Liquid Glass material is usable. The
 * try/catch guards runtimes where the native module is absent — there the
 * availability calls throw and we fall back to BlurView.
 */
function detectLiquidGlass(): boolean {
  if (Platform.OS !== "ios") return false;
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

const LIQUID_GLASS = detectLiquidGlass();

const BAR_BASE_HEIGHT = 74;
const TOP_RADIUS = 30;
const H_PAD = 10;
const TOP_PAD = 8;
const SAFE_AREA_EXTRA = 6;
const CAPSULE_RADIUS = 22;

/** Per-scheme tones for the bar/blur/capsule (the glass material adapts on its own). */
const BAR_THEME = {
  light: {
    glassBg: "rgba(255,255,255,0.88)",
    wash: "rgba(255,255,255,0.16)",
    topHairline: "rgba(255,255,255,0.68)",
    barBorder: "rgba(0,0,0,0.06)",
    pillBg: "rgba(255,255,255,0.55)",
    pillBorder: "rgba(255,255,255,0.7)",
    blurTint: "light" as const,
  },
  dark: {
    glassBg: "rgba(18,28,45,0.82)",
    wash: "rgba(255,255,255,0.04)",
    topHairline: "rgba(255,255,255,0.12)",
    barBorder: "rgba(255,255,255,0.08)",
    pillBg: "rgba(255,255,255,0.12)",
    pillBorder: "rgba(255,255,255,0.16)",
    blurTint: "dark" as const,
  },
};

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index: { active: "home", inactive: "home-outline" },
  browse: { active: "search", inactive: "search-outline" },
  library: { active: "library", inactive: "library-outline" },
  account: { active: "person", inactive: "person-outline" },
};

type TabRoute = { key: string; name: string };
type TabDescriptor = { options: { tabBarLabel?: unknown; title?: string } };
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

function TabItem({
  route,
  isFocused,
  label,
  onPress,
  onLongPress,
  isRTL,
  activeColor,
  inactiveColor,
}: {
  route: string;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  isRTL: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeAnim, isFocused]);

  const onPressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.96,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(pressScale, {
      toValue: 1,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const icons = TAB_ICONS[route] ?? {
    active: "ellipse",
    inactive: "ellipse-outline",
  };
  const iconScale = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  const contentOpacity = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[styles.tabInner, { transform: [{ scale: pressScale }] }]}
      >
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ scale: iconScale }],
          }}
        >
          <Ionicons
            name={(isFocused ? icons.active : icons.inactive) as any}
            size={isFocused ? 29 : 27}
            color={isFocused ? activeColor : inactiveColor}
          />
        </Animated.View>

        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? "700" : "500",
              opacity: contentOpacity,
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * The animated active-tab capsule. It slides under the focused tab with a
 * spring (the "liquid" motion). In Liquid Glass mode it is a real GlassView;
 * otherwise a translucent capsule that reads as glass over the BlurView.
 */
function ActivePill({
  slotWidth,
  translateX,
  pillBg,
  pillBorder,
  glassColorScheme,
}: {
  slotWidth: number;
  translateX: Animated.Value;
  pillBg: string;
  pillBorder: string;
  glassColorScheme: "light" | "dark";
}) {
  if (slotWidth <= 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pillSlot,
        { width: slotWidth, transform: [{ translateX }] },
      ]}
    >
      {LIQUID_GLASS ? (
        <GlassView
          glassEffectStyle="clear"
          colorScheme={glassColorScheme}
          isInteractive
          style={styles.pillCapsule}
        />
      ) : (
        <View
          style={[
            styles.pillCapsule,
            { backgroundColor: pillBg, borderWidth: 1, borderColor: pillBorder },
          ]}
        />
      )}
    </Animated.View>
  );
}

export function AppleGlassTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const colors = useColors();
  const { scheme } = useTheme();
  const isDark = scheme === "dark";
  const theme = isDark ? BAR_THEME.dark : BAR_THEME.light;
  const activeColor = colors.foreground;
  const inactiveColor = colors.mutedForeground;

  const numTabs = state.routes.length;
  const routes = isRTL ? [...state.routes].reverse() : state.routes;
  const resolveIndex = isRTL
    ? (visualIndex: number) => numTabs - 1 - visualIndex
    : (visualIndex: number) => visualIndex;

  // Visual (left-to-right) position of the focused tab, accounting for RTL.
  const visualActiveIndex = isRTL ? numTabs - 1 - state.index : state.index;

  const [contentWidth, setContentWidth] = useState(0);
  const slotWidth = numTabs > 0 ? contentWidth / numTabs : 0;
  const pillX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (slotWidth <= 0) return;
    Animated.spring(pillX, {
      toValue: visualActiveIndex * slotWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
      mass: 0.9,
    }).start();
  }, [pillX, slotWidth, visualActiveIndex]);

  const onContentLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== contentWidth) setContentWidth(w);
  };

  const barHeight = BAR_BASE_HEIGHT + insets.bottom;
  const nativeShadow =
    Platform.OS !== "web"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 24,
          elevation: 12,
        }
      : {};

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { height: barHeight }]}
    >
      <View style={[styles.shadowHost, nativeShadow]}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: LIQUID_GLASS ? "transparent" : theme.glassBg,
              borderColor: theme.barBorder,
              paddingBottom: insets.bottom + SAFE_AREA_EXTRA,
              ...(Platform.OS === "web"
                ? ({
                    backdropFilter: "blur(22px) saturate(170%)",
                    WebkitBackdropFilter: "blur(22px) saturate(170%)",
                    boxShadow: isDark
                      ? "0 -4px 24px rgba(0,0,0,0.4)"
                      : "0 -4px 24px rgba(17,24,39,0.08)",
                  } as object)
                : {}),
            },
          ]}
        >
          {/* Background glass material */}
          {LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              colorScheme={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            Platform.OS !== "web" && (
              <BlurView
                intensity={50}
                tint={theme.blurTint}
                style={StyleSheet.absoluteFill}
              />
            )
          )}

          {/* Subtle frost wash only in the non-Liquid fallback so it doesn't
              milk the real glass. */}
          {!LIQUID_GLASS && (
            <View
              pointerEvents="none"
              style={[styles.glassWash, { backgroundColor: theme.wash }]}
            />
          )}
          <View
            pointerEvents="none"
            style={[styles.topBorder, { backgroundColor: theme.topHairline }]}
          />

          {/* Padded content area: active capsule + tab items share this box */}
          <View style={styles.content} onLayout={onContentLayout}>
            <ActivePill
              slotWidth={slotWidth}
              translateX={pillX}
              pillBg={theme.pillBg}
              pillBorder={theme.pillBorder}
              glassColorScheme={isDark ? "dark" : "light"}
            />

            <View style={styles.tabs}>
              {routes.map((route, visualIndex) => {
                const realIndex = resolveIndex(visualIndex);
                const { options } = descriptors[route.key];
                const isFocused = state.index === realIndex;
                const label =
                  typeof options.tabBarLabel === "string"
                    ? options.tabBarLabel
                    : options.title ?? route.name;

                const onPress = () => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                const onLongPress = () => {
                  navigation.emit({
                    type: "tabLongPress",
                    target: route.key,
                  });
                };

                return (
                  <TabItem
                    key={route.key}
                    route={route.name}
                    isFocused={isFocused}
                    label={label}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    isRTL={isRTL}
                    activeColor={activeColor}
                    inactiveColor={inactiveColor}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  shadowHost: {
    flex: 1,
    borderTopLeftRadius: TOP_RADIUS,
    borderTopRightRadius: TOP_RADIUS,
  },
  bar: {
    flex: 1,
    overflow: "hidden",
    borderTopLeftRadius: TOP_RADIUS,
    borderTopRightRadius: TOP_RADIUS,
    borderTopWidth: 1,
    paddingTop: TOP_PAD,
    paddingHorizontal: H_PAD,
  },
  glassWash: {
    ...StyleSheet.absoluteFillObject,
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  pillSlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  pillCapsule: {
    flex: 1,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: CAPSULE_RADIUS,
    overflow: "hidden",
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 54,
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
  },
});
