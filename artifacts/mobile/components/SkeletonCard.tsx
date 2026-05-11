import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.muted, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonBookCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonBox height={130} borderRadius={0} />
      <View style={styles.info}>
        <SkeletonBox height={14} width="90%" />
        <SkeletonBox height={12} width="60%" style={{ marginTop: 6 }} />
        <SkeletonBox height={12} width="40%" style={{ marginTop: 4 }} />
        <SkeletonBox height={16} width="50%" style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonListCard() {
  const colors = useColors();
  return (
    <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonBox width={52} height={68} borderRadius={8} />
      <View style={styles.listInfo}>
        <SkeletonBox height={14} width="80%" />
        <SkeletonBox height={12} width="50%" style={{ marginTop: 6 }} />
        <SkeletonBox height={14} width="35%" style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 5,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
    maxWidth: "50%",
  },
  info: {
    padding: 10,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  listInfo: {
    flex: 1,
  },
});
