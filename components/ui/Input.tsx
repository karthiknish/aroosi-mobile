import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  validationState?: 'default' | 'valid' | 'invalid';
  showValidationIcon?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function Input({
  label,
  error,
  hint,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  validationState = 'default',
  showValidationIcon = true,
  accessibilityLabel,
  accessibilityHint,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { fontSize } = useResponsiveTypography();
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error, shakeAnimation]);

  const containerStyles = [
    styles.container,
    containerStyle,
  ];

  const getValidationIcon = () => {
    if (!showValidationIcon) return null;
    
    if (error || validationState === 'invalid') {
      return (
        <Ionicons 
          name="close-circle" 
          size={Layout.getResponsiveFontSize(20)} 
          color={Colors.error[500]} 
        />
      );
    }
    
    if (validationState === 'valid') {
      return (
        <Ionicons 
          name="checkmark-circle" 
          size={Layout.getResponsiveFontSize(20)} 
          color={Colors.success[500]} 
        />
      );
    }
    
    return null;
  };

  const inputContainerStyles = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
    validationState === 'valid' && styles.inputContainerValid,
    multiline && styles.inputContainerMultiline,
  ];

  const inputStyles = [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    multiline && styles.inputMultiline,
    inputStyle,
  ];

  return (
    <Animated.View
      style={[containerStyles, { transform: [{ translateX: shakeAnimation }] }]}
    >
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <View style={inputContainerStyles}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            ...(inputStyles.filter(Boolean) as any[]),
            { fontSize: fontSize.base },
          ]}
          placeholderTextColor={Colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? "top" : "center"}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint || hint}
          accessibilityValue={error ? { text: error } : undefined}
          {...textInputProps}
        />

        {getValidationIcon() && (
          <View style={styles.validationIcon}>{getValidationIcon()}</View>
        )}

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {(error || hint) && (
        <Animated.View style={styles.helpContainer}>
          <Text style={[styles.help, error && styles.helpError]}>
            {error || hint}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.md,
  },
  
  labelContainer: {
    marginBottom: Layout.spacing.xs,
  },
  
  label: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  
  required: {
    color: Colors.error[500],
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.primary,
    minHeight: 44,
  },
  
  inputContainerFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 2,
  },
  
  inputContainerError: {
    borderColor: Colors.error[500],
  },
  
  inputContainerValid: {
    borderColor: Colors.success[500],
  },
  
  inputContainerMultiline: {
    minHeight: 88,
    alignItems: 'flex-start',
    paddingVertical: Layout.spacing.md,
  },
  
  input: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  
  inputWithLeftIcon: {
    paddingLeft: Layout.spacing.xs,
  },
  
  inputWithRightIcon: {
    paddingRight: Layout.spacing.xs,
  },
  
  inputMultiline: {
    minHeight: 60,
    paddingTop: Layout.spacing.sm,
  },
  
  leftIcon: {
    paddingLeft: Layout.spacing.md,
    paddingRight: Layout.spacing.xs,
  },
  
  rightIcon: {
    paddingRight: Layout.spacing.md,
    paddingLeft: Layout.spacing.xs,
  },
  
  validationIcon: {
    paddingRight: Layout.spacing.sm,
  },
  
  helpContainer: {
    marginTop: Layout.spacing.xs,
  },
  
  help: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  
  helpError: {
    color: Colors.error[500],
  },
});