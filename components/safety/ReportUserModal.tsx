import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Layout } from '../../constants';
import { useReportUser } from '../../hooks/useSafety';
import { REPORT_REASONS, REPORT_REASON_DESCRIPTIONS, ReportReason } from '../../types/safety';

interface ReportUserModalProps {
  visible: boolean;
  userId: string;
  userName?: string;
  onClose: () => void;
}

export default function ReportUserModal({
  visible,
  userId,
  userName = 'User',
  onClose,
}: ReportUserModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const reportUserMutation = useReportUser();

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      Alert.alert('Error', 'Please provide a description for your report.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await reportUserMutation.mutateAsync({
        reportedUserId: userId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it within 24-48 hours and take appropriate action if necessary.',
        [{ text: 'OK', onPress: onClose }]
      );

      // Reset form
      setSelectedReason(null);
      setDescription('');
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setDescription('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.cancelButton}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Report User</Text>
          
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.submitButton,
              (!selectedReason || isSubmitting) && styles.submitButtonDisabled
            ]}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.background.primary} />
            ) : (
              <Text style={[
                styles.submitButtonText,
                (!selectedReason || isSubmitting) && styles.submitButtonTextDisabled
              ]}>
                Report
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userInfoTitle}>
              Reporting: {userName}
            </Text>
            <Text style={styles.userInfoSubtitle}>
              Please select the reason for your report. False reports may result in account restrictions.
            </Text>
          </View>

          {/* Reason Selection */}
          <View style={styles.reasonsSection}>
            <Text style={styles.sectionTitle}>What happened?</Text>
            
            {Object.entries(REPORT_REASONS).map(([key, label]) => {
              const reason = key as ReportReason;
              const isSelected = selectedReason === reason;
              
              return (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    isSelected && styles.reasonOptionSelected
                  ]}
                  onPress={() => setSelectedReason(reason)}
                  disabled={isSubmitting}
                >
                  <View style={styles.reasonContent}>
                    <View style={[
                      styles.radioButton,
                      isSelected && styles.radioButtonSelected
                    ]}>
                      {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                    
                    <View style={styles.reasonText}>
                      <Text style={[
                        styles.reasonLabel,
                        isSelected && styles.reasonLabelSelected
                      ]}>
                        {label}
                      </Text>
                      <Text style={styles.reasonDescription}>
                        {REPORT_REASON_DESCRIPTIONS[reason]}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description Input */}
          {selectedReason && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>
                Additional Details
                {selectedReason === 'other' && <Text style={styles.required}> *</Text>}
              </Text>
              
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  selectedReason === 'other' 
                    ? 'Please describe the issue...' 
                    : 'Optional: Provide additional context...'
                }
                multiline
                maxLength={500}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              
              <Text style={styles.characterCount}>
                {description.length}/500 characters
              </Text>
            </View>
          )}

          {/* What Happens Next */}
          <View style={styles.nextStepsSection}>
            <Text style={styles.sectionTitle}>What happens next?</Text>
            <View style={styles.nextStepsList}>
              <Text style={styles.nextStepItem}>
                • Our safety team will review your report within 24-48 hours
              </Text>
              <Text style={styles.nextStepItem}>
                • We may take action against the reported user if violations are found
              </Text>
              <Text style={styles.nextStepItem}>
                • You can continue using the app normally while we investigate
              </Text>
              <Text style={styles.nextStepItem}>
                • Consider blocking the user if you don't want to interact with them
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  cancelButton: {
    padding: Layout.spacing.sm,
  },
  cancelButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
  },
  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  submitButton: {
    backgroundColor: Colors.error[500],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  submitButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  submitButtonTextDisabled: {
    color: Colors.neutral[500],
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  userInfo: {
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  userInfoTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  userInfoSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  reasonsSection: {
    paddingVertical: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  required: {
    color: Colors.error[500],
  },
  reasonOption: {
    marginBottom: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.secondary,
  },
  reasonOptionSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  reasonContent: {
    flexDirection: 'row',
    padding: Layout.spacing.md,
    alignItems: 'flex-start',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.neutral[400],
    marginRight: Layout.spacing.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary[500],
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
  },
  reasonText: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  reasonLabelSelected: {
    color: Colors.primary[700],
  },
  reasonDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  descriptionSection: {
    paddingVertical: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    height: 100,
    marginBottom: Layout.spacing.sm,
  },
  characterCount: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
    textAlign: 'right',
  },
  nextStepsSection: {
    paddingVertical: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  nextStepsList: {
    backgroundColor: Colors.background.secondary,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  nextStepItem: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Layout.spacing.sm,
  },
});