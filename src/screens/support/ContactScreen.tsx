import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, { useResponsiveTypography } from "@/hooks/useResponsive";
import ContactForm from "@components/contact/ContactForm";
import ScreenContainer from "@components/common/ScreenContainer";
import { useToast } from "@providers/ToastContext";

interface ContactScreenProps {
  navigation: any;
}

export default function ContactScreen({ navigation }: ContactScreenProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const toast = useToast();

  const handleSubmitSuccess = () => {
    // Navigate back or to a success screen
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleEmailPress = () => {
    const email = "support@aroosi.app";
    const subject = "Support Request from Mobile App";
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          toast.show(`Email app not available. Please email: ${email}`, "info");
        }
      })
      .catch((err) => {
        console.error("Error opening email:", err);
        toast.show(`Email app not available. Please email: ${email}`, "error");
      });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.primary,
      backgroundColor: Colors.background.primary,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    backButton: {
      marginRight: spacing.md,
      padding: spacing.xs,
    },
    headerTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: fontSize.lg,
      color: Colors.text.primary,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    emailButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.primary[50],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: Layout.radius.sm,
      gap: spacing.xs,
    },
    emailButtonText: {
      fontSize: fontSize.sm,
      color: Colors.primary[600],
      fontWeight: "500",
    },
    content: {
      flex: 1,
    },
    contentStyle: {
      flexGrow: 1,
    },
    alternativeContact: {
      backgroundColor: Colors.background.secondary,
      margin: spacing.lg,
      padding: spacing.lg,
      borderRadius: Layout.radius.md,
      borderWidth: 1,
      borderColor: Colors.border.primary,
    },
    alternativeTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: Layout.typography.fontSize.base,
      color: Colors.text.primary,
      marginBottom: spacing.sm,
    },
    alternativeText: {
      fontSize: Layout.typography.fontSize.sm,
      color: Colors.text.secondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    contactMethods: {
      gap: spacing.sm,
    },
    contactMethod: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    contactMethodText: {
      fontSize: Layout.typography.fontSize.sm,
      color: Colors.text.primary,
      flex: 1,
    },
    responseTime: {
      backgroundColor: Colors.success[50],
      borderColor: Colors.success[200],
      borderWidth: 1,
      borderRadius: Layout.radius.sm,
      padding: spacing.sm,
      marginTop: spacing.md,
    },
    responseTimeText: {
      fontSize: Layout.typography.fontSize.xs,
      color: Colors.success[700],
      textAlign: "center",
      fontWeight: "500",
    },
  });

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.emailButton}
            onPress={handleEmailPress}
          >
            <Ionicons name="mail" size={16} color={Colors.primary[600]} />
            <Text style={styles.emailButtonText}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ContactForm
          onSubmitSuccess={handleSubmitSuccess}
          onCancel={handleCancel}
        />
      </View>

      {/* Alternative Contact Info */}
      <View style={styles.alternativeContact}>
        <Text style={styles.alternativeTitle}>Other Ways to Reach Us</Text>
        <Text style={styles.alternativeText}>
          If you prefer, you can also contact us directly through:
        </Text>

        <View style={styles.contactMethods}>
          <TouchableOpacity
            style={styles.contactMethod}
            onPress={handleEmailPress}
          >
            <Ionicons name="mail" size={16} color={Colors.primary[500]} />
            <Text style={styles.contactMethodText}>support@aroosi.app</Text>
            <Ionicons name="open" size={14} color={Colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.contactMethod}>
            <Ionicons name="time" size={16} color={Colors.success[500]} />
            <Text style={styles.contactMethodText}>
              Response within 24 hours
            </Text>
          </View>
        </View>

        <View style={styles.responseTime}>
          <Text style={styles.responseTimeText}>
            💬 We typically respond within 24 hours during business days
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
