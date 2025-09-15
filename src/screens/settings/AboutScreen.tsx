import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import ScreenContainer from "@components/common/ScreenContainer";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants";
import * as Application from "expo-application";
import * as Linking from "expo-linking";
import * as Updates from "expo-updates";

interface AboutScreenProps {
  navigation: any;
}

export default function AboutScreen({ navigation }: AboutScreenProps) {
  const { theme } = useTheme();

  const appName = Application.applicationName || "Aroosi";
  const version = Application.nativeApplicationVersion || "-";
  const buildNumber = Application.nativeBuildVersion || "-";
  const bundleId = Application.applicationId || "-";
  const platform = Platform.OS === "ios" ? "iOS" : "Android";
  // Updates/build context (best-effort; falls back safely in dev)
  const channel = Updates.channel ?? "dev";
  const runtimeVersion = Updates.runtimeVersion ?? "-";
  const updateId = Updates.updateId ?? "-";

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {}
  };

  return (
    <ScreenContainer containerStyle={styles.container} contentStyle={styles.contentStyle}>
      {/* Header */}
      <View style={styles.header}>\n        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>\n          <Text style={styles.backButtonText}>← Back</Text>\n        </TouchableOpacity>\n        <Text style={styles.headerTitle}>About</Text>\n        <View style={{ width: 56 }} />\n      </View>

  <View style={styles.card}>\n        <Text style={styles.appName}>{appName}</Text>\n        <Text style={styles.version}>{`Version ${version} (${buildNumber})`}</Text>\n        <Text style={styles.meta}>{platform} • {bundleId}</Text>\n        <View style={styles.kvRow}>\n          <Text style={styles.kvKey}>Channel</Text>\n          <Text style={styles.kvVal}>{channel}</Text>\n        </View>\n        <View style={styles.kvRow}>\n          <Text style={styles.kvKey}>Runtime</Text>\n          <Text style={styles.kvVal}>{runtimeVersion}</Text>\n        </View>\n        <View style={styles.kvRow}>\n          <Text style={styles.kvKey}>Update</Text>\n          <Text style={styles.kvVal}>{updateId}</Text>\n        </View>\n      </View>

      <View style={styles.section}>\n        <Text style={styles.sectionTitle}>Legal & Support</Text>\n        <View style={styles.listBox}>\n          <RowLink label="Terms of Service" onPress={() => openUrl("https://aroosi.com/terms")} />\n          <RowLink label="Privacy Policy" onPress={() => openUrl("https://aroosi.com/privacy")} />\n          <RowLink label="Contact Support" onPress={() => navigation.navigate("Contact" as any)} />\n        </View>\n      </View>

      <View style={styles.footer}>\n        <Text style={styles.footerText}>© {new Date().getFullYear()} Aroosi. All rights reserved.</Text>\n      </View>
    </ScreenContainer>
  );
}

function RowLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: Layout.spacing.md,
        paddingHorizontal: Layout.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.primary,
      }}
    >
      <Text style={{ fontSize: Layout.typography.fontSize.base, color: theme.colors.primary[600] }}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    contentStyle: {
      flexGrow: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
      backgroundColor: theme.colors.background.primary,
    },
    backButton: {
      padding: Layout.spacing.sm,
    },
    backButtonText: {
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.primary[500],
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: Layout.typography.fontSize.lg,
      fontWeight: "700",
      color: theme.colors.text.primary,
    },
    card: {
      backgroundColor: theme.colors.background.primary,
      margin: Layout.spacing.lg,
      borderRadius: Layout.radius.lg,
      padding: Layout.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      alignItems: "center",
    },
    kvRow: {
      width: "100%",
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    kvKey: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    kvVal: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.primary,
      fontFamily: Layout.typography.fontFamily.mono,
    },
    appName: {
      fontSize: Layout.typography.fontSize.xl,
      fontWeight: "800",
      color: theme.colors.text.primary,
      marginBottom: 6,
    },
    version: {
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginBottom: 2,
    },
    meta: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.neutral[500],
    },
    section: {
      marginTop: Layout.spacing.lg,
    },
    sectionTitle: {
      fontSize: Layout.typography.fontSize.lg,
      fontWeight: "700",
      color: theme.colors.text.primary,
      marginHorizontal: Layout.spacing.lg,
      marginBottom: Layout.spacing.sm,
    },
    listBox: {
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    footer: {
      marginTop: "auto",
      alignItems: "center",
      paddingVertical: Layout.spacing.lg,
    },
    footerText: {
      color: theme.colors.text.secondary,
      fontSize: Layout.typography.fontSize.sm,
    },
  });
}
