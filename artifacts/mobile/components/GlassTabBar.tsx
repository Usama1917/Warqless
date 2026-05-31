/**
 * GlassTabBar — iPhone-style floating glass pill navigation
 *
 * Visual design:
 * - Floating glass capsule above safe area with soft shadow
 * - A single shared white indicator SLIDES between tabs (iOS segmented control)
 * - Icon + label animate color and opacity on tab change
 * - Press: scale-down haptic feedback on the pressed tab
 * - Full RTL support: routes reversed, indicator slides in reverse
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
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

// ── Icon map ─────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index:    { active: "home",    inactive: "home-outline"    },
  browse:   { active: "search",  inactive: "search-outline"  },
  library:  { active: "library", inactive: "library-outline" },
  borrowed: { active: "repeat",  inactive: "repeat"          },
  account:  { active: "person",  inactive: "person-outline"  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

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
  route:       string;
  isFocused:   boolean;
  label:       string;
  onPress:     () => void;
  onLongPress: () => void;
  isDark:      boolean;
}) {
  const colors = useColors();

  const pressScale   = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.44)).current;

  useEffect(() => {
    Animated.spring(labelOpacity, {
      toValue:         isFocused ? 1 : 0.44,
      useNativeDriver: true,
      tension:         80,
      friction:        11,
    }).start();
  }, [isFocused]);

  const handlePressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.87, useNativeDriver: true, tension: 220, friction: 13,
    }).start();

  const handlePressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1, useNativeDriver: true, tension: 220, friction: 13,
    }).start();

  const icons = TAB_ICONS[route] ?? { active: "ellipse", inactive: "ellipse-outline" };
  const activeColor   = colors.primary;
  const inactiveColor = isDark ? "rgba(235,235,245,0.55)" : "#8E8E93";

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
      <Animated.View
        style={[styles.tabInner, { transform: [{ scale: pressScale }] }]}
      >
        {/* Icon */}
        <Animated.View style={{ opacity: labelOpacity }}>
          <Ionicons
            name={(isFocused ? icons.active : icons.inactive) as any}
            size={21}
            color={isFocused ? activeColor : inactiveColor}
          />
        </Animated.View>

        {/* Label */}
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color:      isFocused ? activeColor : inactiveColor,
              fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
              opacity:    labelOpacity,
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Main bar ──────────────────────────────────────────────────────────────────

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets      = useSafeAreaInsets();
  const colors      = useColors();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const { isRTL }   = useLanguage();

  const numTabs  = state.routes.length;
  const routes   = isRTL ? [...state.routes].reverse() : state.routes;
  const resolveIndex = isRTL
    ? (i: number) => numTabs - 1 - i
    : (i: number) => i;

  // ── Sliding indicator ─────────────────────────────────────────────────────
  // `slideAnim` represents the visual tab index (0 = leftmost visible slot).
  // In RTL the active route is mirrored, so visual index = (N-1 - realIndex).

  const [tabW, setTabW] = useState(0);
  const slideAnim = useRef(
    new Animated.Value(
      isRTL ? numTabs - 1 - state.index : state.index
    )
  ).current;

  useEffect(() => {
    const visualIdx = isRTL ? numTabs - 1 - state.index : state.index;
    Animated.spring(slideAnim, {
      toValue:         visualIdx,
      useNativeDriver: true,
      tension:         68,
      friction:        10,
    }).start();
  }, [state.index, isRTL]);

  const onTabsLayout = (e: any) => {
    const w  = e.nativeEvent.layout.width;
    const tw = (w - 12) / numTabs; // 12 = 6 padding each side
    setTabW(tw);
  };

  // Translate X of the sliding indicator
  const indicatorTranslateX = tabW > 0
    ? slideAnim.interpolate({
        inputRange:  Array.from({ length: numTabs }, (_, i) => i),
        outputRange: Array.from({ length: numTabs }, (_, i) => 6 + tabW * i),
      })
    : new Animated.Value(6);

  // ── Colours ───────────────────────────────────────────────────────────────
  const barBg = isDark
    ? "rgba(28,28,30,0.82)"
    : "rgba(242,242,247,0.82)";
  const barBorder = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.06)";
  const segBg = isDark ? "rgba(255,255,255,0.13)" : "#FFFFFF";

  const bottomGap = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <View style={[styles.wrapper, { bottom: bottomGap, pointerEvents: "box-none" } as any]}>
      <View
        style={[
          styles.pill,
          {
            borderColor:     barBorder,
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
                  shadowColor:   "#000",
                  shadowOffset:  { width: 0, height: 8 },
                  shadowOpacity: isDark ? 0.35 : 0.12,
                  shadowRadius:  24,
                  elevation:     20,
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
            { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.70)" },
          ]}
        />

        {/* Tabs area */}
        <View
          style={[styles.tabs, isRTL && styles.tabsRTL]}
          onLayout={onTabsLayout}
        >
          {/* ── Shared sliding indicator ── */}
          {tabW > 0 && (
            <Animated.View
              style={[
                styles.slidingIndicator,
                {
                  width:           tabW,
                  backgroundColor: segBg,
                  transform:       [{ translateX: indicatorTranslateX }],
                  ...(Platform.OS === "web"
                    ? ({
                        boxShadow: "0 2px 10px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.05)",
                      } as object)
                    : {
                        shadowColor:   "#000",
                        shadowOffset:  { width: 0, height: 2 },
                        shadowOpacity: 0.10,
                        shadowRadius:  6,
                        elevation:     3,
                      }),
                },
              ]}
            />
          )}

          {routes.map((route: TabRoute, visIdx: number) => {
            const realIdx   = resolveIndex(visIdx);
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left:     16,
    right:    16,
    zIndex:   100,
  },
  pill: {
    borderRadius: 36,
    borderWidth:  1,
    overflow:     "hidden",
  },
  topShine: {
    position:     "absolute",
    top:          0,
    left:         16,
    right:        16,
    height:       1,
    borderRadius: 1,
  },
  tabs: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingHorizontal: 6,
    paddingVertical:   6,
    zIndex:         2,
  },
  tabsRTL: {
    flexDirection: "row-reverse",
  },
  slidingIndicator: {
    position:     "absolute",
    top:          6,
    left:         0,
    bottom:       6,
    borderRadius: 26,
  },
  tabItem: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
  },
  tabInner: {
    alignItems:      "center",
    justifyContent:  "center",
    gap:             2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth:        52,
  },
  tabLabel: {
    fontSize:      10,
    letterSpacing: 0.1,
  },
});
