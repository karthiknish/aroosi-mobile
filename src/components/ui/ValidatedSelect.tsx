import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Layout } from '@constants';
import SearchableSelect from '@components/SearchableSelect';

// Match the actual SearchableSelect signature:
// interface SearchableSelectProps {
//   options: string[];
//   selectedValue: string;
//   placeholder?: string;
//   onValueChange: (value: string) => void;
//   label?: string;
//   containerStyle?: object;
// }

export interface ValidatedSelectProps {
  label?: string;
  field: string;
  value: string;
  onValueChange: (value: string) => void;
  // Must be a string[] to satisfy SearchableSelect
  options: string[];
  required?: boolean;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  containerStyle?: any;
  selectStyle?: any;
  testID?: string;
  disabled?: boolean;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  field,
  value,
  onValueChange,
  options,
  required,
  hint,
  error,
  placeholder = 'Select...',
  containerStyle,
  selectStyle,
  testID,
  disabled,
}) => {
  const showError = !!error;
  const labelNode = label ? (
    <Text style={styles.label}>
      {label} {required ? <Text style={styles.required}>*</Text> : null}
    </Text>
  ) : null;

  return (
    <View style={[styles.container, containerStyle]} testID={testID ?? `vs-${field}`}>
      {labelNode}
      <View
        style={[
          styles.selectWrapper,
          showError ? styles.selectWrapperError : value ? styles.selectWrapperValid : null,
          disabled ? styles.selectWrapperDisabled : null,
        ]}
        pointerEvents="box-none"
      >
        <SearchableSelect
          options={options}
          selectedValue={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          containerStyle={selectStyle}
        />
      </View>
      {hint && !showError ? <Text style={styles.hint}>{hint}</Text> : null}
      {showError ? (
        <Text nativeID={`${field}-error`} style={styles.error}>
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
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  required: {
    color: Colors.error[500],
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
  },
  selectWrapperError: {
    borderColor: Colors.error[500],
  },
  selectWrapperValid: {
    borderColor: Colors.success?.[500] ?? '#22c55e',
  },
  selectWrapperDisabled: {
    opacity: 0.6,
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

export default ValidatedSelect;