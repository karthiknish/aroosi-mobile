import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import ScreenContainer from "@components/common/ScreenContainer";
import { Layout } from "@constants/Layout";
import { useTheme } from "@contexts/ThemeContext";

interface SafetyGuidelinesScreenProps {
  navigation: any;
}

type SafetyTipsSection = {
  icon: string;
  title: string;
  tips: string[];
};

type WarningSection = {
  icon: string;
  title: string;
  signs: string[];
};

type ReportingSection = {
  icon: string;
  title: string;
  description: string;
  examples: string[];
};

export default function SafetyGuidelinesScreen({
  navigation,
}: SafetyGuidelinesScreenProps) {
  const { theme } = useTheme();

  const safetyTips: SafetyTipsSection[] = [
    {
      icon: "🔒",
      title: "Protect Your Privacy",
      tips: [
        "Don't share personal information (full name, address, phone number) until you've met in person",
        "Use our in-app messaging system instead of giving out external contact details",
        "Be cautious about photos that might reveal your location or personal details",
        "Keep your profile private until you're comfortable sharing more",
      ],
    },
    {
      icon: "📱",
      title: "Stay on Platform",
      tips: [
        "Keep conversations on our platform where they're monitored for safety",
        "Be suspicious if someone immediately asks to move to another app",
        "Use our video chat feature before meeting in person",
        "Report users who push you to communicate elsewhere",
      ],
    },
    {
      icon: "🤝",
      title: "Meeting Safely",
      tips: [
        "Always meet in a public place for first dates",
        "Tell a friend or family member about your plans",
        "Drive yourself or arrange your own transportation",
        "Stay sober and alert during first meetings",
        "Trust your instincts - leave if something feels wrong",
      ],
    },
    {
      icon: "👁️",
      title: "Verify Profiles",
      tips: [
        "Look for verified profiles with multiple recent photos",
        "Be wary of profiles with very few photos or professional-looking shots only",
        "Video chat before meeting to confirm they match their photos",
        "Report profiles that seem fake or suspicious",
      ],
    },
  ];

  const warningSignsData: WarningSection[] = [
    {
      icon: "💸",
      title: "Financial Red Flags",
      signs: [
        "Asks for money, loans, or financial information",
        "Claims to be traveling/military and needs financial help",
        "Wants to send you money or gifts (often a scam setup)",
        "Asks for bank details or payment app information",
      ],
    },
    {
      icon: "🚨",
      title: "Behavioral Red Flags",
      signs: [
        "Pushes to move off the platform immediately",
        "Refuses to video chat or talk on the phone",
        "Professes love very quickly",
        "Pressures you for personal information",
        "Gets angry when you set boundaries",
      ],
    },
    {
      icon: "🎭",
      title: "Profile Red Flags",
      signs: [
        "Very few photos or photos that look too professional",
        "Inconsistent information in their profile or messages",
        "Grammar and language that doesn't match their stated location",
        "Photos that seem too good to be true",
      ],
    },
  ];

  const reportingInfo: ReportingSection[] = [
    {
      icon: "🚫",
      title: "When to Block",
      description:
        "Use blocking when someone is bothering you but hasn't necessarily broken rules. Blocking immediately prevents all contact.",
      examples: [
        "Unwanted persistent messages",
        "Not your type but won't take hints",
        "Different values or lifestyle",
      ],
    },
    {
      icon: "⚠️",
      title: "When to Report",
      description:
        "Use reporting when someone violates community guidelines. Reports help keep the platform safe for everyone.",
      examples: [
        "Inappropriate photos or messages",
        "Harassment or threats",
        "Fake profiles or scams",
        "Soliciting money",
      ],
    },
  ];

  const renderSafetySection = (section: SafetyTipsSection, index: number) => (
    <View
      key={`safety-${index}`}
      style={[
        styles.section,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text
          style={[styles.sectionIcon, { color: theme.colors.text.primary }]}
        >
          {section.icon}
        </Text>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          {section.title}
        </Text>
      </View>
      <View style={styles.tipsList}>
        {section.tips.map((tip, tipIndex) => (
          <View key={`tip-${index}-${tipIndex}`} style={styles.tipItem}>
            <Text
              style={[styles.tipBullet, { color: theme.colors.primary[500] }]}
            >
              •
            </Text>
            <Text
              style={[styles.tipText, { color: theme.colors.text.primary }]}
            >
              {tip}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderWarningSection = (section: WarningSection, index: number) => (
    <View
      key={`warn-${index}`}
      style={[
        styles.section,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text
          style={[styles.sectionIcon, { color: theme.colors.text.primary }]}
        >
          {section.icon}
        </Text>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          {section.title}
        </Text>
      </View>
      <View style={styles.tipsList}>
        {section.signs.map((sign, signIndex) => (
          <View key={`sign-${index}-${signIndex}`} style={styles.warningItem}>
            <Text
              style={[styles.warningBullet, { color: theme.colors.error[600] }]}
            >
              ⚠️
            </Text>
            <Text
              style={[styles.warningText, { color: theme.colors.text.primary }]}
            >
              {sign}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderReportingSection = (section: ReportingSection, index: number) => (
    <View
      key={`report-${index}`}
      style={[
        styles.section,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text
          style={[styles.sectionIcon, { color: theme.colors.text.primary }]}
        >
          {section.icon}
        </Text>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
        >
          {section.title}
        </Text>
      </View>
      <Text
        style={[
          styles.sectionDescription,
          { color: theme.colors.text.secondary },
        ]}
      >
        {section.description}
      </Text>
      <View
        style={[
          styles.examplesList,
          {
            backgroundColor: theme.colors.neutral[50],
          },
        ]}
      >
        <Text
          style={[styles.examplesTitle, { color: theme.colors.text.primary }]}
        >
          Examples:
        </Text>
        {section.examples.map((example, exampleIndex) => (
          <Text
            key={`example-${index}-${exampleIndex}`}
            style={[styles.exampleItem, { color: theme.colors.text.secondary }]}
          >
            • {example}
          </Text>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenContainer
      containerStyle={{
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
      }}
      contentStyle={styles.contentStyle}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border.primary,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text
            style={[
              styles.backButtonText,
              { color: theme.colors.text.primary },
            ]}
          >
            ←
          </Text>
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.colors.text.primary }]}
        >
          Safety Guidelines
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View
          style={{
            padding: Layout.spacing.lg,
            backgroundColor: theme.colors.primary[50],
            margin: Layout.spacing.lg,
            borderRadius: Layout.radius.lg,
          }}
        >
          <Text
            style={{
              fontSize: Layout.typography.fontSize.lg,
              fontWeight: "600",
              color: theme.colors.primary[700],
              textAlign: "center",
              marginBottom: Layout.spacing.xs,
            }}
          >
            Your Safety is Our Priority
          </Text>
          <Text
            style={{
              fontSize: Layout.typography.fontSize.base,
              color: theme.colors.primary[600],
              lineHeight: 22,
              textAlign: "center",
            }}
          >
            Follow these guidelines to have a safe and positive experience on
            our platform. Remember, if something doesn't feel right, trust your
            instincts.
          </Text>
        </View>

        {/* Safety Tips */}
        <View style={styles.category}>
          <Text
            style={[styles.categoryTitle, { color: theme.colors.text.primary }]}
          >
            🛡️ General Safety Tips
          </Text>
          {safetyTips.map(renderSafetySection)}
        </View>

        {/* Warning Signs */}
        <View style={styles.category}>
          <Text
            style={[styles.categoryTitle, { color: theme.colors.text.primary }]}
          >
            🚩 Warning Signs to Watch For
          </Text>
          <Text
            style={[
              styles.categoryDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            Be aware of these red flags that might indicate someone isn't who
            they claim to be or has bad intentions:
          </Text>
          {warningSignsData.map(renderWarningSection)}
        </View>

        {/* Reporting vs Blocking */}
        <View style={styles.category}>
          <Text
            style={[styles.categoryTitle, { color: theme.colors.text.primary }]}
          >
            🔧 Safety Tools
          </Text>
          <Text
            style={[
              styles.categoryDescription,
              { color: theme.colors.text.secondary },
            ]}
          >
            We provide tools to help you stay safe. Here's when to use each one:
          </Text>
          {reportingInfo.map(renderReportingSection)}
        </View>

        {/* Emergency Information */}
        <View
          style={[
            styles.emergencySection,
            {
              backgroundColor: theme.colors.error[50],
              borderLeftColor: theme.colors.error[500],
            },
          ]}
        >
          <View style={styles.emergencyHeader}>
            <Text
              style={[styles.emergencyIcon, { color: theme.colors.error[700] }]}
            >
              🆘
            </Text>
            <Text
              style={[
                styles.emergencyTitle,
                { color: theme.colors.error[700] },
              ]}
            >
              In Case of Emergency
            </Text>
          </View>
          <Text
            style={[styles.emergencyText, { color: theme.colors.error[600] }]}
          >
            If you feel unsafe or threatened, contact local emergency services
            immediately.
          </Text>
          <View
            style={[
              styles.emergencyContacts,
              { backgroundColor: theme.colors.background.primary },
            ]}
          >
            <Text
              style={[
                styles.emergencyContact,
                { color: theme.colors.error[700] },
              ]}
            >
              🚨 Emergency: 999
            </Text>
            <Text
              style={[
                styles.emergencyContact,
                { color: theme.colors.error[700] },
              ]}
            >
              🔍 Non-emergency police: 101
            </Text>
            <Text
              style={[
                styles.emergencyContact,
                { color: theme.colors.error[700] },
              ]}
            >
              💬 Text emergency services: 999 (text "register" first)
            </Text>
          </View>
        </View>

        {/* Contact Support */}
        <View
          style={[
            styles.supportSection,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.supportTitle, { color: theme.colors.text.primary }]}
          >
            Need Help?
          </Text>
          <Text
            style={[styles.supportText, { color: theme.colors.text.secondary }]}
          >
            Our safety team is here 24/7. If you experience any issues or have
            safety concerns, don't hesitate to reach out to us.
          </Text>
          <TouchableOpacity
            style={[
              styles.supportButton,
              { backgroundColor: theme.colors.primary[500] },
            ]}
          >
            <Text
              style={[
                styles.supportButtonText,
                { color: theme.colors.background.primary },
              ]}
            >
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    flexGrow: 1,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: Layout.spacing.md,
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.xl,
  },
  headerTitle: {
    flex: 1,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    textAlign: "center",
  },
  category: {
    marginBottom: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
  },
  categoryTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    marginBottom: Layout.spacing.sm,
  },
  categoryDescription: {
    fontSize: Layout.typography.fontSize.base,
    lineHeight: 22,
    marginBottom: Layout.spacing.md,
  },
  section: {
    marginBottom: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: Layout.spacing.sm,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: Layout.typography.fontSize.base,
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
    marginTop: 2,
    marginRight: Layout.spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
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
    lineHeight: 22,
  },
  examplesList: {
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  examplesTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    marginBottom: Layout.spacing.xs,
  },
  exampleItem: {
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Layout.spacing.xs,
  },
  emergencySection: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    borderLeftWidth: 4,
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
  },
  emergencyText: {
    fontSize: Layout.typography.fontSize.base,
    lineHeight: 22,
    marginBottom: Layout.spacing.md,
  },
  emergencyContacts: {
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  emergencyContact: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "500",
    marginBottom: Layout.spacing.xs,
  },
  supportSection: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
  },
  supportTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    marginBottom: Layout.spacing.sm,
  },
  supportText: {
    fontSize: Layout.typography.fontSize.base,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
  },
  supportButton: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  supportButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
  },
});
