import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Book } from "@/data/mockData";

interface BookCardProps {
  book: Book;
  variant?: "grid" | "horizontal" | "featured";
  showDiscount?: boolean;
}

export function BookCard({
  book,
  variant = "grid",
  showDiscount = true,
}: BookCardProps) {
  const colors = useColors();
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const discount =
    book.originalPrice
      ? Math.round((1 - book.price / book.originalPrice) * 100)
      : 0;

  if (variant === "featured") {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={() => router.push(`/book/${book.id}`)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            styles.featuredCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.featuredCover,
              { backgroundColor: book.coverGradient[0] },
            ]}
          >
            <View style={[styles.coverShine, { backgroundColor: book.coverAccent + "30" }]} />
            <Ionicons name="book" size={40} color={book.coverAccent} />
            {discount > 0 && showDiscount && (
              <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
            {book.isNew && (
              <View style={[styles.newBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <View style={styles.featuredInfo}>
            <Text
              style={[styles.bookTitle, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {book.title}
            </Text>
            <Text style={[styles.publisherText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {book.publisher}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{book.grade}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{book.subject}</Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.accent }]}>
                EGP {book.price}
              </Text>
              {book.originalPrice && (
                <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                  EGP {book.originalPrice}
                </Text>
              )}
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                {book.rating} ({book.reviewCount.toLocaleString()})
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === "horizontal") {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={() => router.push(`/book/${book.id}`)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            styles.horizontalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.horizontalCover, { backgroundColor: book.coverGradient[0] }]}>
            <Ionicons name="book" size={28} color={book.coverAccent} />
          </View>
          <View style={styles.horizontalInfo}>
            <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={[styles.publisherText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {book.publisher}
            </Text>
            <Text style={[styles.price, { color: colors.accent }]}>EGP {book.price}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.gridCardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => router.push(`/book/${book.id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.gridCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.gridCover, { backgroundColor: book.coverGradient[0] }]}>
          <View style={[styles.coverShine, { backgroundColor: book.coverAccent + "20" }]} />
          <Ionicons name="book" size={32} color={book.coverAccent} />
          {discount > 0 && showDiscount && (
            <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
        </View>
        <View style={styles.gridInfo}>
          <Text style={[styles.gridTitle, { color: colors.foreground }]} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={[styles.gridPublisher, { color: colors.mutedForeground }]} numberOfLines={1}>
            {book.publisher}
          </Text>
          <View style={styles.gridMeta}>
            <Text style={[styles.gridSubject, { color: colors.primary }]}>{book.subject}</Text>
          </View>
          <Text style={[styles.gridPrice, { color: colors.accent }]}>EGP {book.price}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  featuredCover: {
    width: 100,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  coverShine: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderBottomLeftRadius: 60,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  newBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  featuredInfo: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  publisherText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  horizontalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  horizontalCover: {
    width: 52,
    height: 68,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalInfo: {
    flex: 1,
    gap: 2,
  },
  gridCardWrapper: {
    flex: 1,
    maxWidth: "50%",
  },
  gridCard: {
    margin: 5,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  gridCover: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridInfo: {
    padding: 10,
    gap: 2,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  gridPublisher: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  gridMeta: {
    marginTop: 2,
  },
  gridSubject: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
});
