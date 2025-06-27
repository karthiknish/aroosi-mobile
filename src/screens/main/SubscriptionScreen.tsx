import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useSubscription } from "../../../hooks/useSubscription";
import SubscriptionCard from "../../../components/subscription/SubscriptionCard";
import UsageDashboard from "../../../components/subscription/UsageDashboard";
import UpgradeConfirmationModal from "../../../components/subscription/UpgradeConfirmationModal";
import { Colors, Layout } from "../../../constants";
import { SubscriptionPlan, PlanFeature } from "../../../types/subscription";

interface SubscriptionScreenProps {
  navigation: any;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    tier: "free",
    name: "Free",
    description: "Basic features to get started",
    price: 0,
    currency: "GBP",
    duration: "monthly",
    features: [
      "5 messages per month",
      "3 interests per month",
      "View up to 10 profiles per day",
      "20 searches per month",
      "Basic search filters",
    ],
  },
  {
    id: "premium",
    tier: "premium",
    name: "Premium",
    description: "Enhanced features for better connections",
    price: 14.99,
    currency: "GBP",
    duration: "monthly",
    features: [
      "Unlimited messaging",
      "Unlimited interests",
      "Advanced search filters",
      "See who viewed your profile",
      "Read receipts",
      "1 profile boost per month",
    ],
  },
  {
    id: "premiumPlus",
    tier: "premiumPlus",
    name: "Premium+",
    description: "Maximum features for serious dating",
    price: 39.99,
    currency: "GBP",
    duration: "monthly",
    popularBadge: true,
    features: [
      "Everything in Premium",
      "See who liked you",
      "Incognito browsing",
      "Priority customer support",
      "Unlimited profile boosts",
      "Advanced matching algorithm",
    ],
  },
];

