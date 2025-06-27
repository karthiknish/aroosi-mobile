import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Layout } from '../../constants';
import { SubscriptionPlan } from '../../types/subscription';

interface UpgradeConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan | null;
  targetPlan: SubscriptionPlan;
  onConfirm: (planId: string) => Promise<boolean>;
  prorationInfo?: {
    immediateCharge: number;
    nextBillingAmount: number;
    nextBillingDate: string;
    creditsApplied: number;
  };
}

export default function UpgradeConfirmationModal({
  visible,
  onClose,
  currentPlan,
  targetPlan,
  onConfirm,
  prorationInfo,
}: UpgradeConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      const success = await onConfirm(targetPlan.id);
      
      if (success) {
        Alert.alert(
          'Upgrade Successful!',
          `You've successfully upgraded to ${targetPlan.name}. Enjoy your new features!`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'Upgrade Failed',
          'There was an issue processing your upgrade. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Something went wrong during the upgrade process. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isUpgrade = currentPlan && currentPlan.price < targetPlan.price;
  const isDowngrade = currentPlan && currentPlan.price > targetPlan.price;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Change'} Plan
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Plan Comparison */}
          <View style={styles.comparisonSection}>
            <Text style={styles.sectionTitle}>Plan Change Summary</Text>
            
            <View style={styles.planComparison}>
              {currentPlan && (
                <View style={styles.planCard}>
                  <Text style={styles.planLabel}>Current Plan</Text>
                  <Text style={styles.planName}>{currentPlan.name}</Text>
                  <Text style={styles.planPrice}>
                    {formatPrice(currentPlan.price)}/{currentPlan.duration}
                  </Text>
                </View>
              )}
              
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>→</Text>
              </View>
              
              <View style={[styles.planCard, styles.targetPlanCard]}>
                <Text style={styles.planLabel}>New Plan</Text>
                <Text style={[styles.planName, styles.targetPlanName]}>{targetPlan.name}</Text>
                <Text style={[styles.planPrice, styles.targetPlanPrice]}>
                  {formatPrice(targetPlan.price)}/{targetPlan.duration}
                </Text>
              </View>
            </View>
          </View>

          {/* Billing Information */}
          {prorationInfo && (
            <View style={styles.billingSection}>
              <Text style={styles.sectionTitle}>Billing Details</Text>
              
              <View style={styles.billingDetails}>
                {prorationInfo.creditsApplied > 0 && (
                  <View style={styles.billingRow}>
                    <Text style={styles.billingLabel}>Credits Applied</Text>
                    <Text style={styles.billingValue}>
                      -{formatPrice(prorationInfo.creditsApplied)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>
                    {isUpgrade ? 'Immediate Charge' : 'Immediate Refund'}
                  </Text>
                  <Text style={[
                    styles.billingValue,
                    isUpgrade ? styles.chargeAmount : styles.refundAmount
                  ]}>
                    {isUpgrade ? '' : '-'}{formatPrice(Math.abs(prorationInfo.immediateCharge))}
                  </Text>
                </View>
                
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Next Billing Amount</Text>
                  <Text style={styles.billingValue}>
                    {formatPrice(prorationInfo.nextBillingAmount)}
                  </Text>
                </View>
                
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Next Billing Date</Text>
                  <Text style={styles.billingValue}>
                    {formatDate(prorationInfo.nextBillingDate)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Features Comparison */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>What You'll Get</Text>
            
            <View style={styles.featuresList}>
              {targetPlan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureCheckmark}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Important Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Important Notes</Text>
            
            <View style={styles.notesList}>
              <Text style={styles.noteItem}>
                • Your new plan will take effect immediately
              </Text>
              {isUpgrade && (
                <Text style={styles.noteItem}>
                  • You'll be charged the prorated amount for the upgrade
                </Text>
              )}
              {isDowngrade && (
                <Text style={styles.noteItem}>
                  • You'll receive a prorated refund for the downgrade
                </Text>
              )}
              <Text style={styles.noteItem}>
                • You can change or cancel your subscription anytime
              </Text>
              <Text style={styles.noteItem}>
                • All features will be available immediately after confirmation
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isProcessing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.confirmButton, isProcessing && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={Colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Change'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  closeButton: {
    padding: Layout.spacing.sm,
  },
  closeButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  headerTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  comparisonSection: {
    marginBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },
  planComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    alignItems: 'center',
  },
  targetPlanCard: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
  },
  planLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  planName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  targetPlanName: {
    color: Colors.primary[500],
  },
  planPrice: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  targetPlanPrice: {
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  arrowContainer: {
    paddingHorizontal: Layout.spacing.md,
  },
  arrow: {
    fontSize: Layout.typography.fontSize['2xl'],
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.bold,
  },
  billingSection: {
    marginBottom: Layout.spacing.xl,
  },
  billingDetails: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.secondary,
  },
  billingLabel: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  billingValue: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  chargeAmount: {
    color: Colors.error[500],
  },
  refundAmount: {
    color: Colors.success[500],
  },
  featuresSection: {
    marginBottom: Layout.spacing.xl,
  },
  featuresList: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
  featureCheckmark: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.success[500],
    marginRight: Layout.spacing.md,
    fontWeight: Layout.typography.fontWeight.bold,
  },
  featureText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },
  notesSection: {
    marginBottom: Layout.spacing.xl,
  },
  notesList: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  noteItem: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Layout.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  cancelButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
  },
  disabledButton: {
    backgroundColor: Colors.gray[400],
  },
  confirmButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
});