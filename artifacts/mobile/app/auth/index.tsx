import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function isValidEgyptPhone(value: string) {
  let compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (/^(010|011|012|015)\d{8}$/.test(compact)) compact = `+2${compact}`;
  if (/^20(10|11|12|15)\d{8}$/.test(compact)) compact = `+${compact}`;
  return /^\+20(10|11|12|15)\d{8}$/.test(compact);
}

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register, requestPhoneVerification, verifyPhoneCode, sessionMessage, clearSessionMessage } = useApp();
  const { t, isRTL } = useLanguage();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [pendingPhoneVerification, setPendingPhoneVerification] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [devOtpCode, setDevOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionMessage) return;
    setError(sessionMessage === "expired" ? t.auth.sessionExpired : t.auth.forceLogout);
    clearSessionMessage();
  }, [clearSessionMessage, sessionMessage, t.auth.forceLogout, t.auth.sessionExpired]);

  const handleSubmit = async () => {
    setError("");
    if (pendingPhoneVerification) {
      if (!/^\d{6}$/.test(otpCode.trim())) {
        setError(t.auth.phoneVerificationRequired);
        return;
      }
      setLoading(true);
      const result = await verifyPhoneCode(otpCode.trim());
      setLoading(false);
      if (result.ok) {
        router.replace("/(tabs)");
      } else {
        setError(result.error ?? t.auth.error);
      }
      return;
    }

    if (!email || !password) {
      setError(t.auth.fillAll);
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result === "ok") {
          router.replace("/(tabs)");
        } else if (result === "device_blocked") {
          setError(t.protection.deviceBlockedDesc + "\n\n" + t.protection.deviceChangeInfo);
        } else if (result === "security_unavailable") {
          setError(t.protection.securityUnavailableDesc);
        } else {
          setError(t.auth.invalidCredentials);
        }
      } else {
        if (!name || !phone) {
          setError(t.auth.fillAll);
          setLoading(false);
          return;
        }
        if (!isValidEgyptPhone(phone)) {
          setError(t.auth.phoneInvalid);
          setLoading(false);
          return;
        }
        const result = await register(name, email, phone, password);
        if (result.status === "ok") {
          setPendingPhoneVerification(true);
          setDevOtpCode(result.devCode ?? "");
          setOtpCode("");
        } else if (result.status === "invalid_phone") {
          setError(t.auth.phoneInvalid);
        } else if (result.status === "device_blocked") {
          setError(t.protection.deviceBlockedDesc + "\n\n" + t.protection.deviceChangeInfo);
        } else if (result.status === "security_unavailable") {
          setError(t.protection.securityUnavailableDesc);
        } else if (result.status === "phone_verification_unavailable") {
          setError(result.error ?? t.auth.error);
        } else {
          setError(t.auth.error);
        }
      }
    } catch {
      setError(t.auth.error);
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    const result = await requestPhoneVerification();
    setLoading(false);
    if (result.ok) {
      setDevOtpCode(result.devCode ?? "");
      setOtpCode("");
    } else {
      setError(result.error ?? t.auth.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <AnimatedEntrance delay={0} dy={20}>
        <View style={styles.logoWrap}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="library" size={32} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>Warqless</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>{t.auth.tagline}</Text>
        </View>
        </AnimatedEntrance>

        {/* Tab switcher */}
        <View
          style={[
            styles.tabRow,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          {(["login", "register"] as const).map((m) => (
            <Pressable
              key={m}
              style={[
                styles.tabBtn,
                mode === m && [styles.tabBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => {
                setMode(m);
                setError("");
                setPendingPhoneVerification(false);
                setOtpCode("");
                setDevOtpCode("");
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === m ? "#fff" : colors.mutedForeground },
                ]}
              >
                {m === "login" ? t.auth.signIn : t.auth.signUp}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === "register" && (
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }, isRTL && styles.rtlText]}>
                {t.auth.fullName}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                placeholder={t.auth.fullNamePlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }, isRTL && styles.rtlText]}>
              {t.auth.email}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: "left",
                },
              ]}
              placeholder={t.auth.emailPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {mode === "register" && (
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }, isRTL && styles.rtlText]}>
                {t.auth.phone}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                    textAlign: "left",
                  },
                ]}
                placeholder={t.auth.phonePlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          )}

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }, isRTL && styles.rtlText]}>
              {t.auth.password}
            </Text>
            <View
              style={[
                styles.passwordWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <TextInput
                style={[
                  styles.passwordInput,
                  { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                ]}
                placeholder={t.auth.passwordPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? "eye-off" : "eye"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          {pendingPhoneVerification && (
            <View
              style={[
                styles.verificationBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.verificationHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={[styles.verificationIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="call-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verificationTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
                    {t.auth.phoneVerificationTitle}
                  </Text>
                  <Text style={[styles.verificationDesc, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
                    {t.auth.phoneVerificationDesc}
                  </Text>
                </View>
              </View>

              {devOtpCode !== "" && (
                <Text style={[styles.devCode, { color: colors.accent }, isRTL && styles.rtlText]}>
                  {t.auth.phoneVerificationDevCode}: <Text style={styles.devCodeValue}>{devOtpCode}</Text>
                </Text>
              )}

              <Text style={[styles.fieldLabel, { color: colors.foreground }, isRTL && styles.rtlText]}>
                {t.auth.phoneVerificationCode}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                    textAlign: "left",
                  },
                ]}
                placeholder={t.auth.phoneVerificationPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={otpCode}
                onChangeText={(value) => setOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable onPress={handleResendCode} disabled={loading} style={styles.resendBtn}>
                <Text style={[styles.resendText, { color: colors.primary }]}>{t.auth.resendCode}</Text>
              </Pressable>
            </View>
          )}

          {error !== "" && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + "15",
                  borderColor: colors.destructive + "40",
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }, isRTL && styles.rtlText]}>
                {error}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.submitBtn,
              { backgroundColor: loading ? colors.primary + "80" : colors.primary },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {pendingPhoneVerification ? t.auth.verifyPhone : mode === "login" ? t.auth.signIn : t.auth.createAccount}
              </Text>
            )}
          </Pressable>

          {mode === "login" && (
            <Pressable style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                {t.auth.forgotPassword}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          {t.auth.termsText}{" "}
          <Text style={{ color: colors.primary }}>{t.auth.termsLink}</Text>{" "}
          {t.auth.and}{" "}
          <Text style={{ color: colors.primary }}>{t.auth.privacyLink}</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
  },
  tagline: {
    fontSize: 14,
    marginTop: 2,
  },
  tabRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 28,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tabBtnActive: {},
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  passwordWrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  verificationBox: {
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  verificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  verificationDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  devCode: {
    fontSize: 12,
    fontWeight: "700",
  },
  devCodeValue: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  resendBtn: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  resendText: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  forgotBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "500",
  },
  terms: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