export default function SubscriptionScreen({
  navigation,
}: SubscriptionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<SubscriptionPlan | null>(
    null
  );
  const {
    subscription,
    usage,
    hasActiveSubscription,
    isTrialActive,
    daysUntilExpiry,
    loading,
    purchaseSubscription,
    cancelSubscription,
    restorePurchases,
  } = useSubscription();

  const currentTier = subscription?.tier || "free";

  const handlePurchase = async (tier: string) => {
    const targetPlan = SUBSCRIPTION_PLANS.find((plan) => plan.tier === tier);
    if (!targetPlan) return;

    // If user has an active subscription, show upgrade confirmation
    if (hasActiveSubscription && subscription?.tier !== tier) {
      setUpgradeTarget(targetPlan);
      setShowUpgradeModal(true);
      return;
    }

    // Direct purchase for new subscriptions
    try {
      setPurchasing(tier);
      const success = await purchaseSubscription(tier);

      if (success) {
        Alert.alert(
          "Success!",
          "Your subscription has been activated. Enjoy your premium features!",
          [{ text: "OK" }]
        );
        setSelectedPlan(null);
      } else {
        Alert.alert(
          "Purchase Failed",
          "There was an issue processing your purchase. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again later.", [
        { text: "OK" },
      ]);
    } finally {
      setPurchasing(null);
    }
  };

  const handleUpgradeConfirm = async (planId: string): Promise<boolean> => {
    try {
      setPurchasing(planId);
      const success = await purchaseSubscription(planId);
      if (success) {
        setShowUpgradeModal(false);
        setUpgradeTarget(null);
        setSelectedPlan(null);
      }
      return success;
    } catch (error) {
      console.error("Upgrade error:", error);
      return false;
    } finally {
      setPurchasing(null);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            const success = await cancelSubscription();
            if (success) {
              Alert.alert(
                "Subscription Cancelled",
                "Your subscription has been cancelled. You will continue to have access until the end of your current billing period.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert(
        "Purchases Restored",
        "Your previous purchases have been restored.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "No Purchases Found",
        "No previous purchases were found to restore.",
        [{ text: "OK" }]
      );
    }
  };

  const renderFeatureRow = (feature: PlanFeature) => (
    <View key={feature.title} style={styles.featureRow}>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <View style={styles.featureChecks}>
        <View style={styles.checkContainer}>
          {feature.free ? (
            <Text style={styles.checkMark}>✓</Text>
          ) : (
            <Text style={styles.checkMark}>—</Text>
          )}
        </View>
        <View style={styles.checkContainer}>
          {feature.premium ? (
            <Text style={styles.checkMark}>✓</Text>
          ) : (
            <Text style={styles.checkMark}>—</Text>
          )}
        </View>
        <View style={styles.checkContainer}>
          {feature.premiumPlus ? (
            <Text style={styles.checkMark}>✓</Text>
          ) : (
            <Text style={styles.checkMark}>—</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Loading subscription details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Plan</Text>
          {hasActiveSubscription ? (
            <View>
              <Text style={styles.statusActive}>
                {subscription?.tier?.toUpperCase()} Active
              </Text>
              {daysUntilExpiry > 0 && (
                <Text style={styles.statusExpiry}>
                  Renews in {daysUntilExpiry} days
                </Text>
              )}
            </View>
          ) : isTrialActive ? (
            <View>
              <Text style={styles.statusTrial}>Trial Active</Text>
              <Text style={styles.statusExpiry}>
                {daysUntilExpiry} days remaining
              </Text>
            </View>
          ) : (
            <Text style={styles.statusFree}>Free Plan</Text>
          )}
        </View>

        {/* Usage Dashboard */}
        {usage && (
          <View style={styles.usageSection}>
            <UsageDashboard onUpgradePress={() => {}} />
          </View>
        )}

        {/* Subscription Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.plansTitle}>Choose Your Plan</Text>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              isCurrentPlan={currentTier === plan.tier}
              onSelect={setSelectedPlan}
              disabled={purchasing !== null}
            />
          ))}
        </View>

        {/* Purchase Button */}
        {selectedPlan && selectedPlan.tier !== currentTier && (
          <View style={styles.purchaseSection}>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => handlePurchase(selectedPlan.tier)}
              disabled={purchasing !== null}
            >
              {purchasing === selectedPlan.tier ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  Subscribe to {selectedPlan.name} - £
                  {selectedPlan.price.toFixed(2)}/month
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Management Section */}
        <View style={styles.managementSection}>
          <TouchableOpacity
            style={styles.usageHistoryButton}
            onPress={() => navigation.navigate("UsageHistory")}
          >
            <Text style={styles.usageHistoryButtonText}>
              View Usage History
            </Text>
          </TouchableOpacity>

          {hasActiveSubscription && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
            >
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            Subscriptions auto-renew until cancelled. You can cancel anytime in
            your account settings.
          </Text>
        </View>
      </ScrollView>

      {/* Upgrade Confirmation Modal */}
      {upgradeTarget && (
        <UpgradeConfirmationModal
          visible={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeTarget(null);
          }}
          currentPlan={
            subscription
              ? {
                  id: subscription.tier,
                  tier: subscription.tier,
                  name:
                    subscription.tier === "premium"
                      ? "Premium"
                      : subscription.tier === "premiumPlus"
                      ? "Premium Plus"
                      : "Free",
                  price:
                    subscription.tier === "premium"
                      ? 14.99
                      : subscription.tier === "premiumPlus"
                      ? 39.99
                      : 0,
                  currency: "GBP",
                  duration: "monthly",
                  description: "",
                  features: [] as string[],
                }
              : null
          }
          targetPlan={upgradeTarget}
          onConfirm={handleUpgradeConfirm}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 50,
  },
  statusCard: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  usageSection: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  plansSection: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  plansTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
  },
  purchaseSection: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  purchaseButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
  },
  purchaseButtonText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  statusActive: {
    fontSize: 16,
    fontWeight: "600",
    color: "#28a745",
    marginBottom: 4,
  },
  statusTrial: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffc107",
    marginBottom: 4,
  },
  statusFree: {
    fontSize: 16,
    color: "#666",
  },
  statusExpiry: {
    fontSize: 14,
    color: "#666",
  },
  managementSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  usageHistoryButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  usageHistoryButtonText: {
    color: Colors.primary[500],
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dc3545",
  },
  cancelButtonText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "600",
  },
  restoreButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  restoreButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  termsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  featureTitle: {
    flex: 2,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  featureChecks: {
    flex: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.primary[500],
  },
});
