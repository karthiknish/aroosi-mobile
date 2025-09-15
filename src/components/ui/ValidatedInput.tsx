import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";

export interface ValidatedInputProps
  extends Omit<TextInputProps, "onChangeText" | "value"> {
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
  const { theme } = useTheme();
  const showError = !!error;
  const labelNode = label ? (
    <Text style={[styles.label, { color: theme.colors.text.primary }]}>
      {label}{" "}
      {required ? (
        <Text style={[styles.required, { color: theme.colors.error[500] }]}>
          *
        </Text>
      ) : null}
    </Text>
  ) : null;

  return (
    <View
      style={[styles.container, containerStyle]}
      testID={testID ?? `vi-${field}`}
    >
      {labelNode}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: theme.colors.border.primary,
            backgroundColor: theme.colors.background.secondary,
          },
          showError
            ? { borderColor: theme.colors.error[500] }
            : value
            ? { borderColor: theme.colors.success[500] }
            : null,
        ]}
        pointerEvents="box-none"
      >
        {leftAccessory ? (
          <View style={styles.accessoryLeft}>{leftAccessory}</View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            inputStyle,
            { color: theme.colors.text.primary },
          ]}
          value={value}
          onChangeText={onValueChange}
          placeholderTextColor={theme.colors.text.tertiary}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...rest}
        />
        {rightAccessory ? (
          <View style={styles.accessoryRight}>{rightAccessory}</View>
        ) : null}
      </View>
      {hint && !showError ? (
        <Text style={[styles.hint, { color: theme.colors.text.secondary }]}>
          {hint}
        </Text>
      ) : null}
      {showError ? (
        <Text style={[styles.error, { color: theme.colors.error[500] }]}>
          {error}
        </Text>
      ) : null}
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
    marginBottom: Layout.spacing.xs,
  },
  required: {
    // color provided inline via theme in component
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: Layout.radius.md,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapperError: {
    // borderColor provided inline via theme
  },
  inputWrapperValid: {
    // borderColor provided inline via theme
  },
  input: {
    flex: 1,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
  },
  accessoryLeft: {
    marginLeft: Layout.spacing.sm,
  },
  accessoryRight: {
    marginRight: Layout.spacing.sm,
  },
  hint: {
    marginTop: Layout.spacing.xs,
    fontSize: Layout.typography.fontSize.sm,
  },
  error: {
    marginTop: Layout.spacing.xs,
    fontSize: Layout.typography.fontSize.sm,
  },
});

export default ValidatedInput;