/**
 * Device Management Screen
 *
 * MVP / DEMO: this screen displays the locally generated device ID, but
 * reset requests are now submitted to the backend security API for admin review.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
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
import { createDeviceResetRequest, DeviceResetRequestError } from "@/services/catalogService";
import { getCurrentDeviceId } from "@/services/deviceService";
import { useColors } from "@/hooks/useColors";

// ── Types ─────────────────────────────────────────────────────────────────────

type ResetRequest = {
  id: string;
  userId: string;
  userEmail: string;
  deviceId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

function maskDeviceId(id: string): string {
  if (id.length <= 8) return "••••••••";
  return id.slice(0, 4) + "••••••••" + id.slice(-4);
}

// ── Security rule row ─────────────────────────────────────────────────────────

function RuleRow({ icon, text }: { icon: string; text: string }) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  return (
    <View style={[styles.ruleRow, isRTL && styles.rtlRow]}>
      <View style={[styles.ruleIconWrap, { backgroundColor: colors.primary + "14" }]}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.ruleText, { color: colors.foreground }, isRTL && styles.rtlText]}>
        {text}
      </Text>
    </View>
  );
}

// ── Request modal ─────────────────────────────────────────────────────────────

function ResetRequestModal({
  visible,
  onClose,
  onSubmit,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isDark: boolean;
}) {
  const colors = useColors();
  const { t, isRTL } = useLanguage();
  const [reason, setReason] = useState("");

  const handleSend = () => {
    onSubmit(reason.trim());
    setReason("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalSheet,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          <View style={[styles.modalIconRow]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons name="phone-portrait-outline" size={28} color={colors.accent} />
            </View>
          </View>

          <Text style={[styles.modalTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
            {t.device.requestTitle}
          </Text>
          <Text style={[styles.modalDesc, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {t.device.requestDesc}
          </Text>

          <TextInput
            style={[
              styles.reasonInput,
              {
                backgroundColor: isDark ? "#2C2C2E" : colors.secondary,
                borderColor: colors.border,
                color: colors.foreground,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            placeholder={t.device.reasonPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={[styles.modalActions, isRTL && styles.rtlRow]}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, { backgroundColor: isDark ? "#2C2C2E" : colors.secondary }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>
                {t.device.cancel}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSend}
              style={[
                styles.sendBtn,
                { backgroundColor: reason.trim() ? colors.primary : colors.border },
              ]}
              disabled={!reason.trim()}
            >
              <Text style={styles.sendBtnText}>{t.device.sendRequest}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DevicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const { t, isRTL } = useLanguage();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resetRequest, setResetRequest] = useState<ResetRequest | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  const isDark = false;
  const topPad = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => {
    getCurrentDeviceId().then(setDeviceId);
  }, []);

  const handleSubmitRequest = async (reason: string) => {
    if (!reason || !user) return;
    setSubmittingRequest(true);
    setRequestError("");
    try {
      const created = await createDeviceResetRequest({
        studentId: user.id,
        deviceId: deviceId ?? "unknown",
        reason,
      }) as { id?: string; status?: "pending" | "approved" | "rejected"; createdAt?: string };

      const req: ResetRequest = {
        id: created.id ?? "req-" + Date.now(),
        userId: user.id,
        userEmail: user.email,
        deviceId: deviceId ?? "unknown",
        reason,
        status: created.status ?? "pending",
        createdAt: created.createdAt ?? new Date().toISOString(),
      };
      setResetRequest(req.status === "pending" ? req : null);
      setShowModal(false);
      setShowSuccess(true);
      Animated.spring(successAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      if (error instanceof DeviceResetRequestError) {
        if (error.reason === "pending_request") setRequestError(t.device.resetPendingError);
        else if (error.reason === "cooldown") setRequestError(t.device.resetCooldownError);
        else if (error.reason === "monthly_limit") setRequestError(t.device.resetMonthlyLimitError);
        else setRequestError(error.message || t.device.requestError);
      } else {
        setRequestError(t.device.requestError);
      }
    } finally {
      setSubmittingRequest(false);
    }
  };

  const today = new Date().toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const RULES = [
    { icon: "shield-checkmark-outline", text: t.device.rule1 },
    { icon: "cloud-download-outline",   text: t.device.rule2 },
    { icon: "wifi-outline",             text: t.device.rule3 },
    { icon: "chatbubble-ellipses-outline", text: t.device.rule4 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#1A4A7C", "#0D2D4E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {t.device.screenTitle}
        </Text>
        <Text style={[styles.headerSub, isRTL && styles.rtlText]}>
          {t.device.sectionSubtitle}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 40,
          paddingTop: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Protection notice */}
        <View style={[styles.noticeCard, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30" }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primary }, isRTL && styles.rtlText]}>
            {t.device.protectionDesc}
          </Text>
        </View>

        {/* Device card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
            <View style={[styles.deviceIconWrap, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
                {t.device.thisDevice}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: "#16A34A15" }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t.device.statusActive}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <DeviceRow
            label={t.device.deviceId}
            value={deviceId ? maskDeviceId(deviceId) : "—"}
            icon="key-outline"
            isRTL={isRTL}
            colors={colors}
          />
          <DeviceRow
            label={t.device.platform}
            value={Platform.OS === "web" ? "Web Browser" : Platform.OS === "ios" ? "iOS" : "Android"}
            icon="laptop-outline"
            isRTL={isRTL}
            colors={colors}
          />
          <DeviceRow
            label={t.device.registeredOn}
            value={today}
            icon="calendar-outline"
            isRTL={isRTL}
            colors={colors}
          />
          <DeviceRow
            label={t.device.lastVerified}
            value={t.device.justNow}
            icon="checkmark-circle-outline"
            isRTL={isRTL}
            colors={colors}
            isLast
          />
        </View>

        {/* Security rules */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {t.device.securityRulesTitle}
          </Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {RULES.map((r, i) => (
              <RuleRow key={i} icon={r.icon} text={r.text} />
            ))}
          </View>
        </View>

        {/* Pending request badge */}
        {resetRequest && (
          <View
            style={[
              styles.pendingBadge,
              { backgroundColor: colors.accent + "18", borderColor: colors.accent + "40" },
            ]}
          >
            <Ionicons name="time-outline" size={18} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.pendingTitle, { color: colors.accent }, isRTL && styles.rtlText]}>
                {t.device.requestPending}
              </Text>
              <Text style={[styles.pendingDesc, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
                {t.device.requestPendingDesc}
              </Text>
            </View>
          </View>
        )}

        {/* Request change button */}
        {!resetRequest && (
          <Pressable
            onPress={() => setShowModal(true)}
            disabled={submittingRequest}
            style={({ pressed }) => [
              styles.requestBtn,
              {
                backgroundColor: colors.accent,
                opacity: pressed || submittingRequest ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
            <Text style={styles.requestBtnText}>{t.device.requestChange}</Text>
          </Pressable>
        )}

        {requestError !== "" && (
          <View style={[styles.errorCard, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "35" }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }, isRTL && styles.rtlText]}>
              {requestError}
            </Text>
          </View>
        )}

        {/* Demo note */}
        <View style={[styles.demoNote, { borderColor: colors.border }]}>
          <Ionicons name="flask-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.demoNoteText, { color: colors.mutedForeground }]}>
            {t.device.demoNote}
          </Text>
        </View>
      </ScrollView>

      {/* Success toast */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successToast,
            { backgroundColor: "#16A34A", transform: [{ scale: successAnim }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.successText}>{t.device.requestSent}</Text>
        </Animated.View>
      )}

      <ResetRequestModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmitRequest}
        isDark={isDark}
      />
    </View>
  );
}

// ── Device info row ────────────────────────────────────────────────────────────

function DeviceRow({
  label,
  value,
  icon,
  isRTL,
  colors,
  isLast = false,
}: {
  label: string;
  value: string;
  icon: string;
  isRTL: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.deviceRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        isRTL && styles.rtlRow,
      ]}
    >
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={[styles.deviceRowLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
        {label}
      </Text>
      <Text style={[styles.deviceRowValue, { color: colors.foreground }, isRTL && styles.rtlText]}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
  },

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
  },
  deviceRowLabel: {
    flex: 1,
    fontSize: 13,
  },
  deviceRowValue: {
    fontSize: 13,
    fontWeight: "500",
    maxWidth: "50%",
    textAlign: "right",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  ruleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  pendingBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  pendingDesc: {
    fontSize: 12,
  },

  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  requestBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  demoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  demoNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },

  successToast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
  },
  successText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalIconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  sendBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right", writingDirection: "rtl" },
});
