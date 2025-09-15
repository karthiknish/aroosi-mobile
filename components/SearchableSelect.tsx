import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme } from "@contexts/ThemeContext";

interface SearchableSelectProps {
  options: string[];
  selectedValue: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  label?: string;
  containerStyle?: object;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  selectedValue,
  placeholder = "Select...",
  onValueChange,
  label,
  containerStyle = {},
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
    setSearchTerm("");
  };

  const { theme } = useTheme();
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.selector,
          {
            borderColor: theme.colors.border.primary,
            backgroundColor: theme.colors.background.primary,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={
            selectedValue
              ? [styles.valueText, { color: theme.colors.text.primary }]
              : [styles.placeholderText, { color: theme.colors.text.secondary }]
          }
        >
          {selectedValue || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <TextInput
            style={[
              styles.searchInput,
              { borderColor: theme.colors.border.primary },
            ]}
            placeholder="Search..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus={true}
          />
          <FlatList
            data={filteredOptions}
            // Use a composite key to avoid duplicate-key warnings when options contain repeated strings
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  { borderBottomColor: theme.colors.border.primary },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  selector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 4,
  },
  placeholderText: {},
  valueText: {},
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingHorizontal: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});

export default SearchableSelect;
