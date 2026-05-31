/**
 * AppleGlassTabBar — iPhone-style floating glass capsule navigation
 *
 * Design goals:
 * - Large frosted-glass capsule floating above the safe area
 * - A single white pill indicator slides between tabs (iOS segmented control)
 * - Active icon + label: iOS system blue (#007AFF)
 * - Inactive icon + label: near-black in light / soft-white in dark
 * - Small active dot beneath the label
 * - Press: spring scale-down on the tapped tab
 * - Full RTL support (route order reversed, indicator slides in reverse)
 * - BlurView on native; CSS backdrop-filter on web; solid fallback if neither
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

// ── Constants ─────────────────────────────────────────────────────────────────

const IOS_BLUE    = "#007AFF";
const BAR_RADIUS  = 40;
const PILL_RADIUS = 30;
const H_PAD       = 6;  // horizontal padding inside the bar
const V_PAD       = 6;  // vertical padding inside the bar

// ── Icon map ─────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index:    { active: "home",    inactive: "home-outline"    },
  browse:   { active: "search",  inactive: "search-outline"  },
  library:  { active: "library", inactive: "library-outline" },
  borrowed: { active: "repeat",  inactive: "repeat-outline"  },
  account:  { active: "person",  inactive: "person-outline"  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type TabRoute      = { key: string; name: string };
type TabDescriptor = { options: { tabBarLabel?: unknown; title?: string } };
type TabBarProps   = {
  state:       { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation:  any;
};

// ── Single tab item ───────────────────────────────────────────────────────────

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
  const pressScale   = useRef(new Animated.Value(1)).current;
  const activeAnim   = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const dotOpacity   = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(activeAnim, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 11,
      }),
      Animated.spring(dotOpacity, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }),
    ]).start();
  }, [isFocused]);

  const onPressIn  = () =>
    Animated.spring(pressScale, {
      toValue: 0.88, useNativeDriver: true, tension: 240, friction: 14,
    }).start();

  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1, useNativeDriver: true, tension: 240, friction: 14,
    }).start();

  const icons        = TAB_ICONS[route] ?? { active: "ellipse", inactive: "ellipse-outline" };
  const activeColor  = IOS_BLUE;
  const inactiveColor = isDark
    ? "rgba(235,235,245,0.50)"
    : "rgba(60,60,67,0.50)";

  // Interpolate icon opacity: inactive tabs slightly fade
  const iconOpacity = activeAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.72, 1],
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
        {/* Icon */}
        <Animated.View style={{ opacity: iconOpacity }}>
          <Ionicons
            name={(isFocused ? icons.active : icons.inactive) as any}
            size={22}
            color={isFocused ? activeColor : inactiveColor}
          />
        </Animated.View>

        {/* Label */}
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
            },
          ]}
        >
          {label}
        </Text>

        {/* Active dot */}
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: activeColor,
              opacity: dotOpacity,
              transform: [
                {
                  scale: dotOpacity.interpolate({
                    inputRange: [0, 1], outputRange: [0.4, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

// ── Main bar ──────────────────────────────────────────────────────────────────

export function AppleGlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const { isRTL }   = useLanguage();

  const numTabs     = state.routes.length;
  const routes      = isRTL ? [...state.routes].reverse() : state.routes;
  const resolveIndex = isRTL
    ? (i: number) => numTabs - 1 - i
    : (i: number) => i;

  // ── Sliding indicator ──────────────────────────────────────────────────────

  const [tabW, setTabW] = useState(0);
  const slideAnim = useRef(
    new Animated.Value(isRTL ? numTabs - 1 - state.index : state.index)
  ).current;

  useEffect(() => {
    const visualIdx = isRTL ? numTabs - 1 - state.index : state.index;
    Animated.spring(slideAnim, {
      toValue:         visualIdx,
      useNativeDriver: true,
      tension:         70,
      friction:        10,
    }).start();
  }, [state.index, isRTL]);

  const onTabsLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const w  = e.nativeEvent.layout.width;
    setTabW((w - H_PAD * 2) / numTabs);
  };

  const indicatorX = tabW > 0
    ? slideAnim.interpolate({
        inputRange:  Array.from({ length: numTabs }, (_, i) => i),
        outputRange: Array.from({ length: numTabs }, (_, i) => H_PAD + tabW * i),
      })
    : new Animated.Value(H_PAD);

  // ── Colours ────────────────────────────────────────────────────────────────

  // Bar background
  const barBg     = isDark ? "rgba(28,28,30,0.80)" : "rgba(249,249,249,0.84)";
  const barBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  // Pill indicator
  const pillBg = isDark ? "rgba(255,255,255,0.14)" : "#FFFFFF";

  // Bar shadow (native only — web uses boxShadow in inline style below)
  const shadowProps = Platform.OS !== "web"
    ? {
        shadowColor:   "#000",
        shadowOffset:  { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.38 : 0.13,
        shadowRadius:  28,
        elevation:     22,
      }
    : {};

  const bottomGap = insets.bottom > 0 ? insets.bottom + 4 : 12;

  return (
    <View
      style={[styles.wrapper, { bottom: bottomGap, pointerEvents: "box-none" } as any]}
    >
      <View
        style={[
          styles.capsule,
          shadowProps,
          {
            borderColor:     barBorder,
            backgroundColor: Platform.OS !== "web" ? "transparent" : barBg,
            ...(Platform.OS === "web"
              ? ({
                  backdropFilter:       "blur(28px) saturate(180%)",
                  WebkitBackdropFilter: "blur(28px) saturate(180%)",
                  boxShadow: isDark
                    ? "0 8px 32px rgba(0,0,0,0.42), 0 1px 0 rgba(255,255,255,0.05) inset"
                    : "0 8px 32px rgba(0,0,0,0.09), 0 1px 0 rgba(255,255,255,0.85) inset",
                } as object)
              : {}),
          },
        ]}
      >
        {/* Native blur */}
        {Platform.OS !== "web" && (
          <BlurView
            intensity={Platform.OS === "ios" ? 85 : 60}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS }]}
          />
        )}

        {/* Inner top gloss line */}
        <View
          style={[
            styles.glossLine,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.75)",
            },
          ]}
        />

        {/* Tabs row */}
        <View
          style={[
            styles.tabs,
            isRTL && styles.tabsRTL,
          ]}
          onLayout={onTabsLayout}
        >
          {/* Sliding white pill indicator */}
          {tabW > 0 && (
            <Animated.View
              style={[
                styles.pillIndicator,
                {
                  width:           tabW,
                  backgroundColor: pillBg,
                  transform:       [{ translateX: indicatorX }],
                  ...(Platform.OS === "web"
                    ? ({
                        boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)",
                      } as object)
                    : {
                        shadowColor:   "#000",
                        shadowOffset:  { width: 0, height: 2 },
                        shadowOpacity: 0.12,
                        shadowRadius:  8,
                        elevation:     4,
                      }),
                },
              ]}
            />
          )}

          {/* Tab items */}
          {routes.map((route: TabRoute, visIdx: number) => {
            const realIdx   = resolveIndex(visIdx);
            const { options } = descriptors[route.key];
            const isFocused = state.index === realIdx;

            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name);

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
  capsule: {
    borderRadius: BAR_RADIUS,
    borderWidth:  1,
    overflow:     "hidden",
  },
  glossLine: {
    position:     "absolute",
    top:          0,
    left:         18,
    right:        18,
    height:       1,
    borderRadius: 1,
  },
  tabs: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: H_PAD,
    paddingVertical:   V_PAD,
    zIndex:            2,
  },
  tabsRTL: {
    flexDirection: "row-reverse",
  },
  pillIndicator: {
    position:     "absolute",
    top:          V_PAD,
    left:         0,
    bottom:       V_PAD,
    borderRadius: PILL_RADIUS,
  },
  tabItem: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems:       "center",
    justifyContent:   "center",
    gap:              2,
    paddingVertical:  9,
    paddingHorizontal: 8,
    minWidth:         52,
  },
  tabLabel: {
    fontSize:      10,
    letterSpacing: 0.1,
    textAlign:     "center",
  },
  dot: {
    width:        4,
    height:       4,
    borderRadius: 2,
    marginTop:    1,
  },
});
