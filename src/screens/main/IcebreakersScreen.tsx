import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useTheme } from "@contexts/ThemeContext";
import type { Icebreaker } from "@/types/engagement";
import { Layout } from "@constants";
import { useAuth } from "@contexts/AuthProvider";
import { useToast } from "@/providers/ToastContext";
import * as Haptics from "expo-haptics";
import AppHeader from "@/components/common/AppHeader";

export default function IcebreakersScreen() {
  const api = useApiClient();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  const listRef = useRef<FlatList<Icebreaker>>(null);
  const toast = useToast();
  const allAnsweredToastShownRef = useRef(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: async () => {
      const res = await api.fetchIcebreakers();
      if (res.success) return res.data as Icebreaker[];
      throw new Error(res.error?.message || "Failed to load icebreakers");
    },
    staleTime: 1000 * 60 * 10,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const saveMutation = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      return api.answerIcebreaker(id, answer);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["icebreakers", "today"] });
      // also refresh user to update answeredIcebreakersCount
      refreshUser().catch(() => {});
    },
  });

  const items: Icebreaker[] = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data]
  );

  // Reset the guard when the list changes (e.g., new day or refresh)
  useEffect(() => {
    allAnsweredToastShownRef.current = false;
  }, [items]);

  const onChange = useCallback((id: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }, []);

  const onSave = useCallback(
    async (id: string) => {
      const answer = answers[id]?.trim() ?? "";
      if (!answer) return;
      setSavingIds((s) => ({ ...s, [id]: true }));
      try {
        await saveMutation.mutateAsync({ id, answer });
        // success toast and auto-advance
        toast?.show?.("Saved", "success");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const idx = items.findIndex((q) => q.id === id);
        if (idx >= 0 && idx < items.length - 1) {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx + 1, animated: true });
          }, 150);
        }
        // If all answered after this save, show a success toast once
        const answeredCount = items.reduce((acc, q) => {
          const val = (
            q.id === id ? answer : answers[q.id] ?? q.answer ?? ""
          )?.trim();
          return acc + (val ? 1 : 0);
        }, 0);
        if (
          items.length > 0 &&
          answeredCount >= items.length &&
          !allAnsweredToastShownRef.current
        ) {
          allAnsweredToastShownRef.current = true;
          setTimeout(() => {
            toast?.show?.("All icebreakers answered — nice!", "success");
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            ).catch(() => {});
          }, 200);
        }
      } finally {
        setSavingIds((s) => ({ ...s, [id]: false }));
      }
    },
    [answers, saveMutation, items, toast]
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      <AppHeader
        title="Today’s icebreakers"
        rightActions={
          items.length > 0 ? (
            <Text style={{ color: theme.colors.text.secondary }}>
              {items.filter((q) => !!q.answer?.trim()).length} / {items.length} answered
            </Text>
          ) : undefined
        }
      />

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const existing = item.answer ?? "";
          const val = answers[item.id] ?? existing;
          const answered = !!(item.answered && existing);
          const minLen = 10;
          const remaining = Math.max(0, minLen - (val?.trim().length || 0));
          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.background.primary,
                  borderColor: theme.colors.border.primary,
                },
              ]}
            >
              <Text
                style={[styles.question, { color: theme.colors.text.primary }]}
              >
                {item.text}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border.primary,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background.secondary,
                  },
                ]}
                placeholder="Type your answer"
                placeholderTextColor={theme.colors.text.secondary}
                multiline
                accessibilityLabel={`Answer: ${item.text}`}
                value={val}
                onChangeText={(t) => onChange(item.id, t)}
                maxLength={280}
                onBlur={() => {
                  const trimmed = (val || "").trim();
                  if (
                    !savingIds[item.id] &&
                    trimmed.length >= minLen &&
                    trimmed !== (item.answer || "")
                  ) {
                    onSave(item.id);
                  }
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: Layout.spacing.sm,
                }}
              >
                <Text
                  style={{ color: theme.colors.text.secondary, fontSize: 12 }}
                >
                  {remaining > 0
                    ? `${remaining} more characters to go`
                    : "Looks good!"}
                </Text>
                <Text
                  style={{ color: theme.colors.text.tertiary, fontSize: 12 }}
                >
                  {(val || "").length}/280
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: savingIds[item.id]
                      ? theme.colors.neutral[300]
                      : answered
                      ? theme.colors.neutral[300]
                      : theme.colors.primary[500],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Save answer for: ${item.text}`}
                disabled={
                  saveMutation.isPending ||
                  !val?.trim() ||
                  val.trim().length < minLen
                }
                onPress={() => onSave(item.id)}
              >
                <Text
                  style={[
                    styles.saveText,
                    { color: theme.colors.text.inverse },
                  ]}
                >
                  {savingIds[item.id]
                    ? "Saving…"
                    : answered
                    ? "Update"
                    : "Save"}
                </Text>
              </TouchableOpacity>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    // Skip (no save), just navigate to next
                    const idx = items.findIndex((q) => q.id === item.id);
                    if (idx >= 0 && idx < items.length - 1) {
                      listRef.current?.scrollToIndex({
                        index: idx + 1,
                        animated: true,
                      });
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Skip question: ${item.text}`}
                  style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Text style={{ color: theme.colors.text.secondary }}>
                    Skip
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const idx = items.findIndex((q) => q.id === item.id);
                    if (idx >= 0 && idx < items.length - 1) {
                      listRef.current?.scrollToIndex({
                        index: idx + 1,
                        animated: true,
                      });
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Next question after: ${item.text}`}
                  style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Text
                    style={{
                      color: theme.colors.primary[600],
                      fontWeight: "600",
                    }}
                  >
                    Next →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: theme.colors.text.secondary }}>
              No icebreakers available today.
            </Text>
          </View>
        )}
        refreshing={isFetching}
        onRefresh={() =>
          qc.invalidateQueries({ queryKey: ["icebreakers", "today"] })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
  },
  list: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },
  question: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    marginBottom: Layout.spacing.sm,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  saveBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  saveText: {
    fontWeight: "600",
  },
});
