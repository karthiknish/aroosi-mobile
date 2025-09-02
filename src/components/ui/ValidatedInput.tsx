import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Layout } from '@constants';

export interface ValidatedInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  label?: string;
  field: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  error?: string | null;
  rightAccessory?: React.ReactNode;
  leftAccessory?: React.ReactNode;
  containerStyle?: any;
  inputStyle?: any;
  testID?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  field,
  value,
  onValueChange,
  required,
  hint,
  error,
  rightAccessory,
  leftAccessory,
  containerStyle,
  inputStyle,
  testID,
  ...rest
}) => {
  const showError = !!error;
  const labelNode = label ? (
    <Text style={styles.label}>
      {label} {required ? <Text style={styles.required}>*</Text> : null}
    </Text>
  ) : null;

  return (
    <View style={[styles.container, containerStyle]} testID={testID ?? `vi-${field}`}>
      {labelNode}
      <View
        style={[
          styles.inputWrapper,
          showError ? styles.inputWrapperError : value ? styles.inputWrapperValid : null,
        ]}
        pointerEvents="box-none"
      >
        {leftAccessory ? <View style={styles.accessoryLeft}>{leftAccessory}</View> : null}
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onValueChange}
          placeholderTextColor={Colors.text.tertiary}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...rest}
        />
        {rightAccessory ? <View style={styles.accessoryRight}>{rightAccessory}</View> : null}
      </View>
      {hint && !showError ? <Text style={styles.hint}>{hint}</Text> : null}
      {showError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  required: {
    color: Colors.error[500],
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapperError: {
    borderColor: Colors.error[500],
  },
  inputWrapperValid: {
    borderColor: Colors.success[500],
  },
  input: {
    flex: 1,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  accessoryLeft: {
    marginLeft: Layout.spacing.sm,
  },
  accessoryRight: {
    marginRight: Layout.spacing.sm,
  },
  hint: {
    marginTop: Layout.spacing.xs,
    color: Colors.text.secondary,
    fontSize: Layout.typography.fontSize.sm,
  },
  error: {
    marginTop: Layout.spacing.xs,
    color: Colors.error[500],
    fontSize: Layout.typography.fontSize.sm,
  },
});

export default ValidatedInput;