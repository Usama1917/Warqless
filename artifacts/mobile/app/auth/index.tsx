import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useApp();
  const { t, isRTL } = useLanguage();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError(t.auth.fillAll);
      return;
    }
    setLoading(true);
    try {
      let ok: boolean;
      if (mode === "login") {
        ok = await login(email, password);
      } else {
        if (!name || !phone) {
          setError(t.auth.fillAll);
          setLoading(false);
          return;
        }
        ok = await register(name, email, phone, password);
      }
      if (ok) {
        router.replace("/(tabs)");
      } else {
        setError(t.auth.invalidCredentials);
      }
    } catch {
      setError(t.auth.error);
    }
    setLoading(false);
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
        <View style={styles.logoWrap}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="library" size={32} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>Warqless</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>{t.auth.tagline}</Text>
        </View>

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
                {mode === "login" ? t.auth.signIn : t.auth.createAccount}
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
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: {
    padding: 4,
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
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_700Bold",
  },
  forgotBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
