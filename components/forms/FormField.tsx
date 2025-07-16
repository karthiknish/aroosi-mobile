import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Colors } from "../../constants/Colors";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "../../hooks/useResponsive";

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  containerStyle?: any;
  labelStyle?: any;
  inputStyle?: any;
  errorStyle?: any;
}

export function FormField({
  label,
  error,
  required = false,
  helperText,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  ...textInputProps
}: FormFieldProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.gray[900],
      marginBottom: spacing.sm,
      fontFamily: "NunitoSans-SemiBold",
    },
    required: {
      color: Colors.error[500],
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.gray[300],
      borderRadius: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
      fontSize: fontSize.base,
      backgroundColor: Colors.background.primary,
      fontFamily: "NunitoSans-Regular",
    },
    inputError: {
      borderColor: Colors.error[500],
      backgroundColor: Colors.error[50],
    },
    error: {
      fontSize: fontSize.sm,
      color: Colors.error[500],
      marginTop: spacing.xs,
      fontFamily: "NunitoSans-Regular",
    },
    helperText: {
      fontSize: fontSize.sm,
      color: Colors.gray[600],
      marginTop: spacing.xs,
      fontFamily: "NunitoSans-Regular",
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TextInput
        style={[styles.input, error && styles.inputError, inputStyle]}
        placeholderTextColor={Colors.gray[400]}
        {...textInputProps}
      />

      {error && <Text style={[styles.error, errorStyle]}>{error}</Text>}

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
}


