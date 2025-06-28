import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Colors, Layout } from '../../../constants';
import ScreenContainer from "../../../components/common/ScreenContainer";

interface SafetyGuidelinesScreenProps {
  navigation: any;
}

export default function SafetyGuidelinesScreen({ navigation }: SafetyGuidelinesScreenProps) {
  const safetyTips = [
    {
      icon: '🔒',
      title: 'Protect Your Privacy',
      tips: [
        'Don\'t share personal information (full name, address, phone number) until you\'ve met in person',
        'Use our in-app messaging system instead of giving out external contact details',
        'Be cautious about photos that might reveal your location or personal details',
        'Keep your profile private until you\'re comfortable sharing more'
      ]
    },
    {
      icon: '📱',
      title: 'Stay on Platform',
      tips: [
        'Keep conversations on our platform where they\'re monitored for safety',
        'Be suspicious if someone immediately asks to move to another app',
        'Use our video chat feature before meeting in person',
        'Report users who push you to communicate elsewhere'
      ]
    },
    {
      icon: '🤝',
      title: 'Meeting Safely',
      tips: [
        'Always meet in a public place for first dates',
        'Tell a friend or family member about your plans',
        'Drive yourself or arrange your own transportation',
        'Stay sober and alert during first meetings',
        'Trust your instincts - leave if something feels wrong'
      ]
    },
    {
      icon: '👁️',
      title: 'Verify Profiles',
      tips: [
        'Look for verified profiles with multiple recent photos',
        'Be wary of profiles with very few photos or professional-looking shots only',
        'Video chat before meeting to confirm they match their photos',
        'Report profiles that seem fake or suspicious'
      ]
    }
  ];

  const warningSignsData = [
    {
      icon: '💰',
      title: 'Financial Red Flags',
      signs: [
        'Asks for money, loans, or financial information',
        'Claims to be traveling/military and needs financial help',
        'Wants to send you money or gifts (often a scam setup)',
        'Asks for bank details or payment app information'
      ]
    },
    {
      icon: '🚨',
      title: 'Behavioral Red Flags',
      signs: [
        'Pushes to move off the platform immediately',
        'Refuses to video chat or talk on the phone',
        'Professes love very quickly',
        'Pressures you for personal information',
        'Gets angry when you set boundaries'
      ]
    },
    {
      icon: '🎭',
      title: 'Profile Red Flags',
      signs: [
        'Very few photos or photos that look too professional',
        'Inconsistent information in their profile or messages',
        'Grammar and language that doesn\'t match their stated location',
        'Photos that seem too good to be true'
      ]
    }
  ];

  const reportingInfo = [
    {
      icon: '🚫',
      title: 'When to Block',
      description: 'Use blocking when someone is bothering you but hasn\'t necessarily broken rules. Blocking immediately prevents all contact.',
      examples: ['Unwanted persistent messages', 'Not your type but won\'t take hints', 'Different values or lifestyle']
    },
    {
      icon: '⚠️',
      title: 'When to Report',
      description: 'Use reporting when someone violates community guidelines. Reports help keep the platform safe for everyone.',
      examples: ['Inappropriate photos or messages', 'Harassment or threats', 'Fake profiles or scams', 'Soliciting money']
    }
  ];

  const renderSafetySection = (section: any, index: number) => (
    <View key={index} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <View style={styles.tipsList}>
        {section.tips.map((tip: string, tipIndex: number) => (
          <View key={tipIndex} style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderWarningSection = (section: any, index: number) => (
    <View key={index} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <View style={styles.tipsList}>
        {section.signs.map((sign: string, signIndex: number) => (
          <View key={signIndex} style={styles.warningItem}>
            <Text style={styles.warningBullet}>⚠️</Text>
            <Text style={styles.warningText}>{sign}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderReportingSection = (section: any, index: number) => (
    <View key={index} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <Text style={styles.sectionDescription}>{section.description}</Text>
      <View style={styles.examplesList}>
        <Text style={styles.examplesTitle}>Examples:</Text>
        {section.examples.map((example: string, exampleIndex: number) => (
          <Text key={exampleIndex} style={styles.exampleItem}>• {example}</Text>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Guidelines</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.introduction}>
          <Text style={styles.introTitle}>Your Safety is Our Priority</Text>
          <Text style={styles.introText}>
            Follow these guidelines to have a safe and positive experience on
            our platform. Remember, if something doesn't feel right, trust your
            instincts.
          </Text>
        </View>

        {/* Safety Tips */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>🛡️ General Safety Tips</Text>
          {safetyTips.map(renderSafetySection)}
        </View>

        {/* Warning Signs */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>
            🚩 Warning Signs to Watch For
          </Text>
          <Text style={styles.categoryDescription}>
            Be aware of these red flags that might indicate someone isn't who
            they claim to be or has bad intentions:
          </Text>
          {warningSignsData.map(renderWarningSection)}
        </View>

        {/* Reporting vs Blocking */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>🔧 Safety Tools</Text>
          <Text style={styles.categoryDescription}>
            We provide tools to help you stay safe. Here's when to use each one:
          </Text>
          {reportingInfo.map(renderReportingSection)}
        </View>

        {/* Emergency Information */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyHeader}>
            <Text style={styles.emergencyIcon}>🆘</Text>
            <Text style={styles.emergencyTitle}>In Case of Emergency</Text>
          </View>
          <Text style={styles.emergencyText}>
            If you feel unsafe or threatened, contact local emergency services
            immediately.
          </Text>
          <View style={styles.emergencyContacts}>
            <Text style={styles.emergencyContact}>🚨 Emergency: 999</Text>
            <Text style={styles.emergencyContact}>
              🔍 Non-emergency police: 101
            </Text>
            <Text style={styles.emergencyContact}>
              💬 Text emergency services: 999 (text "register" first)
            </Text>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Our safety team is here 24/7. If you experience any issues or have
            safety concerns, don't hesitate to reach out to us.
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.xl,
    color: Colors.primary[500],
  },
  headerTitle: {
    flex: 1,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  introduction: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.primary[50],
    margin: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
  },
  introTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: "600",
    color: Colors.primary[700],
    marginBottom: Layout.spacing.sm,
    textAlign: "center",
  },
  introText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[600],
    lineHeight: 22,
    textAlign: "center",
  },
  category: {
    marginBottom: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
  },
  categoryTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  categoryDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Layout.spacing.lg,
  },
  section: {
    marginBottom: Layout.spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: Layout.spacing.sm,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  sectionDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Layout.spacing.md,
  },
  tipsList: {
    marginLeft: Layout.spacing.sm,
  },
  tipItem: {
    flexDirection: "row",
    marginBottom: Layout.spacing.sm,
    alignItems: "flex-start",
  },
  tipBullet: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    marginRight: Layout.spacing.sm,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  warningItem: {
    flexDirection: "row",
    marginBottom: Layout.spacing.sm,
    alignItems: "flex-start",
  },
  warningBullet: {
    fontSize: 14,
    marginRight: Layout.spacing.sm,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  examplesList: {
    backgroundColor: Colors.neutral[50],
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  examplesTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  exampleItem: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Layout.spacing.xs,
  },
  emergencySection: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.error[50],
    borderRadius: Layout.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error[500],
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },
  emergencyIcon: {
    fontSize: 24,
    marginRight: Layout.spacing.sm,
  },
  emergencyTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.error[700],
  },
  emergencyText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.error[600],
    lineHeight: 22,
    marginBottom: Layout.spacing.md,
  },
  emergencyContacts: {
    backgroundColor: Colors.background.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  emergencyContact: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.error[700],
    fontWeight: "500",
    marginBottom: Layout.spacing.xs,
  },
  supportSection: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
  },
  supportTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  supportText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
  },
  supportButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  supportButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.background.primary,
  },
  contentStyle: {
    flexGrow: 1,
  },
});