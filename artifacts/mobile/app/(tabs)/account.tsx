import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { Language } from "@/i18n";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}

function MenuItem({ icon, label, value, onPress, danger = false, rightElement }: MenuItemProps) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? colors.muted : colors.card,
          borderBottomColor: colors.border,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View
        style={[
          styles.menuIconWrap,
          { backgroundColor: danger ? colors.destructive + "15" : colors.secondary },
        ]}
      >
        <Ionicons name={icon} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuLabel,
            { color: danger ? colors.destructive : colors.foreground },
            isRTL && styles.rtlText,
          ]}
        >
          {label}
        </Text>
        {value && (
          <Text style={[styles.menuValue, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {value}
          </Text>
        )}
      </View>
      {rightElement ?? (
        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={16}
          color={colors.mutedForeground}
        />
      )}
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
      {title}
    </Text>
  );
}

function LanguageSwitcher() {
  const colors = useColors();
  const { language, setLanguage, t, isRTL } = useLanguage();

  const options: { label: string; value: Language }[] = [
    { label: "English", value: "en" },
    { label: "العربية", value: "ar" },
  ];

  return (
    <View style={[styles.langRow, isRTL && styles.rtlRow]}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => setLanguage(opt.value)}
          style={[
            styles.langBtn,
            {
              backgroundColor: language === opt.value ? colors.primary : colors.secondary,
              borderColor: language === opt.value ? colors.primary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.langBtnText,
              { color: language === opt.value ? "#fff" : colors.foreground },
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, logout, purchasedBooks } = useApp();
  const { t, isRTL } = useLanguage();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="person-outline"
          title={t.account.signInTitle}
          description={t.account.signInDesc}
        />
        <Pressable
          onPress={() => router.push("/auth")}
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.signInText}>{t.account.signInBtn}</Text>
        </Pressable>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(t.account.signOutTitle, t.account.signOutConfirm, [
      { text: t.account.cancel, style: "cancel" },
      { text: t.account.signOut, style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View
        style={[styles.profileHeader, { paddingTop: topPad + 20, backgroundColor: colors.primary }]}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarLetter}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{purchasedBooks.length}</Text>
            <Text style={styles.statLabel}>{t.account.books}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {purchasedBooks.filter((b) => b.progress === 100).length}
            </Text>
            <Text style={styles.statLabel}>{t.account.completed}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.devicesCount}</Text>
            <Text style={styles.statLabel}>{t.account.devices}</Text>
          </View>
        </View>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <SectionTitle title={t.account.sectionPreferences} />
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View
            style={[
              styles.menuItem,
              {
                borderBottomColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="language-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: colors.foreground }, isRTL && styles.rtlText]}>
                {t.account.language}
              </Text>
            </View>
            <LanguageSwitcher />
          </View>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <SectionTitle title={t.account.sectionAccount} />
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="person-outline"
            label={t.account.personalInfo}
            value={user?.name}
            onPress={() => {}}
          />
          <MenuItem
            icon="call-outline"
            label={t.account.phoneNumber}
            value={user?.phone}
            onPress={() => {}}
          />
          <MenuItem
            icon="school-outline"
            label={t.account.grade}
            value={user?.grade}
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle title={t.account.sectionLibrary} />
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="receipt-outline"
            label={t.account.purchaseHistory}
            value={`${purchasedBooks.length} ${t.account.orders}`}
            onPress={() => {}}
          />
          <MenuItem
            icon="phone-portrait-outline"
            label={t.account.linkedDevices}
            value={`${user?.devicesCount} of 2`}
            onPress={() => {}}
          />
          <MenuItem icon="pricetag-outline" label={t.account.coupons} onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle title={t.account.sectionSecurity} />
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="lock-closed-outline"
            label={t.account.changePassword}
            onPress={() => {}}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label={t.account.twoFactor}
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle title={t.account.sectionSupport} />
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="help-circle-outline" label={t.account.helpCenter} onPress={() => {}} />
          <MenuItem
            icon="chatbubble-outline"
            label={t.account.contactSupport}
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            label={t.account.terms}
            onPress={() => {}}
          />
          <MenuItem icon="shield-outline" label={t.account.privacy} onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="log-out-outline"
            label={t.account.signOut}
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>{t.account.version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#0D1B2A",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  menuValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  langRow: {
    flexDirection: "row",
    gap: 6,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  langBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  signInBtn: {
    marginHorizontal: 32,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  signInText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 20,
    marginBottom: 8,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
