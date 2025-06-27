import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FeatureGate, { useFeatureGate } from '../common/FeatureGate';
import { Colors, Layout } from '../../constants';

/**
 * Example components showing how to use FeatureGate for subscription validation
 */

// Example 1: Basic feature gate for a button
export function SendMessageExample() {
  const handleSendMessage = async () => {
    console.log('Sending message...');
    // Your message sending logic here
  };

  return (
    <FeatureGate
      feature="canInitiateChat"
      onUpgradeRequired={() => {
        // Navigate to subscription screen
        console.log('Navigate to upgrade');
      }}
    >
      <TouchableOpacity style={styles.primaryButton} onPress={handleSendMessage}>
        <Text style={styles.primaryButtonText}>Send Message</Text>
      </TouchableOpacity>
    </FeatureGate>
  );
}

// Example 2: Feature gate with custom fallback
export function ProfileBoostExample() {
  const handleBoostProfile = async () => {
    console.log('Boosting profile...');
    // Your profile boost logic here
  };

  return (
    <FeatureGate
      feature="canBoostProfile"
      fallback={
        <View style={styles.disabledButton}>
          <Text style={styles.disabledButtonText}>
            Boost Profile (Premium Plus Required)
          </Text>
        </View>
      }
    >
      <TouchableOpacity style={styles.boostButton} onPress={handleBoostProfile}>
        <Text style={styles.boostButtonText}>🚀 Boost Profile</Text>
      </TouchableOpacity>
    </FeatureGate>
  );
}

// Example 3: Using the hook for programmatic validation
export function AdvancedFiltersExample() {
  const { withFeatureValidation } = useFeatureGate();

  const handleApplyFilters = withFeatureValidation(
    'canUseAdvancedFilters',
    async (filters: any) => {
      console.log('Applying advanced filters:', filters);
      // Your filter logic here
    },
    {
      showErrorAlert: true,
      onUpgradeRequired: () => {
        console.log('Show upgrade modal');
      },
    }
  );

  return (
    <TouchableOpacity
      style={styles.filterButton}
      onPress={() => handleApplyFilters({ age: [25, 35], location: 'London' })}
    >
      <Text style={styles.filterButtonText}>Apply Advanced Filters</Text>
    </TouchableOpacity>
  );
}

// Example 4: Multiple feature gates in a list
export function FeatureListExample() {
  const features = [
    {
      feature: 'canViewFullProfiles' as const,
      title: 'View Full Profiles',
      description: 'See complete profile information',
      action: () => console.log('Viewing full profile'),
    },
    {
      feature: 'canSeeReadReceipts' as const,
      title: 'Read Receipts',
      description: 'Know when your messages are read',
      action: () => console.log('Checking read receipts'),
    },
    {
      feature: 'canUseIncognitoMode' as const,
      title: 'Incognito Mode',
      description: 'Browse profiles privately',
      action: () => console.log('Enabling incognito mode'),
    },
  ];

  return (
    <View style={styles.featureList}>
      {features.map((item, index) => (
        <FeatureGate
          key={index}
          feature={item.feature}
          showUpgradePrompt={true}
          onUpgradeRequired={() => console.log(`Upgrade for ${item.title}`)}
        >
          <TouchableOpacity style={styles.featureItem} onPress={item.action}>
            <View>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDescription}>{item.description}</Text>
            </View>
            <Text style={styles.featureArrow}>→</Text>
          </TouchableOpacity>
        </FeatureGate>
      ))}
    </View>
  );
}

// Example 5: Conditional rendering based on feature access
export function ConditionalFeatureExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Available Features</Text>
      
      <FeatureGate
        feature="canViewProfileViewers"
        fallback={
          <View style={styles.lockedFeature}>
            <Text style={styles.lockedFeatureText}>
              👁️ See Who Viewed Your Profile (Premium Plus)
            </Text>
          </View>
        }
      >
        <TouchableOpacity
          style={styles.availableFeature}
          onPress={() => console.log('Viewing profile viewers')}
        >
          <Text style={styles.availableFeatureText}>
            👁️ See Who Viewed Your Profile
          </Text>
        </TouchableOpacity>
      </FeatureGate>

      <FeatureGate
        feature="hasSpotlightBadge"
        fallback={
          <View style={styles.lockedFeature}>
            <Text style={styles.lockedFeatureText}>
              ⭐ Spotlight Badge (Premium Plus)
            </Text>
          </View>
        }
      >
        <TouchableOpacity
          style={styles.availableFeature}
          onPress={() => console.log('Managing spotlight badge')}
        >
          <Text style={styles.availableFeatureText}>
            ⭐ Spotlight Badge Active
          </Text>
        </TouchableOpacity>
      </FeatureGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  boostButton: {
    backgroundColor: Colors.secondary[500],
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
  },
  boostButtonText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  disabledButton: {
    backgroundColor: Colors.gray[300],
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
  },
  disabledButtonText: {
    color: Colors.text.secondary,
    fontSize: Layout.typography.fontSize.base,
  },
  filterButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.primary[500],
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
  },
  filterButtonText: {
    color: Colors.primary[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  featureList: {
    gap: Layout.spacing.md,
  },
  featureItem: {
    backgroundColor: Colors.background.primary,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  featureTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  featureDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  featureArrow: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.primary[500],
  },
  availableFeature: {
    backgroundColor: Colors.success[50],
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.success[200],
    marginBottom: Layout.spacing.md,
  },
  availableFeatureText: {
    color: Colors.success[700],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  lockedFeature: {
    backgroundColor: Colors.gray[50],
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: Layout.spacing.md,
  },
  lockedFeatureText: {
    color: Colors.gray[600],
    fontSize: Layout.typography.fontSize.base,
  },
});