import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import { useAuth } from "@contexts/AuthProvider";
import ScreenContainer from "@components/common/ScreenContainer";

interface WelcomeScreenProps {
  navigation: any;
}

const { width, height } = Dimensions.get("window");

// Helper to resolve Boldonse font family for headings (matches test font logic)
const getBoldonseFontFamily = () => {
  return Platform.select({
    ios: "Boldonse",
    android: "Boldonse-Regular",
    default: "Boldonse-Regular",
  });
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { user, signOut } = useAuth();
  const hasProfile = !!user?.profile;
  const isProfileLoading = !user?.profile && !!user;
  const [snapshotStep, setSnapshotStep] = useState<number | null>(null);

  // Note: The RootNavigator handles the main navigation logic
  // This screen should only be shown when onboarding is needed

  const handleGetStarted = () => {
    // Navigate to profile setup regardless of current state
    // The ProfileSetupScreen will handle the specific step logic
    navigation.navigate("ProfileSetup");
  };

  const handleResume = () => {
    if (snapshotStep && snapshotStep >= 1) {
      navigation.navigate("ProfileSetup", { step: snapshotStep });
    } else {
      navigation.navigate("ProfileSetup");
    }
  };

  const handleStartOver = async () => {
    try {
      await AsyncStorage.removeItem("PROFILE_CREATION_MOBILE");
    } catch {}
    navigation.navigate("ProfileSetup", { step: 1 });
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("PROFILE_CREATION_MOBILE");
        if (raw) {
          const parsed = JSON.parse(raw);
          const step = Number(parsed?.step);
          if (Number.isFinite(step) && step >= 1 && step <= 9) {
            setSnapshotStep(step);
          } else {
            setSnapshotStep(null);
          }
        } else {
          setSnapshotStep(null);
        }
      } catch {
        setSnapshotStep(null);
      }
    })();
  }, []);

  const handleDevLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // (Removed font debug logs)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    content: {
      paddingHorizontal: spacing.xl,
      minHeight: height, // Ensure content is at least screen height for scroll
    },
    header: {
      alignItems: "center",
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary[100],
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    logoText: {
      fontSize: fontSize["3xl"],
    },
    welcomeTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize.xl,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      textAlign: "center",
    },
    welcomeSubtitle: {
      fontSize: fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: "center",
      lineHeight: spacing.xl,
    },
    connectText: {
      fontFamily: Layout.typography.fontFamily.sansBold,
      fontSize: fontSize.lg,
      color: theme.colors.text.primary,
      textAlign: "center",
      fontWeight: "700",
      marginTop: spacing.md,
    },
    featuresContainer: {
      paddingVertical: height > 700 ? spacing.xl : spacing.lg,
    },
    feature: {
      alignItems: "center",
      marginBottom: height > 700 ? spacing.xl * 1.5 : spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    featureIcon: {
      fontSize: fontSize["4xl"],
      marginBottom: spacing.md,
    },
    featureTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize.lg,
      color: theme.colors.text.primary,
      marginBottom: spacing.xs,
      textAlign: "center",
    },
    featureDescription: {
      fontSize: fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: "center",
      lineHeight: spacing.lg + 2,
    },
    ctaContainer: {
      paddingTop: spacing.lg,
      paddingBottom: height > 700 ? spacing.xl * 2 : spacing.xl,
      marginTop: "auto", // Push to bottom
    },
    primaryButton: {
      backgroundColor: theme.colors.primary[500],
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: spacing.md,
    },
    primaryButtonText: {
      fontFamily: Layout.typography.fontFamily.sansSemiBold,
      color: theme.colors.text.inverse,
      fontSize: fontSize.lg,
      fontWeight: "600",
    },
    secondaryButton: {
      backgroundColor: theme.colors.background.secondary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      marginBottom: spacing.sm,
    },
    secondaryButtonText: {
      fontFamily: Layout.typography.fontFamily.sansSemiBold,
      color: theme.colors.text.primary,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    disclaimerText: {
      fontSize: fontSize.xs,
      color: theme.colors.text.tertiary,
      textAlign: "center",
      lineHeight: spacing.lg,
    },
    helperText: {
      fontSize: fontSize.xs,
      color: theme.colors.text.tertiary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    linkButton: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    linkButtonText: {
      color: theme.colors.primary[500],
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    devLogoutButton: {
      backgroundColor: theme.colors.error[500],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
      alignSelf: "center",
      marginTop: spacing.md,
    },
    devLogoutText: {
      fontFamily: Layout.typography.fontFamily.sansSemiBold,
      color: theme.colors.text.inverse,
      fontSize: fontSize.xs,
      fontWeight: "600",
    },
    fontTest: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize.lg,
      color: theme.colors.primary[500],
      position: "absolute",
      top: spacing.md * 3,
      left: spacing.md,
      padding: spacing.xs,
      borderRadius: 4,
    },
  });

  // Show loading state while checking profile
  if (isProfileLoading) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <View
          style={[
            styles.content,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={styles.welcomeTitle}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.content}>
      {/* Logo/Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>💕</Text>
        </View>
        <Text style={styles.welcomeTitle}>
          {hasProfile
            ? `Welcome back${
                user?.profile?.fullName
                  ? `, ${user.profile.fullName.split(" ")[0]}`
                  : ""
              }!`
            : "Welcome to Aroosi!"}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {hasProfile
            ? "Let's finish setting up your profile"
            : "Find your perfect match in our trusted community"}
        </Text>
        <Text style={styles.connectText}>Connect with Afghans worldwide</Text>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🛡️</Text>
          <Text style={styles.featureTitle}>Safe & Secure</Text>
          <Text style={styles.featureDescription}>
            Verified profiles and secure messaging for your peace of mind
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>💬</Text>
          <Text style={styles.featureTitle}>Real Connections</Text>
          <Text style={styles.featureDescription}>
            Build meaningful relationships with like-minded individuals
          </Text>
        </View>
      </View>

      {/* Call to Action */}
      <View style={styles.ctaContainer}>
        {snapshotStep ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Resume Profile Setup"
              accessibilityHint={`Continue from step ${snapshotStep} of 9`}
              style={styles.primaryButton}
              onPress={handleResume}
            >
              <Text style={styles.primaryButtonText}>
                Resume Profile Setup (Step {snapshotStep}/9)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Start over"
              accessibilityHint="Restart profile setup from step 1"
              style={[styles.secondaryButton]}
              onPress={handleStartOver}
            >
              <Text style={styles.secondaryButtonText}>Start Over</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open onboarding checklist"
              accessibilityHint="See all steps and jump to a specific one"
              style={styles.linkButton}
              onPress={() => navigation.navigate("OnboardingChecklist")}
            >
              <Text style={styles.linkButtonText}>
                Open Onboarding Checklist
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              We saved your progress. You can resume anytime.
            </Text>
          </>
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                hasProfile ? "Continue setup" : "Complete your profile"
              }
              accessibilityHint="Start the onboarding process"
              style={styles.primaryButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.primaryButtonText}>
                {hasProfile ? "Continue Setup" : "Complete Your Profile"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open onboarding checklist"
              accessibilityHint="See all steps and jump to a specific one"
              style={styles.linkButton}
              onPress={() => navigation.navigate("OnboardingChecklist")}
            >
              <Text style={styles.linkButtonText}>
                View Onboarding Checklist
              </Text>
            </TouchableOpacity>
            <Text style={styles.disclaimerText}>
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </Text>
          </>
        )}

        {/* Move DEV: Logout button here, below the CTA */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devLogoutButton}
            onPress={handleDevLogout}
          >
            <Text style={styles.devLogoutText}>DEV: Logout</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}
