/**
 * GlassTabBar — iPhone-style floating glass pill navigation
 *
 * Visual design:
 * - Floating glass capsule above safe area with soft shadow
 * - Active tab shows a white frosted-glass segment (iOS segmented control feel)
 * - Inactive tabs: muted gray icon + small label
 * - Smooth spring animations on tab switch and press
 * - Full RTL support when Arabic is active
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

// ── Icon map ────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index:    { active: "home",         inactive: "home-outline"    },
  browse:   { active: "search",       inactive: "search-outline"  },
  library:  { active: "library",      inactive: "library-outline" },
  borrowed: { active: "repeat",       inactive: "repeat"          },
  account:  { active: "person",       inactive: "person-outline"  },
};

// ── Types ────────────────────────────────────────────────────────────────────

type TabRoute     = { key: string; name: string };
type TabDescriptor = { options: { tabBarLabel?: unknown; title?: string } };
type TabBarProps  = {
  state:       { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation:  any;
};

// ── Single tab item ──────────────────────────────────────────────────────────

function TabItem({
  route,
  isFocused,
  label,
  onPress,
  onLongPress,
  isDark,
}: {
  route:      string;
  isFocused:  boolean;
  label:      string;
  onPress:    () => void;
  onLongPress: () => void;
  isDark:     boolean;
}) {
  const colors = useColors();

  // Press scale
  const pressScale = useRef(new Animated.Value(1)).current;

  // Active segment background
  const segOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const segScale   = useRef(new Animated.Value(isFocused ? 1 : 0.82)).current;

  // Icon/label color
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.44)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(segOpacity, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }),
      Animated.spring(segScale, {
        toValue: isFocused ? 1 : 0.82,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }),
      Animated.spring(labelOpacity, {
        toValue: isFocused ? 1 : 0.44,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }),
    ]).start();
  }, [isFocused]);

  const handlePressIn = () =>
    Animated.spring(pressScale, { toValue: 0.87, useNativeDriver: true, tension: 200, friction: 12 }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 12 }).start();

  const icons = TAB_ICONS[route] ?? { active: "ellipse", inactive: "ellipse-outline" };

  // Active segment colour: white in light, slate in dark
  const segBg = isDark ? "rgba(255,255,255,0.13)" : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale: pressScale }] }]}>

        {/* ── Active segment background ── */}
        <Animated.View
          style={[
            styles.activeSeg,
            {
              backgroundColor: segBg,
              opacity: segOpacity,
              transform: [{ scale: segScale }],
              // Segment shadow (web uses boxShadow, native uses shadow*)
              ...(Platform.OS === "web"
                ? ({ boxShadow: "0 2px 10px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.05)" } as object)
                : {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.10,
                    shadowRadius: 6,
                    elevation: 3,
                  }),
            },
          ]}
        />

        {/* ── Icon ── */}
        <Animated.View style={{ opacity: labelOpacity }}>
          <Ionicons
            name={(isFocused ? icons.active : icons.inactive) as any}
            size={21}
            color={isFocused ? colors.primary : (isDark ? "rgba(235,235,245,0.6)" : "#8E8E93")}
          />
        </Animated.View>

        {/* ── Label ── */}
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.primary : (isDark ? "rgba(235,235,245,0.6)" : "#8E8E93"),
              fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
              opacity: labelOpacity,
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Main bar ─────────────────────────────────────────────────────────────────

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets    = useSafeAreaInsets();
  const colors    = useColors();
  const colorScheme = useColorScheme();
  const isDark    = colorScheme === "dark";
  const { isRTL } = useLanguage();

  const routes = isRTL ? [...state.routes].reverse() : state.routes;
  const resolveIndex = isRTL
    ? (i: number) => state.routes.length - 1 - i
    : (i: number) => i;

  // Bar background colours
  const barBg = isDark
    ? "rgba(28,28,30,0.82)"
    : "rgba(242,242,247,0.82)";
  const barBorder = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.06)";

  const bottomGap = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <View
      style={[styles.wrapper, { bottom: bottomGap, pointerEvents: "box-none" }]}
    >
      <View
        style={[
          styles.pill,
          {
            borderColor: barBorder,
            backgroundColor: Platform.OS !== "web" ? "transparent" : barBg,
            ...(Platform.OS === "web"
              ? ({
                  backdropFilter:       "blur(24px) saturate(200%)",
                  WebkitBackdropFilter: "blur(24px) saturate(200%)",
                  boxShadow: isDark
                    ? "0 8px 32px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.06) inset"
                    : "0 8px 32px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.80) inset",
                } as object)
              : {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isDark ? 0.35 : 0.12,
                  shadowRadius: 24,
                  elevation: 20,
                }),
          },
        ]}
      >
        {/* Native blur background */}
        {Platform.OS !== "web" && (
          <BlurView
            intensity={Platform.OS === "ios" ? 80 : 55}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderRadius: 36 }]}
          />
        )}

        {/* Top inner shine */}
        <View
          style={[
            styles.topShine,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.70)",
            },
          ]}
        />

        {/* Tabs row */}
        <View style={[styles.tabs, isRTL && styles.tabsRTL]}>
          {routes.map((route: TabRoute, visIdx: number) => {
            const realIdx  = resolveIndex(visIdx);
            const { options } = descriptors[route.key];
            const isFocused = state.index === realIdx;

            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? route.name;

            const onPress = () => {
              const e = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name);
            };

            const onLongPress = () =>
              navigation.emit({ type: "tabLongPress", target: route.key });

            return (
              <TabItem
                key={route.key}
                route={route.name}
                isFocused={isFocused}
                label={label}
                onPress={onPress}
                onLongPress={onLongPress}
                isDark={isDark}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
  },
  pill: {
    borderRadius: 36,
    borderWidth: 1,
    overflow: "hidden",
  },
  topShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    zIndex: 2,
  },
  tabsRTL: {
    flexDirection: "row-reverse",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 52,
    position: "relative",
  },
  activeSeg: {
    position: "absolute",
    inset: 0,
    borderRadius: 26,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
