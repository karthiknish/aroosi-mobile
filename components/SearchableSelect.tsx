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
import { Colors } from "../constants";

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

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedValue ? styles.valueText : styles.placeholderText}>
          {selectedValue || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus={true}
          />
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
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
    color: Colors.gray[700],
    marginBottom: 4,
  },
  selector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  placeholderText: {
    color: Colors.gray[400],
  },
  valueText: {
    color: Colors.gray[800],
  },
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  optionText: {
    fontSize: 16,
    color: Colors.gray[800],
  },
});

export default SearchableSelect;
