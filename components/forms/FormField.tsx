import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Colors } from "../../constants/Colors";

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

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.gray[900],
    marginBottom: 8,
    fontFamily: "NunitoSans-SemiBold",
  },
  required: {
    color: Colors.red[500],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
    fontFamily: "NunitoSans-Regular",
  },
  inputError: {
    borderColor: Colors.red[500],
    backgroundColor: Colors.red[50],
  },
  error: {
    fontSize: 14,
    color: Colors.red[500],
    marginTop: 4,
    fontFamily: "NunitoSans-Regular",
  },
  helperText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 4,
    fontFamily: "NunitoSans-Regular",
  },
});
