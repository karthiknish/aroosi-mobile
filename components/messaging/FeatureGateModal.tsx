import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import {
  SubscriptionTier,
  MessagingFeatureUtils,
} from "../../utils/messagingFeatures";

interface FeatureGateModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
  feature: "chat" | "voice" | "image" | "unlimited";
  currentTier: SubscriptionTier;
  reason?: string;
}

const { width: screenWidth } = Dimensions.get("window");

export const FeatureGateModal: React.FC<FeatureGateModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  feature,
  currentTier,
  reason,
}) => {
  const requiredTier = MessagingFeatureUtils.getRequiredTierForFeature(feature);
  const upgradePrompt = MessagingFeatureUtils.getUpgradePrompt(feature);
  const benefits = MessagingFeatureUtils.getSubscriptionBenefits(requiredTier);

  const handleUpgrade = () => {
    onUpgrade(requiredTier);
    onClose();
  };

  const getFeatureIcon = () => {
    switch (feature) {
      case "chat":
        return "💬";
      case "voice":
        return "🎤";
      case "image":
        return "📷";
      case "unlimited":
        return "🚀";
      default:
        return "⭐";
    }
  };

  const getFeatureTitle = () => {
    switch (feature) {
      case "chat":
        return "Start New Conversations";
      case "voice":
        return "Send Voice Messages";
      case "image":
        return "Share Images";
      case "unlimited":
        return "Unlimited Messaging";
      default:
        return "Premium Feature";
    }
  };

  const getTierDisplayName = (tier: SubscriptionTier) => {
    switch (tier) {
      case "premium":
        return "Premium";
      case "premiumPlus":
        return "Premium Plus";
      default:
        return "Free";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.icon}>{getFeatureIcon()}</Text>
              <Text style={styles.title}>{getFeatureTitle()}</Text>
              <Text style={styles.subtitle}>{reason || upgradePrompt}</Text>
            </View>

            {/* Current vs Required Tier */}
            <View style={styles.tierComparison}>
              <View style={styles.tierBox}>
                <Text style={styles.tierLabel}>Current Plan</Text>
                <Text style={[styles.tierName, styles.currentTier]}>
                  {getTierDisplayName(currentTier)}
                </Text>
              </View>

              <View style={styles.arrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>

              <View style={styles.tierBox}>
                <Text style={styles.tierLabel}>Required Plan</Text>
                <Text style={[styles.tierName, styles.requiredTier]}>
                  {getTierDisplayName(requiredTier)}
                </Text>
              </View>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>
                What you'll get with {getTierDisplayName(requiredTier)}:
              </Text>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.upgradeButton]}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>
                  Upgrade to {getTierDisplayName(requiredTier)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: Math.min(screenWidth - 40, 400),
    maxHeight: "80%",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  tierComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tierBox: {
    flex: 1,
    alignItems: "center",
  },
  tierLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentTier: {
    backgroundColor: "#f0f0f0",
    color: "#666",
  },
  requiredTier: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
  },
  arrow: {
    marginHorizontal: 16,
  },
  arrowText: {
    fontSize: 20,
    color: "#999",
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 16,
    color: "#4caf50",
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradeButton: {
    backgroundColor: "#1976d2",
  },
  upgradeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
});
