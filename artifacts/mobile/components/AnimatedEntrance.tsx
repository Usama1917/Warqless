/**
 * AnimatedEntrance — fade + slide-up entrance wrapper
 *
 * Re-triggers every time the parent screen comes into focus (using
 * useFocusEffect), so tab switching and back-navigation feel live.
 *
 * Props:
 *   delay  — ms before this piece starts (use index * 60 for stagger)
 *   dy     — initial Y offset (default 18px)
 *   style  — additional View styles
 */

import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  dy?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedEntrance({
  children,
  delay = 0,
  dy = 18,
  style,
}: AnimatedEntranceProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(dy)).current;

  const runAnimation = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(dy);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue:         1,
        duration:        300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue:         0,
        delay,
        tension:         72,
        friction:        12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, dy]);

  useFocusEffect(
    useCallback(() => {
      runAnimation();
    }, [runAnimation])
  );

  return (
    <Animated.View
      style={[{ opacity, transform: [{ translateY }] }, style]}
    >
      {children}
    </Animated.View>
  );
}
