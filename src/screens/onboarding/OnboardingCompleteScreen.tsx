import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Colors } from "@constants/Colors";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import ScreenContainer from "@components/common/ScreenContainer";

interface OnboardingCompleteScreenProps {
  navigation: any;
}

export default function OnboardingCompleteScreen({ navigation }: OnboardingCompleteScreenProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const handleContinue = () => {
    navigation.navigate('Main');
  };

  const handleAddPhotos = () => {
    // Navigate to photo upload screen (to be implemented)
    navigation.navigate('Main', { openProfile: true });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    contentStyle: {
      flexGrow: 1,
    },
    successContainer: {
      alignItems: "center",
      paddingVertical: spacing.xl * 2,
    },
    successIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: Colors.success[100],
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    successEmoji: {
      fontSize: fontSize["4xl"],
    },
    successTitle: {
      fontSize: fontSize.xl,
      fontWeight: "bold",
      color: Colors.text.primary,
      marginBottom: spacing.md,
      textAlign: "center",
    },
    successSubtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: "center",
      lineHeight: spacing.xl,
    },
    nextStepsContainer: {
      flex: 1,
      paddingVertical: spacing.lg,
    },
    nextStepsTitle: {
      fontSize: fontSize.lg + 2,
      fontWeight: "bold",
      color: Colors.text.primary,
      marginBottom: spacing.xl,
      textAlign: "center",
    },
    stepItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.xs,
    },
    stepIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: Colors.background.secondary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    stepEmoji: {
      fontSize: fontSize.xl,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: Colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    stepDescription: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      lineHeight: spacing.lg,
    },
    actionsContainer: {
      paddingVertical: spacing.lg,
    },
    primaryButton: {
      backgroundColor: Colors.primary[500],
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: spacing.md,
    },
    primaryButtonText: {
      color: Colors.text.inverse,
      fontSize: fontSize.lg,
      fontWeight: "600",
    },
    secondaryButton: {
      backgroundColor: Colors.background.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors.border.primary,
      marginBottom: spacing.lg,
    },
    secondaryButtonText: {
      color: Colors.text.secondary,
      fontSize: fontSize.base,
      fontWeight: "500",
    },
    tipsContainer: {
      backgroundColor: Colors.background.secondary,
      padding: spacing.lg,
      borderRadius: 12,
      marginBottom: spacing.lg,
    },
    tipsTitle: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.text.primary,
      marginBottom: spacing.md,
    },
    tipText: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      lineHeight: spacing.lg,
      marginBottom: spacing.xs / 2,
    },
  });

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      <View style={styles.content}>
        {/* Success Animation/Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Profile Created!</Text>
          <Text style={styles.successSubtitle}>
            Congratulations! Your profile has been successfully created.
          </Text>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>📸</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Profile Photos</Text>
              <Text style={styles.stepDescription}>
                Upload photos to make your profile more attractive and get
                better matches
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>🔍</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Start Browsing</Text>
              <Text style={styles.stepDescription}>
                Discover and connect with amazing people in your area
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>💬</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Send Interests</Text>
              <Text style={styles.stepDescription}>
                Show interest in profiles you like and start meaningful
                conversations
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddPhotos}
          >
            <Text style={styles.primaryButtonText}>Add Photos Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinue}
          >
            <Text style={styles.secondaryButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <Text style={styles.tipText}>
            • Complete your profile to increase your chances of finding matches
          </Text>
          <Text style={styles.tipText}>
            • Add multiple photos showcasing different aspects of your life
          </Text>
          <Text style={styles.tipText}>
            • Be authentic and honest in your bio and preferences
          </Text>
          <Text style={styles.tipText}>
            • Stay active and engage with the community regularly
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}