import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSubscription } from "../../../hooks/useSubscription";
import { SUBSCRIPTION_PLANS } from "../../../utils/inAppPurchases";
import { Colors, Layout } from "../../../constants";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "../../../hooks/useResponsive";
import { Ionicons } from "@expo/vector-icons";

interface SubscriptionScreenProps {
  navigation: any;
}

export default function SubscriptionScreen({
  navigation,
}: SubscriptionScreenProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    subscription,
    hasActiveSubscription,
    loading,
    error,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    refreshSubscription,
  } = useSubscription();

  useEffect(() => {
    // Refresh subscription data when screen loads
    refreshSubscription();
  }, []);

  const handlePurchase = async (planId: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const success = await purchaseSubscription(planId);
      if (success) {
        Alert.alert(
          "Success!",
          "Your subscription has been activated. Enjoy your premium features!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          "Purchase Failed",
          "We couldn't process your purchase. Please try again or contact support if the problem persists."
        );
      }
    } catch (error) {
      console.error("Purchase error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(
          "Restored!",
          "Your previous purchases have been restored successfully."
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore."
        );
      }
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert(
        "Restore Failed",
        "We couldn't restore your purchases. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const success = await cancelSubscription();
              if (success) {
                Alert.alert(
                  "Subscription Cancelled",
                  "Your subscription has been cancelled. You'll continue to have access to premium features until the end of your current billing period."
                );
              } else {
                Alert.alert(
                  "Cancellation Failed",
                  "We couldn't cancel your subscription. Please try again or contact support."
                );
              }
            } catch (error) {
              console.error("Cancel error:", error);
              Alert.alert(
                "Error",
                "An unexpected error occurred while cancelling your subscription."
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderFeatureItem = (feature: string, included: boolean) => (
    <View key={feature} style={styles.featureItem}>
      <Ionicons
        name={included ? "checkmark-circle" : "close-circle"}
        size={20}
        color={included ? Colors.success[500] : Colors.neutral[400]}
      />
      <Text
        style={[
          styles.featureText,
          { color: included ? Colors.text.primary : Colors.text.secondary },
        ]}
      >
        {feature}
      </Text>
    </View>
  );

  const renderPlanCard = (plan: any) => {
    const isSelected = selectedPlan === plan.tier;
    const isCurrentPlan = subscription?.plan === plan.tier;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlan,
          isCurrentPlan && styles.currentPlan,
        ]}
        onPress={() => setSelectedPlan(plan.tier)}
        disabled={isCurrentPlan}
      >
        {plan.popularBadge && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>
            £{plan.price}
            <Text style={styles.planDuration}>/{plan.duration}</Text>
          </Text>
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature: string) =>
            renderFeatureItem(feature, true)
          )}
        </View>

        {isCurrentPlan && (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        )}
      </TouchableOpacity>
    );
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
    },
    backButton: {
      padding: spacing.sm,
    },
    headerTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: Colors.text.primary,
    },
    restoreButton: {
      padding: spacing.sm,
    },
    restoreText: {
      fontSize: fontSize.sm,
      color: Colors.primary[500],
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    currentSubscription: {
      backgroundColor: Colors.success[50],
      padding: spacing.md,
      borderRadius: Layout.radius.md,
      marginVertical: spacing.md,
      borderWidth: 1,
      borderColor: Colors.success[200],
    },
    currentSubscriptionTitle: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.success[700],
      marginBottom: spacing.xs,
    },
    currentSubscriptionText: {
      fontSize: fontSize.sm,
      color: Colors.success[600],
    },
    sectionTitle: {
      fontSize: fontSize.xl,
      fontWeight: "600",
      color: Colors.text.primary,
      marginVertical: spacing.lg,
      textAlign: "center",
    },
    plansContainer: {
      gap: spacing.md,
    },
    planCard: {
      backgroundColor: Colors.background.secondary,
      borderRadius: Layout.radius.lg,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: Colors.border.primary,
      position: "relative",
    },
    selectedPlan: {
      borderColor: Colors.primary[500],
      backgroundColor: Colors.primary[50],
    },
    currentPlan: {
      borderColor: Colors.success[500],
      backgroundColor: Colors.success[50],
    },
    popularBadge: {
      position: "absolute",
      top: -spacing.xs,
      left: spacing.lg,
      backgroundColor: Colors.primary[500],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: Layout.radius.full,
    },
    popularText: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      color: Colors.text.inverse,
    },
    planHeader: {
      alignItems: "center",
      marginBottom: spacing.md,
    },
    planName: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    planPrice: {
      fontSize: fontSize["2xl"],
      fontWeight: "800",
      color: Colors.primary[500],
    },
    planDuration: {
      fontSize: fontSize.base,
      fontWeight: "400",
      color: Colors.text.secondary,
    },
    planDescription: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    featuresContainer: {
      gap: spacing.sm,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    featureText: {
      fontSize: fontSize.sm,
      flex: 1,
    },
    currentPlanBadge: {
      backgroundColor: Colors.success[500],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: Layout.radius.full,
      alignSelf: "center",
      marginTop: spacing.md,
    },
    currentPlanText: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      color: Colors.text.inverse,
    },
    actionButtons: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    purchaseButton: {
      backgroundColor: Colors.primary[500],
      paddingVertical: spacing.md,
      borderRadius: Layout.radius.md,
      alignItems: "center",
    },
    purchaseButtonDisabled: {
      backgroundColor: Colors.neutral[300],
    },
    purchaseButtonText: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.text.inverse,
    },
    cancelButton: {
      backgroundColor: Colors.error[500],
      paddingVertical: spacing.md,
      borderRadius: Layout.radius.md,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.text.inverse,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: fontSize.base,
      color: Colors.text.secondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
    },
    errorText: {
      fontSize: fontSize.base,
      color: Colors.error[500],
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: Colors.primary[500],
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: Layout.radius.md,
    },
    retryButtonText: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.text.inverse,
    },
    disclaimer: {
      padding: spacing.lg,
      backgroundColor: Colors.neutral[50],
    },
    disclaimerText: {
      fontSize: fontSize.xs,
      color: Colors.text.tertiary,
      textAlign: "center",
      lineHeight: fontSize.xs * 1.4,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>
            Loading subscription information...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={refreshSubscription}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <TouchableOpacity
          onPress={handleRestore}
          style={styles.restoreButton}
          disabled={isProcessing}
        >
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Subscription Status */}
        {hasActiveSubscription && subscription && (
          <View style={styles.currentSubscription}>
            <Text style={styles.currentSubscriptionTitle}>
              Current Plan:{" "}
              {subscription.plan.charAt(0).toUpperCase() +
                subscription.plan.slice(1)}
            </Text>
            <Text style={styles.currentSubscriptionText}>
              {subscription.daysRemaining > 0
                ? `${subscription.daysRemaining} days remaining`
                : "Expires soon"}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Choose Your Plan</Text>

        {/* Subscription Plans */}
        <View style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.filter((plan) => plan.tier !== "free").map(
            renderPlanCard
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!hasActiveSubscription ? (
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              (isProcessing || !selectedPlan) && styles.purchaseButtonDisabled,
            ]}
            onPress={() => handlePurchase(selectedPlan)}
            disabled={isProcessing || !selectedPlan}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.purchaseButtonText}>
                Subscribe to{" "}
                {SUBSCRIPTION_PLANS.find((p) => p.tier === selectedPlan)?.name}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          {Platform.OS === "ios"
            ? "Subscriptions will be charged to your Apple ID account at the confirmation of purchase. Subscriptions automatically renew unless canceled within 24-hours before the end of the current period. You can manage and cancel your subscriptions by going to your App Store account settings after purchase."
            : "Subscriptions will be charged to your Google Play account at the confirmation of purchase. Subscriptions automatically renew unless canceled within 24-hours before the end of the current period. You can manage and cancel your subscriptions by going to your Google Play account settings after purchase."}
        </Text>
      </View>
    </View>
  );
}
