import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemedStyles } from "../../contexts/ThemeContext";
import type { Theme } from "../../constants/Theme";
import { useSubscription } from "../../hooks/useSubscription";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import { getSubscriptionFeatures } from "../../utils/subscriptionUtils";
import UsageQuotaCard from "./UsageQuotaCard";
import { LoadingState } from "../error";

interface UsageDashboardProps {
  onUpgradePress: () => void;
}

export default function UsageDashboard({
  onUpgradePress,
}: UsageDashboardProps) {
  const {
    loading,
    usage,
    subscription,
    hasActiveSubscription,
    daysUntilExpiry,
  } = useSubscription();

  const { currentTier } = useFeatureGate();
  const styles = useThemedStyles(createStyles);
  const colors = useThemedStyles((theme: Theme) => theme.colors);

  if (loading) {
    return <LoadingState message="Loading usage data..." />;
  }

  if (!usage) {
    return null;
  }

  const features = getSubscriptionFeatures(currentTier as any);

  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case "free":
        return "Free";
      case "premium":
        return "Premium";
      case "premiumPlus":
        return "Premium Plus";
      default:
        return tier;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isApproachingExpiry = daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Subscription Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>Current Plan</Text>
          <Text style={styles.statusPlan}>
            {getTierDisplayName(currentTier)}
          </Text>
          {hasActiveSubscription && subscription?.expiresAt && (
            <Text style={styles.statusExpiry}>
              {isApproachingExpiry ? "Expires " : "Renews "}
              {formatDate(subscription.expiresAt)}
            </Text>
          )}
        </View>
        {!hasActiveSubscription && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Expiry Warning */}
      {isApproachingExpiry && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color={colors.warning[500]} />
          <Text style={styles.warningText}>
            Your subscription expires in {daysUntilExpiry} day
            {daysUntilExpiry !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            style={styles.renewButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.renewButtonText}>Renew</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Usage Period Info */}
      <View style={styles.periodInfo}>
        <Text style={styles.periodTitle}>Current Period</Text>
        <Text style={styles.periodText}>
          {formatDate(usage.periodStart)} - {formatDate(usage.periodEnd)}
        </Text>
        <Text style={styles.periodSubtext}>
          Resets on {formatDate(usage.periodEnd)}
        </Text>
      </View>

      {/* Usage Quotas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage This Month</Text>

        <UsageQuotaCard
          title="Messages Sent"
          icon="chatbubble-ellipses"
          current={usage.messagesSent}
          max={usage.limits.maxMessages}
          unit="messages"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === "free"}
        />

        <UsageQuotaCard
          title="Interests Sent"
          icon="heart"
          current={usage.interestsSent}
          max={usage.limits.maxInterests}
          unit="interests"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === "free"}
        />

        <UsageQuotaCard
          title="Profile Views"
          icon="eye"
          current={typeof usage.profileViews === 'number' ? usage.profileViews : usage.profileViews.count}
          max={usage.limits.maxProfileViews}
          unit="views"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === "free"}
        />

        <UsageQuotaCard
          title="Searches Performed"
          icon="search"
          current={usage.searchesPerformed}
          max={usage.limits.maxSearches}
          unit="searches"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === "free"}
        />

        <UsageQuotaCard
          title="Profile Boosts"
          icon="trending-up"
          current={usage.profileBoosts}
          max={usage.limits.maxProfileBoosts}
          unit="boosts"
          onUpgradePress={onUpgradePress}
          showWarning={currentTier === "free"}
        />
      </View>

      {/* Premium Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium Features</Text>

        <View style={styles.featuresGrid}>
          <FeatureItem
            title="Advanced Search Filters"
            icon="filter"
            available={features.canUseAdvancedFilters}
            onUpgradePress={onUpgradePress}
          />

          <FeatureItem
            title="See Who Viewed Your Profile"
            icon="eye"
            available={features.canViewProfileViewers}
            onUpgradePress={onUpgradePress}
          />

          <FeatureItem
            title="Read Receipts"
            icon="checkmark-done"
            available={features.canSeeReadReceipts}
            onUpgradePress={onUpgradePress}
          />

          <FeatureItem
            title="See Who Liked You"
            icon="heart"
            available={features.canViewProfileViewers}
            onUpgradePress={onUpgradePress}
          />

          <FeatureItem
            title="Incognito Mode"
            icon="eye-off"
            available={features.canUseIncognitoMode}
            onUpgradePress={onUpgradePress}
          />

          <FeatureItem
            title="Priority Support"
            icon="headset"
            available={features.canAccessPrioritySupport}
            onUpgradePress={onUpgradePress}
          />
        </View>
      </View>

      {/* Upgrade CTA */}
      {!hasActiveSubscription && (
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Unlock All Features</Text>
          <Text style={styles.ctaSubtitle}>
            Upgrade to Premium or Premium Plus for unlimited access
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.ctaButtonText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

interface FeatureItemProps {
  title: string;
  icon: string;
  available: boolean;
  onUpgradePress: () => void;
}

function FeatureItem({
  title,
  icon,
  available,
  onUpgradePress,
}: FeatureItemProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemedStyles((theme: Theme) => theme.colors);
  
  return (
    <View style={[styles.featureItem, !available && styles.featureItemLocked]}>
      <View style={styles.featureIcon}>
        <Ionicons
          name={icon as any}
          size={20}
          color={available ? colors.primary[500] : colors.text.secondary}
        />
        {!available && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color={colors.background.primary} />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.featureTitle,
          !available && styles.featureTitleLocked,
        ]}
      >
        {title}
      </Text>
      {!available && (
        <TouchableOpacity
          style={styles.featureUpgradeButton}
          onPress={onUpgradePress}
        >
          <Text style={styles.featureUpgradeText}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, layout } = theme;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    contentContainer: {
      padding: layout.spacing.md,
      paddingBottom: layout.spacing.md * 2,
    },
    statusHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.background.secondary,
      padding: layout.spacing.md,
      borderRadius: layout.radius.md,
      marginBottom: layout.spacing.md,
    },
    statusInfo: {
      flex: 1,
    },
    statusTitle: {
      fontSize: layout.typography.fontSize.sm,
      color: colors.text.secondary,
      marginBottom: 4,
      fontFamily: layout.typography.fontFamily.sans,
    },
    statusPlan: {
      fontSize: layout.typography.fontSize.lg,
      fontWeight: layout.typography.fontWeight.semibold,
      color: colors.text.primary,
      marginBottom: 2,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    statusExpiry: {
      fontSize: layout.typography.fontSize.xs,
      color: colors.text.secondary,
      fontFamily: layout.typography.fontFamily.sans,
    },
    upgradeButton: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: layout.radius.sm,
    },
    upgradeButtonText: {
      color: colors.background.primary,
      fontSize: layout.typography.fontSize.sm,
      fontWeight: layout.typography.fontWeight.semibold,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    warningCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.warning[50],
      padding: layout.spacing.md,
      borderRadius: layout.radius.md,
      marginBottom: layout.spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning[500],
    },
    warningText: {
      flex: 1,
      marginLeft: 8,
      fontSize: layout.typography.fontSize.sm,
      color: colors.warning[700],
      fontFamily: layout.typography.fontFamily.sans,
    },
    renewButton: {
      backgroundColor: colors.warning[500],
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: layout.radius.sm,
    },
    renewButtonText: {
      color: colors.background.primary,
      fontSize: layout.typography.fontSize.xs,
      fontWeight: layout.typography.fontWeight.semibold,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    periodInfo: {
      backgroundColor: colors.background.secondary,
      padding: layout.spacing.md,
      borderRadius: layout.radius.md,
      marginBottom: layout.spacing.md,
    },
    periodTitle: {
      fontSize: layout.typography.fontSize.base,
      fontWeight: layout.typography.fontWeight.semibold,
      color: colors.text.primary,
      marginBottom: 4,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    periodText: {
      fontSize: layout.typography.fontSize.sm,
      color: colors.text.secondary,
      marginBottom: 2,
      fontFamily: layout.typography.fontFamily.sans,
    },
    periodSubtext: {
      fontSize: layout.typography.fontSize.xs,
      color: colors.text.secondary,
      fontFamily: layout.typography.fontFamily.sans,
    },
    section: {
      marginBottom: layout.spacing.lg,
    },
    sectionTitle: {
      fontSize: layout.typography.fontSize.lg,
      fontWeight: layout.typography.fontWeight.semibold,
      color: colors.text.primary,
      marginBottom: layout.spacing.md,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    featuresGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    featureItem: {
      width: "48%",
      backgroundColor: colors.background.secondary,
      padding: layout.spacing.md,
      borderRadius: layout.radius.md,
      marginBottom: layout.spacing.md,
      alignItems: "center",
    },
    featureItemLocked: {
      opacity: 0.7,
      borderWidth: 1,
      borderColor: colors.border.primary,
      borderStyle: "dashed",
    },
    featureIcon: {
      position: "relative",
      marginBottom: 8,
    },
    lockOverlay: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: colors.text.secondary,
      borderRadius: 8,
      width: 16,
      height: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    featureTitle: {
      fontSize: layout.typography.fontSize.xs,
      textAlign: "center",
      color: colors.text.primary,
      marginBottom: 8,
      fontFamily: layout.typography.fontFamily.sans,
    },
    featureTitleLocked: {
      color: colors.text.secondary,
    },
    featureUpgradeButton: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: layout.radius.xs,
    },
    featureUpgradeText: {
      color: colors.background.primary,
      fontSize: 10,
      fontWeight: layout.typography.fontWeight.semibold,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    ctaSection: {
      backgroundColor: colors.background.secondary,
      padding: layout.spacing.lg,
      borderRadius: layout.radius.md,
      alignItems: "center",
      marginTop: layout.spacing.md,
    },
    ctaTitle: {
      fontSize: layout.typography.fontSize.xl,
      fontWeight: layout.typography.fontWeight.semibold,
      color: colors.text.primary,
      marginBottom: 8,
      textAlign: "center",
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },
    ctaSubtitle: {
      fontSize: layout.typography.fontSize.sm,
      color: colors.text.secondary,
      textAlign: "center",
      marginBottom: layout.spacing.md,
      fontFamily: layout.typography.fontFamily.sans,
    },
    ctaButton: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: layout.radius.sm,
    },
    ctaButtonText: {
      color: colors.background.primary,
      fontSize: layout.typography.fontSize.base,
      fontWeight: layout.typography.fontWeight.semibold,
      fontFamily: layout.typography.fontFamily.sansSemiBold,
    },

  });
};