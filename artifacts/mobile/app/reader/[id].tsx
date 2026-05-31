import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { BOOKS } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";
import { verifyBookLicense } from "@/services/licenseService";
import { getCurrentDeviceId } from "@/services/deviceService";
import { logSecurityEvent } from "@/services/securityEventService";

type ReadingMode = "light" | "dark" | "sepia";

const READING_MODE_CONFIGS: { mode: ReadingMode; bg: string; fg: string; labelKey: "lightMode" | "darkMode" | "sepiaMode" }[] = [
  { mode: "light", bg: "#FFFFFF", fg: "#1A1A1A", labelKey: "lightMode" },
  { mode: "sepia", bg: "#F9F0DC", fg: "#3B2A1A", labelKey: "sepiaMode" },
  { mode: "dark", bg: "#1A1A2E", fg: "#E8E8F0", labelKey: "darkMode" },
];

const SAMPLE_PAGES: string[][] = [
  [
    "Chapter 1: Introduction",
    "Mathematics is the language of the universe — a precise, universal system for describing patterns, relationships, and structures in the world around us.",
    "In this chapter, we will explore the fundamental concepts that form the backbone of advanced mathematics. Each topic builds on the previous, creating a comprehensive framework for problem-solving.",
    "Key Concepts:",
    "• Sets and their properties",
    "• Functions and mappings",
    "• Limits and continuity",
    "• The concept of infinity",
  ],
  [
    "1.1 Sets and Logic",
    "A set is a well-defined collection of distinct objects. These objects are called elements or members of the set.",
    "Example: A = {1, 2, 3, 4, 5} is a set of the first five natural numbers.",
    "Set Builder Notation: A = {x | x ∈ ℕ, x ≤ 5}",
    "Operations on Sets:",
    "Union (A ∪ B): All elements in A or B",
    "Intersection (A ∩ B): Elements in both A and B",
    "Complement (A'): Elements not in A",
    "DeMorgan's Laws:",
    "(A ∪ B)' = A' ∩ B'",
    "(A ∩ B)' = A' ∪ B'",
  ],
  [
    "1.2 Functions and Relations",
    "A function f: A → B is a rule that assigns exactly one element of B to each element of A.",
    "Domain: The set of all valid inputs (set A)",
    "Range: The set of all actual outputs",
    "Codomain: The set of all possible outputs (set B)",
    "Types of Functions:",
    "• One-to-one (Injective): Different inputs → different outputs",
    "• Onto (Surjective): Every element in B is mapped to",
    "• Bijective: Both one-to-one and onto",
    "The Vertical Line Test: A curve in the xy-plane is a function if and only if every vertical line intersects it at most once.",
  ],
  [
    "Practice Problems",
    "1. Let A = {1, 2, 3, 4, 6, 12} be the set of divisors of 12.",
    "   Find A ∩ {even numbers less than 10}",
    "2. Given f(x) = 2x² + 3x - 5, find:",
    "   a) f(0)   b) f(2)   c) f(-1)",
    "3. Determine if f(x) = x³ is one-to-one. Justify your answer.",
    "4. Sketch the graph of f(x) = |x - 2| + 1",
    "   State its domain and range.",
    "5. If g(x) = √(x - 3), find the domain of g.",
    "",
    "Answers on next page →",
  ],
];

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, purchasedBooks, borrowedBooks, updateReadingProgress, toggleBookmark } = useApp();
  const { t, isRTL } = useLanguage();

  const book =
    purchasedBooks.find((b) => b.id === id) ??
    borrowedBooks.find((b) => b.id === id) ??
    BOOKS.find((b) => b.id === id);

  const purchasedBook = purchasedBooks.find((b) => b.id === id);

  const [currentPage, setCurrentPage] = useState(purchasedBook?.lastPage ?? 1);
  const [readingMode, setReadingMode] = useState<ReadingMode>("light");
  const [showToolbar, setShowToolbar] = useState(true);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [notes, setNotes] = useState<{ page: number; text: string }[]>([]);
  const [highlights, setHighlights] = useState<Set<number>>(new Set());
  const [showToc, setShowToc] = useState(false);

  const toolbarOpacity = useRef(new Animated.Value(1)).current;
  const securityEventLogged = useRef(false);
  const totalPages = book?.pages ?? 100;
  const pageIndex = Math.min(currentPage - 1, SAMPLE_PAGES.length - 1);
  const pageContent = SAMPLE_PAGES[pageIndex] ?? SAMPLE_PAGES[0];
  const isBookmarked = purchasedBook?.bookmarkedPages.includes(currentPage) ?? false;

  const modeStyle = READING_MODE_CONFIGS.find((m) => m.mode === readingMode) ?? READING_MODE_CONFIGS[0];

  // Log security event once on mount
  useEffect(() => {
    if (securityEventLogged.current || !user) return;
    securityEventLogged.current = true;
    getCurrentDeviceId().then((deviceId) => {
      if (licenseCheck.valid) {
        logSecurityEvent({
          type: "reader_opened",
          severity: "low",
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          bookId: id ?? undefined,
          bookTitle: book?.title,
          deviceId,
          message: `Reader opened for "${book?.title ?? id}". License and device verified.`,
          metadata: { page: String(currentPage) },
        });
      } else {
        const reason = licenseCheck.reason;
        logSecurityEvent({
          type: "reader_access_denied",
          severity: "high",
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          bookId: id ?? undefined,
          bookTitle: book?.title,
          deviceId,
          message:
            reason === "lent_out"
              ? `Reader access denied for "${book?.title ?? id}". Book is currently lent out.`
              : `Reader access denied for "${book?.title ?? id}". Book not purchased or borrowed.`,
          metadata: { reason: reason ?? "unknown" },
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const progress = Math.round((currentPage / totalPages) * 100);
    if (purchasedBook) {
      updateReadingProgress(purchasedBook.id, currentPage, Math.min(progress, 100));
    }
  }, [currentPage]);

  const toggleToolbar = useCallback(() => {
    const toValue = showToolbar ? 0 : 1;
    setShowToolbar(!showToolbar);
    Animated.timing(toolbarOpacity, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showToolbar, toolbarOpacity]);

  const goNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const goPrev = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleBookmark = () => {
    if (purchasedBook) {
      toggleBookmark(purchasedBook.id, currentPage);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleHighlight = () => {
    setHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(currentPage)) next.delete(currentPage);
      else next.add(currentPage);
      return next;
    });
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      setNotes((prev) => [
        ...prev.filter((n) => n.page !== currentPage),
        { page: currentPage, text: noteText },
      ]);
      setNoteText("");
      setShowNoteInput(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Access Guard ────────────────────────────────────────────────────────────
  // Verify the user owns or has borrowed this book before allowing reader access.
  // In production this must be replaced with server-side license verification.
  const purchasedIds = purchasedBooks.map((b) => b.id);
  const borrowedIds = borrowedBooks.filter((b) => !b.isLentOut).map((b) => b.id);
  const lentOutIds = borrowedBooks.filter((b) => b.isLentOut).map((b) => b.id);
  const licenseCheck = verifyBookLicense(id ?? "", purchasedIds, borrowedIds, lentOutIds);

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>{t.common.error}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: 12 }}>{t.common.back}</Text>
        </Pressable>
      </View>
    );
  }

  if (licenseCheck.valid === false) {
    const isLentOut = licenseCheck.reason === "lent_out";
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: isLentOut ? colors.accent + "20" : "#EF444420",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons
            name={isLentOut ? "swap-horizontal" : "lock-closed"}
            size={32}
            color={isLentOut ? colors.accent : "#EF4444"}
          />
        </View>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 18,
            fontFamily: "Inter_700Bold",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {isLentOut ? t.protection.lentOutTitle : t.protection.accessDeniedTitle}
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          {isLentOut ? t.protection.lentOutDesc : t.protection.accessDeniedDesc}
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/library")}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: 14,
            marginBottom: 12,
            minWidth: 200,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontWeight: "600", fontSize: 15 }}>
            {t.protection.backToLibrary}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/(tabs)/browse")}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 4 }}>
            {t.protection.browseStore}
          </Text>
        </Pressable>
      </View>
    );
  }

  const prevIcon = isRTL ? "chevron-forward" : "chevron-back";
  const nextIcon = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <View style={[styles.container, { backgroundColor: modeStyle.bg }]}>
      {/* Top toolbar */}
      <Animated.View
        style={[
          styles.topBar,
          {
            paddingTop: topPad,
            backgroundColor: modeStyle.bg,
            borderBottomColor: modeStyle.fg + "20",
            opacity: toolbarOpacity,
          },
        ]}
        pointerEvents={showToolbar ? "auto" : "none"}
      >
        <View style={[styles.topBarInner, isRTL && styles.rtlRow]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={modeStyle.fg} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <Text
              style={[styles.bookTitleSmall, { color: modeStyle.fg }, isRTL && styles.rtlText]}
              numberOfLines={1}
            >
              {book.title}
            </Text>
            <Text style={[styles.pageCounter, { color: modeStyle.fg + "80" }]}>
              {t.reader.page} {currentPage} {t.reader.of} {totalPages}
            </Text>
          </View>
          <View style={[styles.topBarActions, isRTL && styles.rtlRow]}>
            <Pressable
              onPress={() => setShowModeMenu(!showModeMenu)}
              style={styles.iconBtn}
            >
              <Ionicons name="sunny-outline" size={22} color={modeStyle.fg} />
            </Pressable>
            <Pressable onPress={() => setShowToc(!showToc)} style={styles.iconBtn}>
              <Ionicons name="list-outline" size={22} color={modeStyle.fg} />
            </Pressable>
          </View>
        </View>

        {/* Mode menu */}
        {showModeMenu && (
          <View
            style={[
              styles.modeMenu,
              { backgroundColor: modeStyle.bg, borderColor: modeStyle.fg + "20" },
            ]}
          >
            <Text style={[styles.modeMenuTitle, { color: modeStyle.fg + "80" }]}>
              {t.reader.lightMode} / {t.reader.sepiaMode} / {t.reader.darkMode}
            </Text>
            <View style={[styles.modeRow, isRTL && styles.rtlRow]}>
              {READING_MODE_CONFIGS.map((m) => (
                <Pressable
                  key={m.mode}
                  onPress={() => {
                    setReadingMode(m.mode);
                    setShowModeMenu(false);
                  }}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: m.bg,
                      borderColor:
                        m.mode === readingMode ? colors.primary : modeStyle.fg + "30",
                    },
                  ]}
                >
                  <Text style={[styles.modeBtnText, { color: m.fg }]}>{t.reader[m.labelKey]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.fontSizeRow, isRTL && styles.rtlRow]}>
              <Text style={[styles.modeMenuTitle, { color: modeStyle.fg + "80" }]}>
                Font Size
              </Text>
              <View style={[styles.fontSizeBtns, isRTL && styles.rtlRow]}>
                <Pressable
                  onPress={() => setFontSize((f) => Math.max(12, f - 1))}
                  style={styles.fontBtn}
                >
                  <Text style={[styles.fontBtnText, { color: modeStyle.fg }]}>A-</Text>
                </Pressable>
                <Text style={[styles.fontSizeValue, { color: modeStyle.fg }]}>{fontSize}</Text>
                <Pressable
                  onPress={() => setFontSize((f) => Math.min(22, f + 1))}
                  style={styles.fontBtn}
                >
                  <Text style={[styles.fontBtnText, { color: modeStyle.fg }]}>A+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* TOC */}
        {showToc && (
          <View
            style={[
              styles.tocPanel,
              { backgroundColor: modeStyle.bg, borderColor: modeStyle.fg + "20" },
            ]}
          >
            <Text style={[styles.modeMenuTitle, { color: modeStyle.fg }]}>
              {t.reader.tableOfContents}
            </Text>
            {SAMPLE_PAGES.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  setCurrentPage(i + 1);
                  setShowToc(false);
                }}
                style={[
                  styles.tocItem,
                  {
                    borderBottomColor: modeStyle.fg + "15",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tocText,
                    {
                      color: currentPage === i + 1 ? colors.primary : modeStyle.fg,
                    },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {p[0]}
                </Text>
                <Text style={[styles.tocPage, { color: modeStyle.fg + "60" }]}>p.{i + 1}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Progress bar */}
      <View style={[styles.progressStrip, { backgroundColor: modeStyle.fg + "15" }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${(currentPage / totalPages) * 100}%` as any,
            },
          ]}
        />
      </View>

      {/* Watermark — user-stamped, tiled, semi-transparent
           In production: generate server-side with signed license ID */}
      <View style={styles.watermarkOverlay} pointerEvents="none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.watermarkTile, { top: `${14 + i * 16}%` as any }]}>
            <Text style={styles.watermarkText}>
              Warqless · {user?.email ?? "demo@warqless.com"} · {t.protection.demoLicense}
            </Text>
          </View>
        ))}
      </View>

      {/* Page content */}
      <Pressable onPress={toggleToolbar} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.pageContent,
            { paddingTop: 20, paddingBottom: botPad + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {pageContent.map((para, i) => {
            const isHeading = i === 0;
            const isBullet = para.startsWith("•");
            const isFormula = para.includes("=") && para.length < 40 && i > 1;
            return (
              <Text
                key={i}
                selectable={false}
                style={[
                  isHeading
                    ? styles.pageHeading
                    : isBullet
                    ? styles.pageBullet
                    : isFormula
                    ? styles.pageFormula
                    : styles.pageText,
                  {
                    color: modeStyle.fg,
                    fontSize: isHeading ? fontSize + 4 : isFormula ? fontSize - 1 : fontSize,
                    backgroundColor: highlights.has(currentPage) && !isHeading
                      ? "#FFDD0030"
                      : "transparent",
                  },
                ]}
              >
                {para}
              </Text>
            );
          })}

          {/* Notes for this page */}
          {notes
            .filter((n) => n.page === currentPage)
            .map((n, i) => (
              <View
                key={i}
                style={[
                  styles.noteBox,
                  {
                    backgroundColor: "#FFD60020",
                    borderLeftColor: "#F59E0B",
                    borderLeftWidth: isRTL ? 0 : 3,
                    borderRightWidth: isRTL ? 3 : 0,
                    borderRightColor: "#F59E0B",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Ionicons name="document-text" size={14} color="#F59E0B" />
                <Text style={[styles.noteText, { color: modeStyle.fg }, isRTL && styles.rtlText]}>
                  {n.text}
                </Text>
              </View>
            ))}
        </ScrollView>
      </Pressable>

      {/* Note input */}
      {showNoteInput && (
        <View
          style={[
            styles.noteInputWrap,
            { backgroundColor: modeStyle.bg, borderTopColor: modeStyle.fg + "20" },
          ]}
        >
          <TextInput
            style={[
              styles.noteInput,
              {
                color: modeStyle.fg,
                borderColor: modeStyle.fg + "30",
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            placeholder={t.reader.notePlaceholder}
            placeholderTextColor={modeStyle.fg + "60"}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            autoFocus
          />
          <View style={[styles.noteInputActions, isRTL && styles.rtlRow]}>
            <Pressable onPress={() => setShowNoteInput(false)} style={styles.noteCancelBtn}>
              <Text style={{ color: modeStyle.fg + "80" }}>{t.reader.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveNote}
              style={[styles.noteSaveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.noteSaveBtnText}>{t.reader.save}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom toolbar */}
      <Animated.View
        style={[
          styles.bottomBar,
          {
            paddingBottom: botPad + 4,
            backgroundColor: modeStyle.bg,
            borderTopColor: modeStyle.fg + "20",
            opacity: toolbarOpacity,
          },
        ]}
        pointerEvents={showToolbar ? "auto" : "none"}
      >
        {/* Annotation tools */}
        <View style={styles.toolRow}>
          <Pressable
            onPress={handleBookmark}
            style={[styles.toolBtn, isBookmarked && { backgroundColor: colors.accent + "20" }]}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={20}
              color={isBookmarked ? colors.accent : modeStyle.fg}
            />
          </Pressable>
          <Pressable
            onPress={handleHighlight}
            style={[
              styles.toolBtn,
              highlights.has(currentPage) && { backgroundColor: "#FFD60020" },
            ]}
          >
            <Ionicons
              name="color-fill-outline"
              size={20}
              color={highlights.has(currentPage) ? "#F59E0B" : modeStyle.fg}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowNoteInput(!showNoteInput)}
            style={[
              styles.toolBtn,
              showNoteInput && { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={showNoteInput ? colors.primary : modeStyle.fg}
            />
          </Pressable>
          <Pressable style={styles.toolBtn}>
            <Ionicons name="search-outline" size={20} color={modeStyle.fg} />
          </Pressable>
        </View>

        {/* Page navigation */}
        <View style={[styles.navRow, isRTL && styles.rtlRow]}>
          <Pressable
            onPress={isRTL ? goNext : goPrev}
            disabled={isRTL ? currentPage >= totalPages : currentPage <= 1}
            style={[
              styles.navBtn,
              {
                backgroundColor:
                  (isRTL ? currentPage >= totalPages : currentPage <= 1)
                    ? modeStyle.fg + "15"
                    : colors.primary,
              },
            ]}
          >
            <Ionicons
              name={prevIcon}
              size={20}
              color={
                (isRTL ? currentPage >= totalPages : currentPage <= 1)
                  ? modeStyle.fg + "50"
                  : "#fff"
              }
            />
          </Pressable>

          <View style={styles.pageNumWrap}>
            <Text style={[styles.pageNum, { color: modeStyle.fg }]}>
              {currentPage} <Text style={{ opacity: 0.5 }}>/ {totalPages}</Text>
            </Text>
          </View>

          <Pressable
            onPress={isRTL ? goPrev : goNext}
            disabled={isRTL ? currentPage <= 1 : currentPage >= totalPages}
            style={[
              styles.navBtn,
              {
                backgroundColor:
                  (isRTL ? currentPage <= 1 : currentPage >= totalPages)
                    ? modeStyle.fg + "15"
                    : colors.primary,
              },
            ]}
          >
            <Ionicons
              name={nextIcon}
              size={20}
              color={
                (isRTL ? currentPage <= 1 : currentPage >= totalPages)
                  ? modeStyle.fg + "50"
                  : "#fff"
              }
            />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
  },
  bookTitleSmall: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  pageCounter: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  topBarActions: {
    flexDirection: "row",
    gap: 4,
  },
  progressStrip: {
    height: 2,
  },
  progressFill: {
    height: 2,
  },
  watermarkOverlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none" as any,
    overflow: "hidden",
  },
  watermarkTile: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    opacity: 0.08,
  },
  watermarkText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    transform: [{ rotate: "-25deg" }],
    color: "#1A4A7C",
    letterSpacing: 0.5,
  },
  pageContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  pageHeading: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
    marginBottom: 4,
  },
  pageText: {
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
  },
  pageBullet: {
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    paddingLeft: 8,
  },
  pageFormula: {
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  noteBox: {
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  modeMenu: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    margin: 8,
    marginTop: 4,
    gap: 12,
  },
  modeMenuTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
  },
  modeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fontSizeBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fontBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  fontBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  fontSizeValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
  tocPanel: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    margin: 8,
    marginTop: 4,
    gap: 4,
    maxHeight: 240,
  },
  tocItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tocText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    flex: 1,
  },
  tocPage: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  noteInputWrap: {
    borderTopWidth: 1,
    padding: 16,
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  noteInputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  noteCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  noteSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  noteSaveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  toolRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumWrap: {
    flex: 1,
    alignItems: "center",
  },
  pageNum: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
