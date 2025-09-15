import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants";

type ChecklistItem = {
  id: number;
  title: string;
  subtitle: string;
  required?: boolean;
  completed: boolean;
};

const STEPS = [
  { id: 1, title: "Basic Info", subtitle: "Tell us about yourself" },
  { id: 2, title: "Location", subtitle: "Where are you based?" },
  { id: 3, title: "Physical Details", subtitle: "Your physical attributes" },
  { id: 4, title: "Professional", subtitle: "Your career & education" },
  { id: 5, title: "Cultural", subtitle: "Your cultural background" },
  { id: 6, title: "About Me", subtitle: "Describe yourself" },
  { id: 7, title: "Lifestyle", subtitle: "Your preferences" },
  { id: 8, title: "Photos", subtitle: "Add your profile photos" },
  { id: 9, title: "Create Account", subtitle: "Finish and create your account" },
];

const STORAGE_KEY = "PROFILE_CREATION_MOBILE";

export default function OnboardingChecklistScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setSnapshot(raw ? JSON.parse(raw) : null);
      } catch {
        setSnapshot(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items: ChecklistItem[] = useMemo(() => {
    const data = snapshot?.data || {};
    const req = {
      1: !!data.fullName && !!data.dateOfBirth && !!data.gender,
      2: !!data.country && !!data.city,
      3: !!data.height && !!data.maritalStatus,
      4: !!data.education && !!data.occupation,
      5: true, // optional selections captured when present
      6: !!data.aboutMe && !!data.phoneNumber,
      7: true, // optional
      8: true, // Photos are optional in onboarding
      9: false, // completed when account created (handled post-submit)
    } as Record<number, boolean>;
    return STEPS.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      completed: !!req[s.id],
      required: s.id !== 5 && s.id !== 7 && s.id !== 8,
    }));
  }, [snapshot]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.colors.primary[500]} />
      </View>
    );
  }

  const nextIncomplete = items.find((i) => i.required && !i.completed)?.id ?? 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Onboarding Checklist</Text>
        <Text style={styles.subtitle}>Jump to any step to finish faster</Text>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => navigation.navigate("ProfileSetup", { step: item.id })}
            style={[styles.row, item.completed && styles.rowCompleted]}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} ${item.completed ? "completed" : "incomplete"}`}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.statusDot, item.completed ? styles.statusDone : styles.statusTodo]} />
              <View>
                <Text style={styles.rowTitle}>{item.id}. {item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Text style={[styles.rowAction, item.completed && { color: theme.colors.text.tertiary }]}>
              {item.completed ? "Done" : "Start"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primary}
          onPress={() => navigation.navigate("ProfileSetup", { step: nextIncomplete })}
        >
          <Text style={styles.primaryText}>Continue (Step {nextIncomplete}/9)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    header: { paddingHorizontal: Layout.spacing.lg, paddingVertical: Layout.spacing.lg },
    title: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: Layout.typography.fontSize.lg,
      color: theme.colors.text.primary,
    },
    subtitle: { color: theme.colors.text.secondary, marginTop: 4 },
    list: { paddingHorizontal: Layout.spacing.lg },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: Layout.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    rowCompleted: { opacity: 0.8 },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: Layout.spacing.md },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusDone: { backgroundColor: theme.colors.success?.[500] || theme.colors.primary[500] },
    statusTodo: { backgroundColor: theme.colors.border.primary },
    rowTitle: { color: theme.colors.text.primary, fontWeight: "600" },
    rowSubtitle: { color: theme.colors.text.secondary, fontSize: Layout.typography.fontSize.sm },
    rowAction: { color: theme.colors.primary[500], fontWeight: "600" },
    footer: {
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
      gap: Layout.spacing.md,
    },
    primary: {
      backgroundColor: theme.colors.primary[500],
      paddingVertical: Layout.spacing.md,
      borderRadius: Layout.radius.md,
      alignItems: "center",
    },
    primaryText: { color: theme.colors.text.inverse, fontWeight: "600" },
    secondary: {
      backgroundColor: theme.colors.background.secondary,
      paddingVertical: Layout.spacing.md,
      borderRadius: Layout.radius.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    secondaryText: { color: theme.colors.text.primary, fontWeight: "600" },
  });
}
