/**
 * AppleGlassTabBar - clean iOS-style glass bottom navigation.
 *
 * BlurView is used only as the background layer. Tab icons and labels are
 * rendered above it so they stay sharp.
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/context/LanguageContext";

const ACTIVE_BLACK = "#000000";
const INACTIVE_GRAY = "#8A8A8E";

const BAR_BASE_HEIGHT = 74;
const TOP_RADIUS = 30;
const H_PAD = 10;
const TOP_PAD = 8;
const SAFE_AREA_EXTRA = 6;

const GLASS_BG = "rgba(255,255,255,0.88)";
const GLASS_WASH = "rgba(255,255,255,0.16)";
const TOP_BORDER = "rgba(0,0,0,0.06)";

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
}: {
  route: string;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  isRTL: boolean;
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
            color={isFocused ? ACTIVE_BLACK : INACTIVE_GRAY}
          />
        </Animated.View>

        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? ACTIVE_BLACK : INACTIVE_GRAY,
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

export function AppleGlassTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();

  const numTabs = state.routes.length;
  const routes = isRTL ? [...state.routes].reverse() : state.routes;
  const resolveIndex = isRTL
    ? (visualIndex: number) => numTabs - 1 - visualIndex
    : (visualIndex: number) => visualIndex;

  const barHeight = BAR_BASE_HEIGHT + insets.bottom;
  const nativeShadow =
    Platform.OS !== "web"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
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
              backgroundColor: GLASS_BG,
              paddingBottom: insets.bottom + SAFE_AREA_EXTRA,
              ...(Platform.OS === "web"
                ? ({
                    backdropFilter: "blur(22px) saturate(170%)",
                    WebkitBackdropFilter: "blur(22px) saturate(170%)",
                    boxShadow: "0 -4px 24px rgba(17,24,39,0.08)",
                  } as object)
                : {}),
            },
          ]}
        >
          {Platform.OS !== "web" && (
            <BlurView
              intensity={50}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          )}

          <View pointerEvents="none" style={styles.glassWash} />
          <View pointerEvents="none" style={styles.topBorder} />

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
                />
              );
            })}
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
    borderColor: TOP_BORDER,
    paddingTop: TOP_PAD,
    paddingHorizontal: H_PAD,
  },
  glassWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GLASS_WASH,
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.68)",
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
