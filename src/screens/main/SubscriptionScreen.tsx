import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@contexts/AuthProvider";
import SubscriptionCard from "@components/subscription/SubscriptionCard";
// UsageDashboard is optional and not wired in this API-based flow
import UpgradeConfirmationModal from "@components/subscription/UpgradeConfirmationModal";
import PaywallModal from "@components/subscription/PaywallModal";
import { Colors, Layout } from "@constants";
import { useToast } from "@/providers/ToastContext";
import { getPlans, getBillingPortalUrl } from "@services/subscriptions";
import type {
  SubscriptionPlan,
  SubscriptionTier,
} from "@/types/subscription";
import { useInAppPurchase } from "@/hooks/useInAppPurchase";
import { PRODUCT_IDS } from "@/types/inAppPurchase";

// Helper to coerce backend ids to SubscriptionTier safely
const asTier = (id: string): SubscriptionTier =>
  id === "free" || id === "premium" || id === "premiumPlus"
    ? (id as SubscriptionTier)
    : ("free" as SubscriptionTier);

interface SubscriptionScreenProps {
  navigation: any;
}

/**
 * Plans will now be loaded from the backend via cookie-auth endpoints
 * using getPlans(). This removes the hard-coded mobile plan list.
 */

export default function SubscriptionScreen({
  navigation,
}: SubscriptionScreenProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetId, setUpgradeTargetId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      features?: string[];
      popular?: boolean;
    }>
  >([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Source of truth for subscription status comes from profile in AuthContext
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const iap = useInAppPurchase();

  const profile = user?.profile as any | null;
  const currentTier: string = profile?.subscriptionPlan ?? "free";
  const subscriptionExpiresAt: number | undefined =
    profile?.subscriptionExpiresAt;
  const now = Date.now();
  const hasActiveSubscription =
    !!subscriptionExpiresAt && subscriptionExpiresAt > now;
  const daysUntilExpiry = hasActiveSubscription
    ? Math.max(
        0,
        Math.ceil((subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
      )
    : 0;

  // Load plans from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPlans(true);
        const p = await getPlans();
        if (mounted) {
          setPlans(p);
        }
      } catch (e: any) {
        toast.show("Unable to load plans. Please try again.", "error");
      } finally {
        setLoadingPlans(false);
      }
    })();
    // Initialize IAP and load products
    (async () => {
      const ok = await iap.initializePurchases();
      if (ok) await iap.loadProducts();
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  // Map plan -> store productId
  const platformKey = Platform.OS === "ios" ? "ios" : "android";
  const getProductIdForPlan = useCallback(
    (planId: string): string | null => {
      if (planId === "premium") return PRODUCT_IDS[platformKey].premium;
      if (planId === "premiumPlus") return PRODUCT_IDS[platformKey].premiumPlus;
      return null; // free plan has no product
    },
    [platformKey]
  );

  // Map plans with IAP price data when available
  const enrichedPlans = useMemo(() => {
    return plans.map((plan) => {
      if (plan.id === "free") return plan;
      const pid = getProductIdForPlan(plan.id);
      const prod = pid
        ? iap.state.products.find((p) => p.productId === pid)
        : undefined;
      if (prod) {
        // Convert string price to minor units if possible; fall back to plan.price
        const numeric = Number(prod.price);
        return {
          ...plan,
          price: Number.isFinite(numeric)
            ? Math.round(numeric * 100)
            : plan.price,
          // keep features/popular as-is
        };
      }
      return plan;
    });
  }, [plans, iap.state.products, getProductIdForPlan]);

  const handlePurchase = async (planId: string) => {
    // If user has an active subscription and selected a different plan, confirm upgrade
    if (hasActiveSubscription && currentTier && currentTier !== planId) {
      setUpgradeTargetId(planId);
      setShowUpgradeModal(true);
      return;
    }
    // IAP purchase flow
    try {
      const pid = getProductIdForPlan(planId);
      if (!pid) return; // free
      setPurchasing(planId);
      const result = await iap.purchaseProduct(pid);
      if (result.success) {
        // Status will update via listener; ensure user refresh
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
        toast.show("Purchase completed.", "success");
      } else if (result.error && result.error.type !== "UserCancel") {
        toast.show(result.error.message || "Purchase failed.", "error");
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleUpgradeConfirm = async (planId: string): Promise<boolean> => {
    try {
      const pid = getProductIdForPlan(planId);
      if (!pid) return false;
      setPurchasing(planId);
      const res = await iap.purchaseProduct(pid);
      if (res.success) {
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
        setShowUpgradeModal(false);
        setUpgradeTargetId(null);
        setSelectedPlanId(null);
        toast.show("Your plan has been upgraded.", "success");
        return true;
      }
      if (res.error && res.error.type !== "UserCancel") {
        toast.show(res.error.message || "Upgrade failed.", "error");
      }
      return false;
    } finally {
      setPurchasing(null);
    }
  };

  const handleCancelSubscription = () => {
    // For IAP-managed subscriptions, open the store's subscription management
    Alert.alert(
      "Cancel Subscription",
      Platform.OS === "ios"
        ? "Manage your subscription in the App Store."
        : "Manage your subscription in Google Play.",
      [
        { text: "Close", style: "cancel" },
        {
          text: "Open",
          style: "default",
          onPress: async () => {
            try {
              if (Platform.OS === "ios") {
                await Linking.openURL(
                  "itms-apps://apps.apple.com/account/subscriptions"
                );
              } else {
                // Optionally include package name params
                await Linking.openURL(
                  "https://play.google.com/store/account/subscriptions"
                );
              }
            } catch {
              // Fallback to Stripe portal if available (for web-managed subs)
              try {
                const { url } = await getBillingPortalUrl();
                if (url) {
                  await Linking.openURL(url);
                } else {
                  toast.show("Could not open subscription settings.", "error");
                }
              } catch {
                toast.show("Could not open subscription settings.", "error");
              }
            }
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    const res = await iap.restorePurchases();
    if (res.success) {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
      toast.show("Purchases restored.", "success");
    } else {
      toast.show("No purchases to restore.", "info");
    }
  };

  // Removed legacy feature table renderer; plans are rendered via SubscriptionCard

  // No separate loading path; current status can render with available profile data

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
              {(currentTier || "free").toUpperCase()} Active
            </Text>
            {daysUntilExpiry > 0 && (
              <Text style={styles.statusExpiry}>
                Renews in {daysUntilExpiry} days
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.statusFree}>Free Plan</Text>
        )}
      </View>

      {/* Usage Dashboard (optional). Integrate when usage data source is available */}

      {/* Subscription Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.plansTitle}>Choose Your Plan</Text>
        {loadingPlans ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        ) : (
          enrichedPlans.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={
                {
                  id: plan.id,
                  tier: plan.id,
                  name: plan.name,
                  description: "",
                  price: (plan.price ?? 0) / 100,
                  currency: Platform.select({ ios: "GBP", android: "GBP" })!,
                  duration: "monthly",
                  features: plan.features ?? [],
                  popularBadge: !!plan.popular,
                } as any
              }
              isSelected={selectedPlanId === plan.id}
              isCurrentPlan={currentTier === plan.id}
              onSelect={(p) => setSelectedPlanId(p.id)}
              disabled={purchasing !== null}
            />
          ))
        )}
      </View>

      {/* Purchase Button */}
  {selectedPlanId && selectedPlanId !== currentTier && selectedPlanId !== "free" && (
        <View style={styles.purchaseSection}>
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={() => handlePurchase(selectedPlanId)}
            disabled={purchasing !== null}
          >
            {purchasing === selectedPlanId ? (
              <ActivityIndicator color={Colors.background.primary} />
            ) : (
              <Text style={styles.purchaseButtonText}>Subscribe</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.purchaseHelpText}>
            You can cancel anytime from Settings. Your plan will auto-renew each
            month.
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
            onPress={async () => {
              handleCancelSubscription();
            }}
          >
            <Text style={styles.cancelButtonText}>Manage/Cancel</Text>
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
          Subscriptions auto-renew until cancelled. Manage your plan in the
          billing portal.
        </Text>
      </View>

      {/* Upgrade Confirmation Modal */}
      {upgradeTargetId && (
        <UpgradeConfirmationModal
          visible={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeTargetId(null);
            setSelectedPlanId(null);
          }}
          currentPlan={
            currentTier
              ? ({
                  id: asTier(currentTier),
                  tier: asTier(currentTier),
                  name:
                    currentTier === "premium"
                      ? "Premium"
                      : currentTier === "premiumPlus"
                      ? "Premium Plus"
                      : "Free",
                  price:
                    currentTier === "premium"
                      ? 14.99
                      : currentTier === "premiumPlus"
                      ? 39.99
                      : 0,
                  currency: "GBP",
                  duration: "monthly",
                  description: "",
                  features: [] as string[],
                } as SubscriptionPlan)
              : null
          }
          targetPlan={
            {
              id: asTier(upgradeTargetId),
              tier: asTier(upgradeTargetId),
              name:
                plans.find((p) => p.id === upgradeTargetId)?.name ||
                upgradeTargetId,
              description: "",
              price:
                (plans.find((p) => p.id === upgradeTargetId)?.price ?? 0) / 100,
              currency: "GBP",
              duration: "monthly",
              features:
                plans.find((p) => p.id === upgradeTargetId)?.features ?? [],
            } as SubscriptionPlan
          }
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
