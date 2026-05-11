import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookCard } from "@/components/BookCard";
import { useApp } from "@/context/AppContext";
import { BOOKS, BOOK_TYPES } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { purchasedBooks, purchaseBook, isAuthenticated } = useApp();

  const book = BOOKS.find((b) => b.id === id);
  const [purchasing, setPurchasing] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const isPurchased = purchasedBooks.some((b) => b.id === id);
  const related = BOOKS.filter(
    (b) => b.id !== id && (b.subject === book?.subject || b.grade === book?.grade)
  ).slice(0, 4);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to purchase books.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    if (!book) return;
    setPurchasing(true);
    await purchaseBook(book);
    setPurchasing(false);
    Alert.alert("Purchase Successful!", `"${book.title}" has been added to your library.`, [
      { text: "Read Now", onPress: () => router.push(`/reader/${book.id}`) },
      { text: "Go to Library", onPress: () => router.push("/(tabs)/library") },
    ]);
  };

  if (!book) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Book not found</Text>
      </View>
    );
  }

  const typeLabel = BOOK_TYPES.find((t) => t.value === book.type)?.label ?? book.type;
  const discount = book.originalPrice
    ? Math.round((1 - book.price / book.originalPrice) * 100)
    : 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: topPad + 8, backgroundColor: colors.card + "E0" }]}
      >
        <Ionicons name="arrow-back" size={22} color={colors.foreground} />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Book cover hero */}
        <View style={[styles.hero, { backgroundColor: book.coverGradient[0] }]}>
          <View style={[styles.heroShine, { backgroundColor: book.coverAccent + "20" }]} />
          <View style={styles.coverContainer}>
            <View style={[styles.cover, { borderColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="book" size={64} color={book.coverAccent} />
            </View>
          </View>
        </View>

        {/* Book info */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>{book.title}</Text>
            <Pressable
              onPress={() => setWishlisted(!wishlisted)}
              style={[styles.wishlistBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons
                name={wishlisted ? "heart" : "heart-outline"}
                size={20}
                color={wishlisted ? colors.destructive : colors.mutedForeground}
              />
            </Pressable>
          </View>

          <Text style={[styles.publisher, { color: colors.primary }]}>{book.publisher}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= Math.floor(book.rating) ? "star" : s - 0.5 <= book.rating ? "star-half" : "star-outline"}
                size={16}
                color="#F59E0B"
              />
            ))}
            <Text style={[styles.ratingValue, { color: colors.foreground }]}>{book.rating}</Text>
            <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
              ({book.reviewCount.toLocaleString()} reviews)
            </Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {[book.grade, book.subject, typeLabel, book.academicYear].map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
            {book.isNew && (
              <View style={[styles.tag, { backgroundColor: colors.success + "20", borderColor: colors.success + "40" }]}>
                <Text style={[styles.tagText, { color: colors.success }]}>New</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <View style={[styles.priceBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Price</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.accent }]}>EGP {book.price}</Text>
                {book.originalPrice && (
                  <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                    EGP {book.originalPrice}
                  </Text>
                )}
                {discount > 0 && (
                  <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
                    <Text style={styles.discountText}>-{discount}%</Text>
                  </View>
                )}
              </View>
            </View>
            <View>
              <Text style={[styles.pagesLabel, { color: colors.mutedForeground }]}>{book.pages} pages</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What&apos;s included</Text>
            {[
              { icon: "checkmark-circle" as const, text: "Full digital license — read anytime", check: true },
              { icon: "bookmark" as const, text: "Bookmarks & highlights", check: true },
              { icon: "create" as const, text: "Pen annotations & notes", check: true },
              { icon: "cloud" as const, text: "Cloud sync across devices", check: true },
              { icon: book.lendingEnabled ? ("people" as const) : ("people-outline" as const), text: book.lendingEnabled ? "Lending enabled" : "Lending not available", check: book.lendingEnabled },
              { icon: "phone-portrait" as const, text: "Up to 2 authorized devices", check: true },
            ].map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <Ionicons
                  name={f.icon}
                  size={18}
                  color={f.check ? colors.success : colors.mutedForeground}
                />
                <Text style={[styles.featureText, { color: f.check ? colors.foreground : colors.mutedForeground }]}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About this book</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {book.description}
            </Text>
          </View>

          {/* License info */}
          <View style={[styles.licenseBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={[styles.licenseText, { color: colors.mutedForeground }]}>
              Protected digital license. Read inside Warqless app only. Your purchase is tied to your account and authorized devices.
            </Text>
          </View>

          {/* Related books */}
          {related.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Related Books</Text>
              {related.map((b) => (
                <BookCard key={b.id} book={b} variant="horizontal" />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomCta,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "web" ? 16 : insets.bottom + 12,
          },
        ]}
      >
        {isPurchased ? (
          <Pressable
            onPress={() => router.push(`/reader/${book.id}`)}
            style={[styles.ctaBtn, { backgroundColor: colors.success }]}
          >
            <Ionicons name="book-outline" size={20} color="#fff" />
            <Text style={styles.ctaBtnText}>Read Now</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePurchase}
            disabled={purchasing}
            style={[styles.ctaBtn, { backgroundColor: purchasing ? colors.primary + "80" : colors.primary }]}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color="#fff" />
                <Text style={styles.ctaBtnText}>Buy — EGP {book.price}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroShine: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    borderBottomLeftRadius: 200,
  },
  coverContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  wishlistBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  publisher: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  pagesLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  featuresSection: { gap: 10 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  descSection: { gap: 8 },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  licenseBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  licenseText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  relatedSection: { gap: 8 },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
