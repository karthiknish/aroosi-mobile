import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useTheme } from "@contexts/ThemeContext";
import type { Icebreaker } from "@/types/engagement";
import { Layout, Colors } from "@constants";
import { useAuth } from "@contexts/AuthProvider";

export default function IcebreakersScreen() {
  const api = useApiClient();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const { refreshUser } = useAuth();

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

  const items: Icebreaker[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const onChange = useCallback((id: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }, []);

  const onSave = useCallback(
    async (id: string) => {
      const answer = answers[id]?.trim() ?? "";
      if (!answer) return;
      await saveMutation.mutateAsync({ id, answer });
    },
    [answers, saveMutation]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background.primary,
            borderBottomColor: theme.colors.border.primary,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Today’s icebreakers</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const existing = item.answer ?? "";
          const val = answers[item.id] ?? existing;
          const answered = !!(item.answered && existing);
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
              <Text style={[styles.question, { color: theme.colors.text.primary }]}>{item.text}</Text>
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
                value={val}
                onChangeText={(t) => onChange(item.id, t)}
              />
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: answered ? theme.colors.neutral[300] : theme.colors.primary[500] },
                ]}
                disabled={saveMutation.isPending || !val?.trim()}
                onPress={() => onSave(item.id)}
              >
                <Text style={[styles.saveText, { color: theme.colors.text.inverse }]}>
                  {answered ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: theme.colors.text.secondary }}>No icebreakers available today.</Text>
          </View>
        )}
        refreshing={isFetching}
        onRefresh={() => qc.invalidateQueries({ queryKey: ["icebreakers", "today"] })}
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
