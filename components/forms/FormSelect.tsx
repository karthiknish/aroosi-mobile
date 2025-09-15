import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@contexts/ThemeContext";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import { rgbaHex } from "@utils/color";

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  value?: string;
  options: Option[];
  onSelect: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  containerStyle?: any;
  disabled?: boolean;
}

const createStyles = (theme: any, spacing: any, fontSize: any) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: theme.colors.gray[900],
      marginBottom: spacing.sm,
      fontFamily: "NunitoSans-SemiBold",
    },
    required: {
      color: theme.colors.error[500],
    },
    selector: {
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
      borderRadius: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
      backgroundColor: theme.colors.background.primary,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    selectorError: {
      borderColor: theme.colors.error[500],
      backgroundColor: theme.colors.error[50],
    },
    selectorDisabled: {
      backgroundColor: theme.colors.gray[100],
      borderColor: theme.colors.gray[200],
    },
    selectorText: {
      fontSize: fontSize.base,
      color: theme.colors.gray[900],
      fontFamily: "NunitoSans-Regular",
    },
    placeholder: {
      color: theme.colors.gray[400],
    },
    disabledText: {
      color: theme.colors.gray[400],
    },
    error: {
      fontSize: fontSize.sm,
      color: theme.colors.error[500],
      marginTop: spacing.xs,
      fontFamily: "NunitoSans-Regular",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: rgbaHex(theme.colors.text.primary, 0.5),
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: spacing.lg - spacing.xs,
      borderTopRightRadius: spacing.lg - spacing.xs,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg - spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: theme.colors.gray[900],
      fontFamily: "NunitoSans-SemiBold",
    },
    closeButton: {
      padding: spacing.xs,
    },
    option: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg - spacing.xs,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    selectedOption: {
      backgroundColor: theme.colors.primary[50],
    },
    optionText: {
      fontSize: fontSize.base,
      color: theme.colors.gray[900],
      fontFamily: "NunitoSans-Regular",
    },
    selectedOptionText: {
      color: theme.colors.primary[500],
      fontWeight: "600",
    },
  });

export function FormSelect({
  label,
  value,
  options,
  onSelect,
  error,
  required = false,
  placeholder = "Select an option",
  containerStyle,
  disabled = false,
}: FormSelectProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { theme } = useTheme();
  const styles = createStyles(theme, spacing, fontSize);
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setIsVisible(false);
  };

  const base = {
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: theme.colors.gray[900],
      marginBottom: spacing.sm,
      fontFamily: "NunitoSans-SemiBold",
    },
    required: {
      color: theme.colors.error[500],
    },
    selector: {
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
      borderRadius: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
      backgroundColor: theme.colors.background.primary,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    selectorError: {
      borderColor: theme.colors.error[500],
      backgroundColor: theme.colors.error[50],
    },
    selectorDisabled: {
      backgroundColor: theme.colors.gray[100],
      borderColor: theme.colors.gray[200],
    },
    selectorText: {
      fontSize: fontSize.base,
      color: theme.colors.gray[900],
      fontFamily: "NunitoSans-Regular",
    },
    placeholder: {
      color: theme.colors.gray[400],
    },
    disabledText: {
      color: theme.colors.gray[400],
    },
    error: {
      fontSize: fontSize.sm,
      color: theme.colors.error[500],
      marginTop: spacing.xs,
      fontFamily: "NunitoSans-Regular",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: rgbaHex(theme.colors.text.primary, 0.5),
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: spacing.lg - spacing.xs,
      borderTopRightRadius: spacing.lg - spacing.xs,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg - spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      color: theme.colors.gray[900],
      fontFamily: "NunitoSans-SemiBold",
    },
    closeButton: {
      padding: spacing.xs,
    },
    option: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg - spacing.xs,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    selectedOption: {
      backgroundColor: theme.colors.primary[50],
    },
    optionText: {
      fontSize: fontSize.base,
      color: theme.colors.gray[900],
      fontFamily: "NunitoSans-Regular",
    },
    selectedOptionText: {
      color: theme.colors.primary[500],
      fontWeight: "600",
    },
  } as const;

  // keep base for readability; actual styles are created via createStyles above

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedOption && styles.placeholder,
            disabled && styles.disabledText,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? theme.colors.gray[400] : theme.colors.gray[600]}
        />
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.gray[600]}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary[500]}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}


