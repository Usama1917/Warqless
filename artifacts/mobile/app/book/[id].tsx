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

import { AnimatedEntrance } from "@/components/AnimatedEntrance";
import { BookCard } from "@/components/BookCard";
import { useApp } from "@/context/AppContext";
import { useCatalog } from "@/context/CatalogContext";
import { useLanguage } from "@/context/LanguageContext";
import { BOOK_TYPES } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { purchasedBooks, purchaseBook, isAuthenticated } = useApp();
  const { books } = useCatalog();
  const { t, isRTL } = useLanguage();

  const book = books.find((b) => b.id === id) ?? purchasedBooks.find((b) => b.id === id);
  const [purchasing, setPurchasing] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const isPurchased = purchasedBooks.some((b) => b.id === id);
  const related = books.filter(
    (b) => b.id !== id && (b.subject === book?.subject || b.grade === book?.grade)
  ).slice(0, 4);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      Alert.alert(t.auth.signIn, t.auth.signInRequired, [
        { text: t.common.cancel, style: "cancel" },
        { text: t.auth.signIn, onPress: () => router.push("/auth") },
      ]);
      return;
    }
    if (!book) return;
    setPurchasing(true);
    await purchaseBook(book);
    setPurchasing(false);
    Alert.alert(t.book.purchaseSuccess, t.book.purchaseSuccessDesc, [
      { text: t.book.ok, onPress: () => router.push(`/reader/${book.id}`) },
    ]);
  };

  if (!book) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>
          {t.common.error}
        </Text>
      </View>
    );
  }

  const typeLabel = t.bookTypes[book.type as keyof typeof t.bookTypes] ?? book.type;
  const discount = book.originalPrice
    ? Math.round((1 - book.price / book.originalPrice) * 100)
    : 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const features = [
    { icon: "checkmark-circle" as const, text: "Full digital license — read anytime", check: true },
    { icon: "bookmark" as const, text: t.reader.bookmarks + " & " + t.reader.highlights, check: true },
    { icon: "create" as const, text: t.reader.notes, check: true },
    { icon: "cloud" as const, text: "Cloud sync across devices", check: true },
    { icon: "phone-portrait" as const, text: `${t.book.deviceLimit}: 2 ${t.book.devices}`, check: true },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={[
          styles.backBtn,
          {
            top: topPad + 8,
            backgroundColor: colors.card + "E0",
            left: isRTL ? undefined : 16,
            right: isRTL ? 16 : undefined,
          },
        ]}
      >
        <Ionicons
          name={isRTL ? "arrow-forward" : "arrow-back"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <AnimatedEntrance delay={0} dy={12}>
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
          <View style={[styles.titleRow, isRTL && styles.rtlRow]}>
            <Text style={[styles.title, { color: colors.foreground }, isRTL && styles.rtlText]}>
              {book.title}
            </Text>
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

          <Text style={[styles.publisher, { color: colors.primary }, isRTL && styles.rtlText]}>
            {book.publisher}
          </Text>

          {/* Rating */}
          <View style={[styles.ratingRow, isRTL && styles.rtlRow]}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={
                  s <= Math.floor(book.rating)
                    ? "star"
                    : s - 0.5 <= book.rating
                    ? "star-half"
                    : "star-outline"
                }
                size={16}
                color="#F59E0B"
              />
            ))}
            <Text style={[styles.ratingValue, { color: colors.foreground }]}>{book.rating}</Text>
            <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
              ({book.reviewCount.toLocaleString()} {t.book.reviews})
            </Text>
          </View>

          {/* Tags */}
          <View style={[styles.tagsRow, isRTL && styles.rtlWrap]}>
            {[book.grade, book.subject, typeLabel, book.academicYear].map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Price */}
          <View
            style={[
              styles.priceBox,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <View>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
                {t.common.egp}
              </Text>
              <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
                <Text style={[styles.price, { color: colors.accent }]}>
                  {t.common.egp} {book.price}
                </Text>
                {book.originalPrice && (
                  <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                    {t.common.egp} {book.originalPrice}
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
              <Text style={[styles.pagesLabel, { color: colors.mutedForeground }]}>
                {book.pages} {t.book.pages}
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
              {t.book.features}
            </Text>
            {features.map((f) => (
              <View key={f.text} style={[styles.featureRow, isRTL && styles.rtlRow]}>
                <Ionicons
                  name={f.icon}
                  size={18}
                  color={f.check ? colors.success : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.featureText,
                    { color: f.check ? colors.foreground : colors.mutedForeground },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {f.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
              {t.book.aboutTitle}
            </Text>
            <Text
              style={[styles.description, { color: colors.mutedForeground }, isRTL && styles.rtlText]}
            >
              {book.description}
            </Text>
          </View>

          {/* License info */}
          <View
            style={[
              styles.licenseBox,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text
              style={[styles.licenseText, { color: colors.mutedForeground }, isRTL && styles.rtlText]}
            >
              {t.book.license}
            </Text>
          </View>

          {/* Related books */}
          {related.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }, isRTL && styles.rtlText]}>
                {t.book.relatedBooks}
              </Text>
              {related.map((b) => (
                <BookCard key={b.id} book={b} variant="horizontal" />
              ))}
            </View>
          )}
        </View>
        </AnimatedEntrance>
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
            <Text style={styles.ctaBtnText}>{t.book.openReader}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePurchase}
            disabled={purchasing}
            style={[
              styles.ctaBtn,
              { backgroundColor: purchasing ? colors.primary + "80" : colors.primary },
            ]}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color="#fff" />
                <Text style={styles.ctaBtnText}>
                  {t.book.buyNow} — {t.common.egp} {book.price}
                </Text>
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
  },
  backBtn: {
    position: "absolute",
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
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
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
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
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
    fontWeight: "600",
  },
  priceBox: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 11,
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
  },
  originalPrice: {
    fontSize: 14,
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
  },
  pagesLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  featuresSection: { gap: 10 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
  },
  descSection: { gap: 8 },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  licenseBox: {
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  licenseText: {
    flex: 1,
    fontSize: 12,
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
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
