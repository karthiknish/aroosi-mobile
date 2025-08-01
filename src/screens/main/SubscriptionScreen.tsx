import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSubscription } from "../../../hooks/useSubscription";
import SubscriptionCard from "@components/subscription/SubscriptionCard";
import UsageDashboard from "@components/subscription/UsageDashboard";
import UpgradeConfirmationModal from "@components/subscription/UpgradeConfirmationModal";
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
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Something went wrong. Please try again later.";
      Alert.alert("Error", message, [{ text: "OK" }]);
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
    } catch (error: any) {
      console.error("Upgrade error:", error);
      Alert.alert(
        "Upgrade Error",
        typeof error?.message === "string"
          ? error.message
          : "An unexpected error occurred while upgrading.",
        [{ text: "OK" }]
      );
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
    try {
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
    } catch (error: any) {
      Alert.alert(
        "Restore Error",
        typeof error?.message === "string"
          ? error.message
          : "We couldn't restore purchases at this time.",
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </View>
    );
  }

  return (
    <>
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
              <ActivityIndicator color={Colors.background.primary} />
            ) : (
              <Text style={styles.purchaseButtonText}>
                Subscribe to {selectedPlan.name} - £
                {selectedPlan.price.toFixed(2)}/month
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.purchaseHelpText}>
            You can cancel anytime from Settings. Your plan will auto-renew each month.
          </Text>
        </View>
      )}

      {/* Management Section */}
      <View style={styles.managementSection}>
        <TouchableOpacity
          style={styles.usageHistoryButton}
          onPress={() => navigation.navigate("UsageHistory")}
        >
          <Text style={styles.usageHistoryButtonText}>View Usage History</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
  },
  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 50,
  },
  statusCard: {
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
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
    fontFamily: Layout.typography.fontFamily.serif,
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
  purchaseHelpText: {
    marginTop: Layout.spacing.sm,
    textAlign: "center",
    color: Colors.text.secondary,
    fontSize: Layout.typography.fontSize.sm,
  },
  statusTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  statusActive: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.success[500],
    marginBottom: Layout.spacing.xs,
  },
  statusTrial: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.warning[500],
    marginBottom: Layout.spacing.xs,
  },
  statusFree: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  statusExpiry: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  managementSection: {
    paddingHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
  },
  usageHistoryButton: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  usageHistoryButtonText: {
    color: Colors.primary[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  cancelButton: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.error[500],
  },
  cancelButtonText: {
    color: Colors.error[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  restoreButton: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  restoreButtonText: {
    color: Colors.primary[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  termsSection: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  termsText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
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
  // loading styles defined later after removing duplicates
});
