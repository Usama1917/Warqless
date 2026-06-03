import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedEntrance } from "@/components/AnimatedEntrance";
import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { Language } from "@/i18n";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  valueDirection?: "ltr" | "rtl";
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}

function MenuItem({
  icon,
  label,
  value,
  valueDirection,
  onPress,
  danger = false,
  rightElement,
}: MenuItemProps) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const forceValueLTR = valueDirection === "ltr";
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
          <Text
            style={[
              styles.menuValue,
              { color: colors.mutedForeground },
              forceValueLTR
                ? [styles.ltrValue, isRTL && styles.ltrValueInRTL]
                : isRTL && styles.rtlText,
            ]}
          >
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
  const {
    user,
    isAuthenticated,
    logout,
    purchasedBooks,
    requestPhoneVerification,
    verifyPhoneCode,
    changePhone,
  } = useApp();
  const { t, isRTL } = useLanguage();
  const [isPhoneEditorOpen, setIsPhoneEditorOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(user?.phone ?? "");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneDevCode, setPhoneDevCode] = useState("");
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");

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

  const openPhoneEditor = () => {
    setIsPhoneEditorOpen(true);
    setPhoneDraft(user?.phone ?? "");
    setPhoneCode("");
    setPhoneDevCode("");
    setPhoneCodeRequested(false);
    setPhoneMessage("");
    setPhoneError("");
  };

  const handleSavePhone = async () => {
    setPhoneBusy(true);
    setPhoneError("");
    setPhoneMessage("");
    const result = await changePhone(phoneDraft);
    setPhoneBusy(false);
    if (result.ok) {
      setPhoneMessage(t.account.phoneUpdated);
      setPhoneCode("");
      setPhoneDevCode("");
      setPhoneCodeRequested(false);
    } else {
      setPhoneError(result.error ?? t.common.error);
    }
  };

  const handleRequestPhoneVerification = async () => {
    setPhoneBusy(true);
    setPhoneError("");
    setPhoneMessage("");
    const result = await requestPhoneVerification();
    setPhoneBusy(false);
    if (result.ok) {
      setPhoneCodeRequested(true);
      setPhoneDevCode(result.devCode ?? "");
      setPhoneCode("");
    } else {
      setPhoneError(result.error ?? t.common.error);
    }
  };

  const handleVerifyPhone = async () => {
    if (!/^\d{6}$/.test(phoneCode.trim())) {
      setPhoneError(t.auth.phoneVerificationRequired);
      return;
    }

    setPhoneBusy(true);
    setPhoneError("");
    setPhoneMessage("");
    const result = await verifyPhoneCode(phoneCode.trim());
    setPhoneBusy(false);
    if (result.ok) {
      setPhoneMessage(t.account.phoneVerifiedSuccess);
      setPhoneCode("");
      setPhoneDevCode("");
      setPhoneCodeRequested(false);
    } else {
      setPhoneError(result.error ?? t.common.error);
    }
  };

  const handleTwoFactorPress = () => {
    Alert.alert(
      t.account.twoFactor,
      user?.phoneVerified ? t.account.smsTwoFactorNotReady : t.account.smsTwoFactorNeedsPhone,
    );
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
      <AnimatedEntrance delay={0} dy={24}>
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
      </AnimatedEntrance>

      {/* Language */}
      <AnimatedEntrance delay={80}>
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
      </AnimatedEntrance>

      {/* Account */}
      <AnimatedEntrance delay={160}>
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
            valueDirection="ltr"
            onPress={openPhoneEditor}
            rightElement={
              <View
                style={[
                  styles.phoneStatusBadge,
                  {
                    backgroundColor: user?.phoneVerified ? "#DCFCE7" : "#FEF3C7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.phoneStatusText,
                    { color: user?.phoneVerified ? "#15803D" : "#A16207" },
                  ]}
                >
                  {user?.phoneVerified ? t.account.phoneVerified : t.account.phoneNotVerified}
                </Text>
              </View>
            }
          />
          <MenuItem
            icon="school-outline"
            label={t.account.grade}
            value={user?.grade}
            onPress={() => {}}
          />
        </View>
        {isPhoneEditorOpen && (
          <View style={[styles.phonePanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.phonePanelTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
              {t.account.changePhone}
            </Text>
            <TextInput
              style={[
                styles.phoneInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: "left",
                },
              ]}
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              placeholder={t.auth.phonePlaceholder}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
            <View style={[styles.phoneActions, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable
                onPress={handleSavePhone}
                disabled={phoneBusy}
                style={[styles.phoneActionBtn, { backgroundColor: colors.primary }]}
              >
                {phoneBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.phoneActionText}>{t.account.savePhone}</Text>}
              </Pressable>
              <Pressable
                onPress={handleRequestPhoneVerification}
                disabled={phoneBusy}
                style={[styles.phoneSecondaryBtn, { borderColor: colors.primary }]}
              >
                <Text style={[styles.phoneSecondaryText, { color: colors.primary }]}>{t.account.verifyPhone}</Text>
              </Pressable>
            </View>
            {(phoneCodeRequested || phoneDevCode !== "" || phoneCode !== "") && !user?.phoneVerified && (
              <View style={styles.phoneCodeBox}>
                {phoneDevCode !== "" && (
                  <Text style={[styles.phoneDevCode, { color: colors.accent }, isRTL && styles.rtlText]}>
                    {t.auth.phoneVerificationDevCode}: <Text style={styles.phoneDevCodeValue}>{phoneDevCode}</Text>
                  </Text>
                )}
                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground,
                      textAlign: "left",
                    },
                  ]}
                  value={phoneCode}
                  onChangeText={(value) => setPhoneCode(value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t.auth.phoneVerificationPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  onPress={handleVerifyPhone}
                  disabled={phoneBusy}
                  style={[styles.phoneActionBtn, { backgroundColor: colors.primary }]}
                >
                  {phoneBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.phoneActionText}>{t.auth.verifyPhone}</Text>}
                </Pressable>
              </View>
            )}
            {phoneMessage !== "" && (
              <Text style={[styles.phoneMessage, { color: "#15803D" }, isRTL && styles.rtlText]}>{phoneMessage}</Text>
            )}
            {phoneError !== "" && (
              <Text style={[styles.phoneMessage, { color: colors.destructive }, isRTL && styles.rtlText]}>{phoneError}</Text>
            )}
          </View>
        )}
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

      {/* Device Security card */}
      <View style={styles.section}>
        <SectionTitle title={t.device.sectionTitle} />
        <Pressable
          onPress={() => router.push("/account/devices")}
          style={({ pressed }) => [
            styles.deviceCard,
            {
              backgroundColor: pressed ? colors.primary + "F5" : colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          {/* top row */}
          <View style={[styles.deviceCardRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={styles.deviceCardIcon}>
              <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.deviceCardTitle, isRTL && styles.rtlText]}>
                {t.device.sectionTitle}
              </Text>
              <Text style={[styles.deviceCardSub, isRTL && styles.rtlText]}>
                {t.device.sectionSubtitle}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={16}
              color="rgba(255,255,255,0.6)"
            />
          </View>

          {/* status pills row */}
          <View style={[styles.devicePillsRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={styles.devicePill}>
              <View style={styles.devicePillDot} />
              <Text style={styles.devicePillText}>{t.device.active}</Text>
            </View>
            <View style={[styles.devicePill, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Ionicons name="shield-checkmark-outline" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.devicePillText}>{t.device.verified}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={styles.deviceManageText}>{t.device.manageDevice}</Text>
          </View>
        </Pressable>
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
            value={user?.phoneVerified ? t.account.phoneVerified : t.account.smsTwoFactorNeedsPhone}
            onPress={handleTwoFactorPress}
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
      </AnimatedEntrance>
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
    color: "#0D1B2A",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
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
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
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
    fontWeight: "500",
  },
  menuValue: {
    fontSize: 12,
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
    fontWeight: "600",
  },
  phoneStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  phoneStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  phonePanel: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
    padding: 14,
    gap: 10,
  },
  phonePanelTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  phoneInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  phoneActions: {
    flexDirection: "row",
    gap: 10,
  },
  phoneActionBtn: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flex: 1,
  },
  phoneActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  phoneSecondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flex: 1,
  },
  phoneSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  phoneCodeBox: {
    gap: 10,
  },
  phoneDevCode: {
    fontSize: 12,
    fontWeight: "700",
  },
  phoneDevCodeValue: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  phoneMessage: {
    fontSize: 12,
    lineHeight: 17,
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
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  ltrValue: {
    textAlign: "left",
    writingDirection: "ltr",
  },
  ltrValueInRTL: {
    textAlign: "right",
  },
  deviceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  deviceCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  deviceCardSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },
  devicePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  devicePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  devicePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
  },
  deviceManageText: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
});
