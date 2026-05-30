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

type TabIconName =
  | "home"
  | "home-outline"
  | "search"
  | "search-outline"
  | "library"
  | "library-outline"
  | "repeat"
  | "person"
  | "person-outline";

const TAB_ICONS: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  index: { active: "home", inactive: "home-outline" },
  browse: { active: "search", inactive: "search-outline" },
  library: { active: "library", inactive: "library-outline" },
  borrowed: { active: "repeat", inactive: "repeat" },
  account: { active: "person", inactive: "person-outline" },
};

function TabItem({
  route,
  isFocused,
  label,
  onPress,
  onLongPress,
}: {
  route: string;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pillScale = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pillOpacity, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.spring(pillScale, {
        toValue: isFocused ? 1 : 0.7,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
    ]).start();
  }, [isFocused]);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const icons = TAB_ICONS[route] ?? { active: "home", inactive: "home-outline" };
  const iconName = isFocused ? icons.active : icons.inactive;

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
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Active pill background */}
        <Animated.View
          style={[
            styles.activePill,
            {
              backgroundColor: colors.primary + "18",
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />
        <Ionicons
          name={iconName as any}
          size={22}
          color={isFocused ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.primary : colors.mutedForeground,
              fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
              fontWeight: isFocused ? "600" : "400",
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {/* Active dot indicator */}
        {isFocused && (
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

type TabRoute = { key: string; name: string };
type TabDescriptor = { options: { tabBarLabel?: unknown; title?: string } };
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isRTL } = useLanguage();

  const routes = isRTL ? [...state.routes].reverse() : state.routes;
  const reversedIndex = isRTL
    ? (i: number) => state.routes.length - 1 - i
    : (i: number) => i;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          marginHorizontal: Platform.OS === "web" ? 12 : 10,
          marginBottom: Platform.OS === "web" ? 10 : 8,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor:
              Platform.OS === "web"
                ? isDark
                  ? "rgba(20,28,40,0.88)"
                  : "rgba(255,255,255,0.88)"
                : "transparent",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(26,74,124,0.10)",
            shadowColor: colors.primary,
          },
          Platform.OS === "web" && styles.webBackdrop,
        ]}
      >
        {/* Native blur (iOS/Android) */}
        {Platform.OS !== "web" && (
          <BlurView
            intensity={Platform.OS === "ios" ? 85 : 60}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
          />
        )}

        {/* Subtle inner border highlight */}
        <View
          style={[
            styles.innerHighlight,
            {
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.80)",
            },
          ]}
        />

        {/* Tabs */}
        <View style={[styles.tabs, isRTL && styles.tabsRTL]}>
          {routes.map((route: TabRoute, visIdx: number) => {
            const realIdx = reversedIndex(visIdx);
            const { options } = descriptors[route.key];
            const isFocused = state.index === realIdx;
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
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                route={route.name}
                isFocused={isFocused}
                label={label}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  bar: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  webBackdrop: {
    // React Native Web supports these CSS-mapped styles
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        } as any)
      : {}),
  },
  innerHighlight: {
    position: "absolute",
    inset: 0,
    borderRadius: 26,
    borderWidth: 1,
    zIndex: 1,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 2,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -2,
    right: -2,
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  activeDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
