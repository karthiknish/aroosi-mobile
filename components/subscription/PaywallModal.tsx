import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Layout } from '../../constants';

type Plan = {
  id: string;
  name: string;
  price: number; // cents or normalized, caller decides label
  features?: string[];
  popular?: boolean;
};

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: (planId: string) => void;
  plans?: Plan[];
  title?: string;
  subtitle?: string;
  recommendedPlanId?: string;
  loading?: boolean;
}

export default function PaywallModal({
  visible,
  onClose,
  onUpgrade,
  plans = [],
  title = 'Upgrade to unlock features',
  subtitle = 'Choose a plan to get access to premium features.',
  recommendedPlanId,
  loading = false,
}: PaywallModalProps) {
  const recommended = useMemo(() => {
    if (!plans?.length) return null;
    const fromId = plans.find(p => p.id === recommendedPlanId);
    if (fromId) return fromId;
    const fromPopular = plans.find(p => p.popular);
    if (fromPopular) return fromPopular;
    return plans[0];
  }, [plans, recommendedPlanId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary[500]} />
              <Text style={styles.loadingText}>Loading plans…</Text>
            </View>
          ) : plans?.length ? (
            <ScrollView contentContainerStyle={styles.plansList} showsVerticalScrollIndicator={false}>
              {plans.map((plan) => {
                const isRecommended = recommended?.id === plan.id;
                const displayPrice =
                  plan.price > 0
                    ? plan.price >= 100 ? `£${(plan.price / 100).toFixed(2)}/month` : `£${plan.price.toFixed(2)}/month`
                    : 'Free';

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      { borderColor: isRecommended ? Colors.primary[500] : Colors.border.primary },
                      isRecommended && styles.planCardRecommended,
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {isRecommended && <Text style={styles.badge}>Recommended</Text>}
                    </View>
                    <Text style={styles.planPrice}>{displayPrice}</Text>
                    {!!plan.features?.length && (
                      <View style={styles.features}>
                        {plan.features.map((f, idx) => (
                          <Text key={idx} style={styles.featureItem}>• {f}</Text>
                        ))}
                      </View>
                    )}
                    {onUpgrade && (
                      <TouchableOpacity
                        style={[styles.upgradeButton, { backgroundColor: Colors.primary[500] }]}
                        onPress={() => onUpgrade(plan.id)}
                      >
                        <Text style={styles.upgradeText}>Choose {plan.name}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Plan details are unavailable right now. You can still visit the Subscription screen to upgrade.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    maxHeight: '85%',
  },
  title: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  loadingBox: {
    paddingVertical: Layout.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.sm,
    color: Colors.text.secondary,
  },
  // Added missing empty state styles
  emptyBox: {
    paddingVertical: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.text.secondary,
    textAlign: 'center',
    fontSize: Layout.typography.fontSize.base,
  },
  plansList: {
    paddingBottom: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
  },
  planCardRecommended: {
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  badge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.primary[100],
    color: Colors.primary[700],
    fontSize: Layout.typography.fontSize.xs,
    overflow: 'hidden',
  },
  planPrice: {
    marginTop: Layout.spacing.xs,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  features: {
    marginBottom: Layout.spacing.md,
  },
  featureItem: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  upgradeButton: {
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: 'center',
  },
  upgradeText: {
    color: Colors.text.inverse,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  closeButton: {
    marginTop: Layout.spacing.md,
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
  closeText: {
    color: Colors.text.secondary,
    fontSize: Layout.typography.fontSize.base,
  },
});