import { Tabs } from "expo-router";
import React from "react";

import { GlassTabBar } from "@/components/GlassTabBar";
import { useLanguage } from "@/context/LanguageContext";

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="browse" options={{ title: t.tabs.browse }} />
      <Tabs.Screen name="library" options={{ title: t.tabs.library }} />
      <Tabs.Screen name="borrowed" options={{ title: t.tabs.borrowed }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.account }} />
    </Tabs>
  );
}
