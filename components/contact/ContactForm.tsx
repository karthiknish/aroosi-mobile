import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors, Layout } from '../../constants';
import { useContact } from "@/hooks/useContact";
import { ContactFormData, CONTACT_SUBJECTS } from '../../types/contact';
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";

interface ContactFormProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export default function ContactForm({ onSubmitSuccess, onCancel }: ContactFormProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { isSubmitting, errors, submitContactForm, clearErrors, getInitialFormData } = useContact();
  
  const [formData, setFormData] = useState<ContactFormData>(getInitialFormData());
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      clearErrors();
    }
  };

  const handleSubmit = async () => {
    const result = await submitContactForm(formData);
    
    if (result.success) {
      Alert.alert(
        'Message Sent!',
        'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData(getInitialFormData());
              onSubmitSuccess?.();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Error',
        result.error || 'Failed to send message. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing.xl,
      alignItems: 'center',
    },
    title: {
      fontSize: fontSize['2xl'],
      fontWeight: '700',
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    formSection: {
      marginBottom: spacing.xl,
    },
    inputGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: '600',
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    requiredStar: {
      color: Colors.error[500],
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: Layout.radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.base,
      color: Colors.text.primary,
      backgroundColor: Colors.background.secondary,
      minHeight: 48,
    },
    inputFocused: {
      borderColor: Colors.primary[500],
      borderWidth: 2,
    },
    inputError: {
      borderColor: Colors.error[500],
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: Layout.radius.md,
      backgroundColor: Colors.background.secondary,
      overflow: 'hidden',
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 48,
    },
    pickerButtonText: {
      fontSize: fontSize.base,
      color: Colors.text.primary,
      flex: 1,
    },
    pickerPlaceholder: {
      color: Colors.text.tertiary,
    },
    picker: {
      backgroundColor: Colors.background.secondary,
    },
    errorText: {
      fontSize: fontSize.sm,
      color: Colors.error[500],
      marginTop: spacing.xs,
    },
    generalError: {
      backgroundColor: Colors.error[50],
      borderColor: Colors.error[200],
      borderWidth: 1,
      borderRadius: Layout.radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    generalErrorText: {
      fontSize: fontSize.sm,
      color: Colors.error[700],
      textAlign: 'center',
    },
    buttonContainer: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    submitButton: {
      backgroundColor: Colors.primary[500],
      borderRadius: Layout.radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    submitButtonDisabled: {
      backgroundColor: Colors.neutral[300],
    },
    submitButtonText: {
      fontSize: fontSize.base,
      fontWeight: '600',
      color: Colors.background.primary,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: Layout.radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: fontSize.base,
      fontWeight: '600',
      color: Colors.text.secondary,
    },
    characterCount: {
      fontSize: fontSize.xs,
      color: Colors.text.tertiary,
      textAlign: 'right',
      marginTop: spacing.xs,
    },
    characterCountWarning: {
      color: Colors.warning[600],
    },
    characterCountError: {
      color: Colors.error[500],
    },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>
            Have a question or need help? We're here to assist you.
          </Text>
        </View>

        {/* General Error */}
        {errors.general && (
          <View style={styles.generalError}>
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.name && styles.inputError,
              ]}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.text.tertiary}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.email && styles.inputError,
              ]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email address"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Subject Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Subject <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.pickerContainer, errors.subject && styles.inputError]}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowSubjectPicker(!showSubjectPicker)}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.pickerButtonText,
                  !formData.subject && styles.pickerPlaceholder
                ]}>
                  {formData.subject || 'Select a subject'}
                </Text>
                <Ionicons 
                  name={showSubjectPicker ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={Colors.text.secondary} 
                />
              </TouchableOpacity>
              {showSubjectPicker && (
                <Picker
                  style={styles.picker}
                  selectedValue={formData.subject}
                  onValueChange={(value) => {
                    handleInputChange('subject', value);
                    setShowSubjectPicker(false);
                  }}
                  enabled={!isSubmitting}
                >
                  <Picker.Item label="Select a subject" value="" />
                  {CONTACT_SUBJECTS.map((subject) => (
                    <Picker.Item key={subject} label={subject} value={subject} />
                  ))}
                </Picker>
              )}
            </View>
            {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}
          </View>

          {/* Message Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Message <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                errors.message && styles.inputError,
              ]}
              value={formData.message}
              onChangeText={(value) => handleInputChange('message', value)}
              placeholder="Please describe your question or issue in detail..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoCorrect
              editable={!isSubmitting}
            />
            <Text style={[
              styles.characterCount,
              formData.message.length > 800 && styles.characterCountWarning,
              formData.message.length > 1000 && styles.characterCountError,
            ]}>
              {formData.message.length}/1000
            </Text>
            {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Ionicons name="hourglass" size={16} color={Colors.background.primary} />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}