import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookCard } from "@/components/BookCard";
import { CategoryChip } from "@/components/CategoryChip";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { BOOK_TYPES, BOOKS, GRADES, SUBJECTS } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grade?: string; subject?: string }>();
  const { t, isRTL } = useLanguage();

  const [query, setQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>(params.grade ?? "");
  const [selectedSubject, setSelectedSubject] = useState<string>(params.subject ?? "");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return BOOKS.filter((b) => {
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.publisher.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q);
      const matchGrade = !selectedGrade || b.grade === selectedGrade;
      const matchSubject = !selectedSubject || b.subject === selectedSubject;
      const matchType = !selectedType || b.type === selectedType;
      return matchQ && matchGrade && matchSubject && matchType;
    });
  }, [query, selectedGrade, selectedSubject, selectedType]);

  const clearAll = () => {
    setSelectedGrade("");
    setSelectedSubject("");
    setSelectedType("");
    setQuery("");
  };

  const hasFilters = selectedGrade || selectedSubject || selectedType;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const bookCountLabel =
    filtered.length === 1
      ? `1 ${t.browse.book}`
      : `${filtered.length} ${t.browse.books}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground },
            isRTL && styles.rtlText,
          ]}
        >
          {t.browse.title}
        </Text>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t.browse.searchPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Filter toggle */}
        <View style={[styles.filterRow, isRTL && styles.rtlRow]}>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.filterToggle,
              {
                backgroundColor: showFilters ? colors.primary : colors.secondary,
                borderColor: showFilters ? colors.primary : colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Ionicons name="options" size={16} color={showFilters ? "#fff" : colors.foreground} />
            <Text
              style={[styles.filterToggleText, { color: showFilters ? "#fff" : colors.foreground }]}
            >
              {t.browse.filters}
            </Text>
            {hasFilters && (
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: showFilters ? "#fff" : colors.accent },
                ]}
              />
            )}
          </Pressable>
          <Text style={[styles.resultCount, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
            {bookCountLabel}
          </Text>
          {hasFilters && (
            <Pressable onPress={clearAll}>
              <Text style={[styles.clearText, { color: colors.primary }]}>{t.browse.clearAll}</Text>
            </Pressable>
          )}
        </View>

        {/* Filters panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
              {t.browse.grade}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <CategoryChip
                label={t.browse.all}
                selected={!selectedGrade}
                onPress={() => setSelectedGrade("")}
                small
              />
              {GRADES.map((g) => (
                <CategoryChip
                  key={g}
                  label={g}
                  selected={selectedGrade === g}
                  onPress={() => setSelectedGrade(selectedGrade === g ? "" : g)}
                  small
                />
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
              {t.browse.subject}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <CategoryChip
                label={t.browse.all}
                selected={!selectedSubject}
                onPress={() => setSelectedSubject("")}
                small
              />
              {SUBJECTS.slice(0, 6).map((s) => (
                <CategoryChip
                  key={s}
                  label={s}
                  selected={selectedSubject === s}
                  onPress={() => setSelectedSubject(selectedSubject === s ? "" : s)}
                  small
                />
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { color: colors.mutedForeground }, isRTL && styles.rtlText]}>
              {t.browse.bookType}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <CategoryChip
                label={t.browse.all}
                selected={!selectedType}
                onPress={() => setSelectedType("")}
                small
              />
              {BOOK_TYPES.map((bt) => (
                <CategoryChip
                  key={bt.value}
                  label={t.bookTypes[bt.value]}
                  selected={selectedType === bt.value}
                  onPress={() => setSelectedType(selectedType === bt.value ? "" : bt.value)}
                  small
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Book grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title={t.browse.noBooks}
          description={t.browse.noBooksDesc}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          numColumns={2}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
          ]}
          renderItem={({ item }) => <BookCard book={item} variant="grid" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  searchBar: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  filterToggle: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterToggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultCount: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  clearText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  filtersPanel: {
    gap: 6,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  chipRow: {
    gap: 0,
    paddingVertical: 4,
  },
  grid: {
    padding: 11,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
