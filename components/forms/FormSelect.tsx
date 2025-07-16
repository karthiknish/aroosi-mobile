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
import { Colors } from "../../constants/Colors";

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
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setIsVisible(false);
  };

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
          color={disabled ? Colors.gray[400] : Colors.gray[600]}
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
                <Ionicons name="close" size={24} color={Colors.gray[600]} />
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
                      color={Colors.primary[500]}
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
  selector: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorError: {
    borderColor: Colors.red[500],
    backgroundColor: Colors.red[50],
  },
  selectorDisabled: {
    backgroundColor: Colors.gray[100],
    borderColor: Colors.gray[200],
  },
  selectorText: {
    fontSize: 16,
    color: Colors.gray[900],
    fontFamily: "NunitoSans-Regular",
  },
  placeholder: {
    color: Colors.gray[400],
  },
  disabledText: {
    color: Colors.gray[400],
  },
  error: {
    fontSize: 14,
    color: Colors.red[500],
    marginTop: 4,
    fontFamily: "NunitoSans-Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.gray[900],
    fontFamily: "NunitoSans-SemiBold",
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  selectedOption: {
    backgroundColor: Colors.primary[50],
  },
  optionText: {
    fontSize: 16,
    color: Colors.gray[900],
    fontFamily: "NunitoSans-Regular",
  },
  selectedOptionText: {
    color: Colors.primary[500],
    fontWeight: "600",
  },
});
