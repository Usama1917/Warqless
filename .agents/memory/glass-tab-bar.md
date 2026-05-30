---
name: GlassTabBar custom component
description: Custom glassmorphism bottom tab bar for Expo Router Tabs
---

Located at `artifacts/mobile/components/GlassTabBar.tsx`.

Used via `<Tabs tabBar={(props) => <GlassTabBar {...props} />}>` in `_layout.tsx`.

Key design:
- Web: `rgba(255,255,255,0.88)` background + CSS `backdropFilter: "blur(20px) saturate(180%)"` via React Native Web style prop
- iOS/Android: BlurView with intensity 85/60
- Floating pill: `borderRadius: 26`, shadow, subtle inner highlight border
- Active state: navy pill background behind icon + gold dot indicator below

**Typing gotcha:** The `navigation` prop must be typed as `any`. Importing `BottomTabBarProps` from `@react-navigation/bottom-tabs` is NOT needed — use inline `TabBarProps` type with `navigation: any` to avoid the strict event map literal type conflicts.

**RTL support:** Routes array is reversed when `isRTL` is true; index mapping adjusted accordingly.
