import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryChip } from "@/components/CategoryChip";
import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function LibraryBookCard({ book }: { book: any }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/reader/${book.id}`)}
      style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.cover, { backgroundColor: book.coverGradient[0] }]}>
        <Ionicons name="book" size={28} color={book.coverAccent} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.publisher, { color: colors.mutedForeground }]} numberOfLines={1}>
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

        {/* Progress */}
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor:
                    book.progress === 100 ? colors.success : colors.primary,
                  width: `${book.progress}%` as any,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {book.progress}%
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.pageInfo, { color: colors.mutedForeground }]}>
            Page {book.lastPage} of {book.pages}
          </Text>
          {book.progress === 100 && (
            <View style={[styles.completeBadge, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.completeBadgeText, { color: colors.success }]}>Complete</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[styles.readBtn, { backgroundColor: colors.primary }]}>
        <Ionicons name={book.progress === 100 ? "refresh" : "play"} size={16} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { purchasedBooks, isAuthenticated } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "reading" | "completed">("all");

  const filtered = purchasedBooks.filter((b) => {
    if (filter === "reading") return b.progress > 0 && b.progress < 100;
    if (filter === "completed") return b.progress === 100;
    return true;
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="lock-closed"
          title="Sign in to access your library"
          description="Create an account or sign in to purchase and read books."
        />
        <Pressable
          onPress={() => router.push("/auth")}
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Library</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {purchasedBooks.length} {purchasedBooks.length === 1 ? "book" : "books"}
        </Text>

        <View style={styles.filterRow}>
          {(["all", "reading", "completed"] as const).map((f) => (
            <CategoryChip
              key={f}
              label={f === "all" ? "All" : f === "reading" ? "In Progress" : "Completed"}
              selected={filter === f}
              onPress={() => setFilter(f)}
              small
            />
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title={filter === "all" ? "Your library is empty" : "No books here yet"}
          description={
            filter === "all"
              ? "Browse the store and purchase your first book to start reading."
              : filter === "reading"
              ? "Start reading a book to see it here."
              : "Finish a book to see it here."
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
          ]}
          renderItem={({ item }) => <LibraryBookCard book={item} />}
        />
      )}
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
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
  },
  list: {
    padding: 16,
    gap: 0,
  },
  bookCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    gap: 12,
    alignItems: "flex-start",
  },
  cover: {
    width: 60,
    height: 80,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  publisher: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageInfo: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  completeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  readBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
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
    fontFamily: "Inter_700Bold",
  },
});
