import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  seeAllRoute?: string;
  seeAllLabel?: string;
}

export function SectionHeader({ title, subtitle, seeAllRoute, seeAllLabel }: SectionHeaderProps) {
  const colors = useColors();
  const router = useRouter();
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.container, isRTL && styles.rtlRow]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.foreground }, isRTL && styles.rtlText]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {subtitle}
          </Text>
        )}
      </View>
      {seeAllRoute && (
        <Pressable onPress={() => router.push(seeAllRoute as any)}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>{seeAllLabel ?? "See all"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
