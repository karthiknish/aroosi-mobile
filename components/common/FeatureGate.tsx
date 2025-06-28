import React, { ReactElement, cloneElement } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { useSubscription } from '../../hooks/useSubscription';
import { SubscriptionFeatures } from '../../types/subscription';
import { Colors, Layout } from '../../constants';

interface FeatureGateProps {
  children: ReactElement;
  feature: keyof SubscriptionFeatures;
  fallback?: ReactElement;
  showUpgradePrompt?: boolean;
  onUpgradeRequired?: () => void;
  disabled?: boolean;
}

/**
 * FeatureGate component that wraps UI elements with subscription feature validation
 * 
 * @param children - The UI element to wrap (must be a single ReactElement)
 * @param feature - The feature to check access for
 * @param fallback - Optional fallback component to show when feature is not available
 * @param showUpgradePrompt - Whether to show upgrade prompt when feature is not available
 * @param onUpgradeRequired - Callback when upgrade is required
 * @param disabled - Whether to disable the feature gate (always allow access)
 */
export default function FeatureGate({
  children,
  feature,
  fallback,
  showUpgradePrompt = true,
  onUpgradeRequired,
  disabled = false,
}: FeatureGateProps) {
  const { validateAndExecute, canAccessFeature } = useFeatureAccess();
  const { hasActiveSubscription } = useSubscription();

  // If disabled, render children as-is
  if (disabled) {
    return children;
  }

  const hasAccess = canAccessFeature(feature);

  // If user has access, enhance the children with validation
  if (hasAccess) {
    const enhancedChildren = cloneElement(children, {
      onPress: async (...args: any[]) => {
        // Get the original onPress handler
        const originalOnPress = (children.props as any).onPress;
        
        if (originalOnPress) {
          // Wrap the original handler with feature validation
          await validateAndExecute(
            feature,
            async () => {
              return originalOnPress(...args);
            },
            {
              showErrorAlert: true,
              onUpgradeRequired,
            }
          );
        }
      },
    } as any);

    return enhancedChildren;
  }

  // If user doesn't have access, show fallback or upgrade prompt
  if (fallback) {
    return fallback;
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePromptButton
        feature={feature}
        onUpgrade={onUpgradeRequired}
        originalChildren={children}
      />
    );
  }

  // Default: render disabled version of children
  const disabledChildren = cloneElement(children, {
    disabled: true,
    style: [
      (children.props as any).style,
      styles.disabledElement,
    ],
  } as any);

  return disabledChildren;
}

interface UpgradePromptButtonProps {
  feature: keyof SubscriptionFeatures;
  onUpgrade?: () => void;
  originalChildren: ReactElement;
}

function UpgradePromptButton({ feature, onUpgrade, originalChildren }: UpgradePromptButtonProps) {
  const { hasActiveSubscription } = useSubscription();

  const getFeatureDisplayName = (feature: keyof SubscriptionFeatures): string => {
    const displayNames: Record<string, string> = {
      canInitiateChat: 'Start Conversations',
      canSendUnlimitedLikes: 'Unlimited Likes',
      canViewFullProfiles: 'View Full Profiles',
      canBoostProfile: 'Profile Boost',
      canViewProfileViewers: 'See Profile Viewers',
      canUseAdvancedFilters: 'Advanced Filters',
      canUseIncognitoMode: 'Incognito Mode',
      canAccessPrioritySupport: 'Priority Support',
      canSeeReadReceipts: 'Read Receipts',
      hasSpotlightBadge: 'Spotlight Badge',
    };

    return displayNames[feature as string] || 'Premium Feature';
  };

  const getRequiredTier = (feature: keyof SubscriptionFeatures): string => {
    const premiumPlusFeatures = [
      'canBoostProfile',
      'canViewProfileViewers', 
      'canUseAdvancedFilters',
      'canUseIncognitoMode',
      'hasSpotlightBadge'
    ];

    return premiumPlusFeatures.includes(feature as string) ? 'Premium Plus' : 'Premium';
  };

  const handleUpgradePress = () => {
    if (onUpgrade) {
      onUpgrade();
    }
  };

  return (
    <TouchableOpacity
      style={[
        (originalChildren.props as any).style,
        styles.upgradePromptButton,
      ]}
      onPress={handleUpgradePress}
    >
      <View style={styles.upgradePromptContent}>
        <Text style={styles.upgradePromptTitle}>
          {getFeatureDisplayName(feature)}
        </Text>
        <Text style={styles.upgradePromptSubtitle}>
          Upgrade to {getRequiredTier(feature)} to unlock
        </Text>
        <View style={styles.upgradePromptBadge}>
          <Text style={styles.upgradePromptBadgeText}>
            {hasActiveSubscription ? 'UPGRADE' : 'PREMIUM'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Hook for programmatic feature validation
 */
export function useFeatureGate() {
  const { validateAndExecute, checkFeatureAccess } = useFeatureAccess();

  const withFeatureValidation = <T extends any[]>(
    feature: keyof SubscriptionFeatures,
    action: (...args: T) => Promise<any> | any,
    options?: {
      showErrorAlert?: boolean;
      onUpgradeRequired?: () => void;
    }
  ) => {
    return async (...args: T) => {
      return validateAndExecute(
        feature,
        async () => action(...args),
        options
      );
    };
  };

  return {
    withFeatureValidation,
    checkFeatureAccess,
  };
}

const styles = StyleSheet.create({
  disabledElement: {
    opacity: 0.5,
  },
  upgradePromptButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderStyle: 'dashed',
    padding: Layout.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  upgradePromptContent: {
    alignItems: 'center',
  },
  upgradePromptTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
    textAlign: 'center',
  },
  upgradePromptSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  upgradePromptBadge: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },
  upgradePromptBadgeText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
});