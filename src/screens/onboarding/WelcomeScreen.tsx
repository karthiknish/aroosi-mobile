import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { useResponsiveSpacing, useResponsiveTypography } from '../../../hooks/useResponsive';

interface WelcomeScreenProps {
  navigation: any;
}

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const handleGetStarted = () => {
    navigation.navigate('ProfileSetup');
  };

  const handleSkipForNow = () => {
    navigation.navigate('Main');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      paddingTop: spacing.xl * 2,
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logoText: {
      fontSize: fontSize["3xl"],
    },
    welcomeTitle: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: Colors.text.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: 'center',
      lineHeight: spacing.xl,
    },
    featuresContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: spacing.xl * 2,
    },
    feature: {
      alignItems: 'center',
      marginBottom: spacing.xl * 2,
      paddingHorizontal: spacing.lg,
    },
    featureIcon: {
      fontSize: fontSize["4xl"],
      marginBottom: spacing.md,
    },
    featureTitle: {
      fontSize: fontSize.lg,
      fontWeight: 'bold',
      color: Colors.text.primary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    featureDescription: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: 'center',
      lineHeight: spacing.lg + 2,
    },
    ctaContainer: {
      paddingBottom: spacing.xl * 2,
    },
    primaryButton: {
      backgroundColor: Colors.primary[500],
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    primaryButtonText: {
      color: Colors.text.inverse,
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: Colors.background.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border.primary,
      marginBottom: spacing.lg,
    },
    secondaryButtonText: {
      color: Colors.text.secondary,
      fontSize: fontSize.base,
      fontWeight: '500',
    },
    disclaimerText: {
      fontSize: fontSize.xs,
      color: Colors.text.tertiary,
      textAlign: 'center',
      lineHeight: spacing.lg,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>💕</Text>
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Aroosi!</Text>
          <Text style={styles.welcomeSubtitle}>
            Find your perfect match in our trusted community
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔍</Text>
            <Text style={styles.featureTitle}>Smart Matching</Text>
            <Text style={styles.featureDescription}>
              Our algorithm finds compatible matches based on your preferences
            </Text>
          </View>

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
          <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
            <Text style={styles.primaryButtonText}>Complete Your Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSkipForNow}>
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

