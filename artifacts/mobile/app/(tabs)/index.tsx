import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  FlatList,
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
import { SectionHeader } from "@/components/SectionHeader";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { BOOKS, FEATURED_OFFERS, GRADES, SUBJECTS } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

function OfferBanner({ offer }: { offer: (typeof FEATURED_OFFERS)[0] }) {
  const { t, isRTL } = useLanguage();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[styles.offerCard, { transform: [{ scale }] }]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient
          colors={[offer.color, offer.color + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.offerGradient}
        >
          <View style={styles.offerContent}>
            <View style={[styles.offerBadge, { backgroundColor: offer.accentColor }]}>
              <Text style={styles.offerBadgeText}>-{offer.discount}%</Text>
            </View>
            <Text style={[styles.offerTitle, isRTL && styles.rtlText]}>{offer.title}</Text>
            <Text style={[styles.offerDesc, isRTL && styles.rtlText]}>{offer.description}</Text>
            <Text style={[styles.offerExpiry, isRTL && styles.rtlText]}>
              {t.home.validUntil}{" "}
              {new Date(offer.validUntil).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.offerDecor}>
            <Ionicons name="pricetag" size={60} color={offer.accentColor + "40"} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function ContinueReadingCard({ book }: { book: any }) {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push(`/reader/${book.id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.continueCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.continueCover, { backgroundColor: book.coverGradient[0] }]}>
          <Ionicons name="book" size={24} color={book.coverAccent} />
        </View>
        <View style={styles.continueInfo}>
          <Text style={[styles.continueTitle, { color: colors.foreground }, isRTL && styles.rtlText]} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={[styles.continueSubtitle, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {t.home.page} {book.lastPage} {t.home.of} {book.pages}
          </Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${book.progress}%` as any },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {book.progress}%
            </Text>
          </View>
        </View>
        <View style={[styles.continueBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="play" size={14} color="#fff" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, purchasedBooks } = useApp();
  const { t, isRTL } = useLanguage();

  const featuredBooks = BOOKS.filter((b) => b.isFeatured);
  const popularBooks = BOOKS.filter((b) => b.isPopular);
  const newBooks = BOOKS.filter((b) => b.isNew);
  const continueReading = purchasedBooks.filter((b) => b.progress > 0 && b.progress < 100);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primary + "CC"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerGreeting, isRTL && styles.rtlText]}>
              {isAuthenticated
                ? `${t.home.hello} ${user?.name?.split(" ")[0]}`
                : t.home.welcome}
            </Text>
            <Text style={[styles.headerBrand, isRTL && styles.rtlText]}>Warqless</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push("/browse")}
              style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </Pressable>
            {!isAuthenticated && (
              <Pressable
                onPress={() => router.push("/auth")}
                style={[styles.signInBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.signInText}>{t.home.signIn}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}
          onPress={() => router.push("/(tabs)/browse")}
        >
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={[styles.searchPlaceholder, isRTL && styles.rtlText]}>
            {t.home.searchPlaceholder}
          </Text>
        </Pressable>
      </LinearGradient>

      {/* Offers */}
      <AnimatedEntrance delay={0}>
        <View style={styles.section}>
          <SectionHeader title={t.home.activeOffers} subtitle={t.home.limitedTime} />
          <FlatList
            data={FEATURED_OFFERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => <OfferBanner offer={item} />}
          />
        </View>
      </AnimatedEntrance>

      {/* Continue Reading */}
      {continueReading.length > 0 && (
        <AnimatedEntrance delay={60}>
          <View style={styles.section}>
            <SectionHeader
              title={t.home.continueReading}
              subtitle={t.home.pickUp}
              seeAllRoute="/(tabs)/library"
              seeAllLabel={t.home.seeAll}
            />
            <View style={styles.continueList}>
              {continueReading.slice(0, 3).map((b) => (
                <ContinueReadingCard key={b.id} book={b} />
              ))}
            </View>
          </View>
        </AnimatedEntrance>
      )}

      {/* Featured Books */}
      <AnimatedEntrance delay={120}>
        <View style={styles.section}>
          <SectionHeader
            title={t.home.featuredBooks}
            subtitle={t.home.handpicked}
            seeAllRoute="/(tabs)/browse"
            seeAllLabel={t.home.seeAll}
          />
          <View style={styles.featuredList}>
            {featuredBooks.slice(0, 4).map((b) => (
              <BookCard key={b.id} book={b} variant="featured" />
            ))}
          </View>
        </View>
      </AnimatedEntrance>

      {/* Browse by Grade */}
      <AnimatedEntrance delay={180}>
        <View style={styles.section}>
          <SectionHeader title={t.home.byGrade} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradeRow}>
          {GRADES.map((g) => (
            <Pressable
              key={g}
              onPress={() => router.push({ pathname: "/(tabs)/browse", params: { grade: g } })}
              style={[styles.gradeChip, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.gradeChipText}>{g}</Text>
            </Pressable>
          ))}
        </ScrollView>
        </View>
      </AnimatedEntrance>

      {/* Popular Books */}
      <AnimatedEntrance delay={240}>
        <View style={styles.section}>
          <SectionHeader
            title={t.home.popularBooks}
            subtitle={t.home.trending}
            seeAllRoute="/(tabs)/browse"
            seeAllLabel={t.home.seeAll}
          />
          <FlatList
            data={popularBooks}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(b) => b.id}
            contentContainerStyle={{ paddingHorizontal: 11 }}
            renderItem={({ item }) => (
              <View style={{ width: 160 }}>
                <BookCard book={item} variant="grid" />
              </View>
            )}
          />
        </View>
      </AnimatedEntrance>

      {/* Browse by Subject */}
      <AnimatedEntrance delay={300}>
        <View style={styles.section}>
          <SectionHeader title={t.home.bySubject} />
          <View style={styles.subjectGrid}>
            {SUBJECTS.slice(0, 6).map((s) => (
              <Pressable
                key={s}
                onPress={() => router.push({ pathname: "/(tabs)/browse", params: { subject: s } })}
                style={[styles.subjectChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Ionicons name="book-outline" size={16} color={colors.primary} />
                <Text style={[styles.subjectText, { color: colors.foreground }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </AnimatedEntrance>

      {/* New Releases */}
      {newBooks.length > 0 && (
        <AnimatedEntrance delay={360}>
          <View style={styles.section}>
            <SectionHeader
              title={t.home.newReleases}
              seeAllRoute="/(tabs)/browse"
              seeAllLabel={t.home.seeAll}
            />
            <View style={[styles.newList, { paddingHorizontal: 16 }]}>
              {newBooks.map((b) => (
                <BookCard key={b.id} book={b} variant="horizontal" />
              ))}
            </View>
          </View>
        </AnimatedEntrance>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerGreeting: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerBrand: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signInText: {
    color: "#0D1B2A",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  searchPlaceholder: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  section: {
    marginTop: 28,
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  continueList: {
    paddingHorizontal: 16,
  },
  offerCard: {
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    width: 280,
  },
  offerGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    overflow: "hidden",
    minHeight: 110,
  },
  offerContent: {
    flex: 1,
    gap: 4,
  },
  offerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 4,
  },
  offerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  offerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  offerDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  offerExpiry: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  offerDecor: {
    position: "absolute",
    right: -8,
    bottom: -8,
  },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  continueCover: {
    width: 48,
    height: 64,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  continueInfo: { flex: 1 },
  continueTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  continueSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  continueBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  gradeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
  gradeChipText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  newList: {},
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
