import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function BorrowedBookCard({ book }: { book: any }) {
  const colors = useColors();
  const router = useRouter();
  const { returnBorrowedBook } = useApp();
  const { t, isRTL } = useLanguage();

  const returnDate = new Date(book.returnDate);
  const today = new Date();
  const daysLeft = Math.ceil(
    (returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft <= 2 && !isExpired;

  const handleReturn = () => {
    Alert.alert(
      t.borrowed.returnTitle,
      `${t.borrowed.returnConfirm} "${book.title}" ${t.borrowed.returnTo} ${book.ownerName}?`,
      [
        { text: t.borrowed.cancel, style: "cancel" },
        {
          text: t.borrowed.return,
          style: "destructive",
          onPress: () => returnBorrowedBook(book.id),
        },
      ]
    );
  };

  const statusText = isExpired
    ? t.borrowed.expired
    : isUrgent
    ? `${daysLeft} ${daysLeft === 1 ? t.borrowed.daysLeft : t.borrowed.daysLeftPlural}`
    : `${t.borrowed.returns} ${returnDate.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
      })}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isExpired
            ? colors.destructive + "40"
            : isUrgent
            ? colors.warning + "40"
            : colors.border,
        },
      ]}
    >
      <View style={[styles.cover, { backgroundColor: book.coverGradient[0] }]}>
        <Ionicons name="book" size={26} color={book.coverAccent} />
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.foreground }, isRTL && styles.rtlText]}
          numberOfLines={2}
        >
          {book.title}
        </Text>
        <Text style={[styles.publisher, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
          {book.publisher}
        </Text>

        <View style={[styles.ownerRow, isRTL && styles.rtlRow]}>
          <Ionicons name="person-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.ownerText, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {t.borrowed.borrowedFrom} {book.ownerName}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isExpired
                ? colors.destructive + "15"
                : isUrgent
                ? colors.warning + "15"
                : colors.success + "15",
              alignSelf: isRTL ? "flex-end" : "flex-start",
            },
          ]}
        >
          <Ionicons
            name={isExpired ? "alert-circle" : "time-outline"}
            size={12}
            color={isExpired ? colors.destructive : isUrgent ? colors.warning : colors.success}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isExpired
                  ? colors.destructive
                  : isUrgent
                  ? colors.warning
                  : colors.success,
              },
            ]}
          >
            {statusText}
          </Text>
        </View>

        <View style={[styles.actions, isRTL && styles.rtlRow]}>
          {!isExpired && (
            <Pressable
              onPress={() => router.push(`/reader/${book.id}`)}
              style={[styles.readBtn, { backgroundColor: colors.primary, flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <Ionicons name="book-outline" size={14} color="#fff" />
              <Text style={styles.readBtnText}>{t.borrowed.read}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleReturn}
            style={[
              styles.returnBtn,
              {
                borderColor: colors.destructive,
                backgroundColor: colors.destructive + "10",
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Ionicons name="return-up-back" size={14} color={colors.destructive} />
            <Text style={[styles.returnBtnText, { color: colors.destructive }]}>
              {t.borrowed.return}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function LentOutCard({ book }: { book: any }) {
  const colors = useColors();
  const { t, isRTL } = useLanguage();

  return (
    <View style={[styles.lentCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View style={[styles.coverSmall, { backgroundColor: book.coverGradient[0] }]}>
        <Ionicons name="book" size={18} color={book.coverAccent} />
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.titleSmall, { color: colors.foreground }, isRTL && styles.rtlText]}
          numberOfLines={1}
        >
          {book.title}
        </Text>
        <Text style={[styles.lentTo, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
          {t.borrowed.lentTo} {book.borrowerName}
        </Text>
        <Text style={[styles.lentDate, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
          {t.borrowed.returns}{" "}
          {new Date(book.returnDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </View>
      <View style={[styles.lentBadge, { backgroundColor: colors.warning + "20" }]}>
        <Text style={[styles.lentBadgeText, { color: colors.warning }]}>{t.borrowed.lentOut}</Text>
      </View>
    </View>
  );
}

export default function BorrowedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { borrowedBooks, purchasedBooks, isAuthenticated } = useApp();
  const { t, isRTL } = useLanguage();

  const lentOut = purchasedBooks.filter((b) =>
    borrowedBooks.some((bb) => bb.id === b.id && bb.isLentOut)
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="lock-closed"
          title={t.borrowed.signInTitle}
          description={t.borrowed.signInDesc}
        />
        <Pressable
          onPress={() => router.push("/auth")}
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.signInText}>{t.borrowed.signIn}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
          {t.borrowed.title}
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
          {t.borrowed.subtitle}
        </Text>
      </View>

      <FlatList
        data={borrowedBooks}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
        ]}
        ListHeaderComponent={
          lentOut.length > 0 ? (
            <View style={styles.lentSection}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
                {t.borrowed.booksLentOut}
              </Text>
              {lentOut.map((b) => (
                <LentOutCard key={b.id} book={b} />
              ))}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
                {t.borrowed.booksBorrowed}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="swap-horizontal-outline"
            title={t.borrowed.noBorrowed}
            description={t.borrowed.noBorrowedDesc}
          />
        }
        renderItem={({ item }) => <BorrowedBookCard book={item} />}
      />

      {/* Info card */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            marginBottom: Platform.OS === "web" ? 34 : insets.bottom + 80,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
          {t.borrowed.infoText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cover: {
    width: 56,
    height: 76,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 4 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  publisher: {
    fontSize: 12,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  ownerText: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  readBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  readBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  returnBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  returnBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  lentSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  coverSmall: {
    width: 40,
    height: 52,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSmall: {
    fontSize: 13,
    fontWeight: "700",
  },
  lentTo: {
    fontSize: 11,
  },
  lentDate: {
    fontSize: 11,
  },
  lentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoCard: {
    alignItems: "flex-start",
    gap: 8,
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
