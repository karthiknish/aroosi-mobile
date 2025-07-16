import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

interface ErrorMessageProps {
  message: string;
  type?: "error" | "warning" | "info";
  onDismiss?: () => void;
  onRetry?: () => void;
  style?: any;
  showIcon?: boolean;
}

export function ErrorMessage({
  message,
  type = "error",
  onDismiss,
  onRetry,
  style,
  showIcon = true,
}: ErrorMessageProps) {
  const getIconName = () => {
    switch (type) {
      case "error":
        return "alert-circle";
      case "warning":
        return "warning";
      case "info":
        return "information-circle";
      default:
        return "alert-circle";
    }
  };

  const getColors = () => {
    switch (type) {
      case "error":
        return {
          background: Colors.red[50],
          border: Colors.red[200],
          text: Colors.red[800],
          icon: Colors.red[500],
        };
      case "warning":
        return {
          background: Colors.yellow[50],
          border: Colors.yellow[200],
          text: Colors.yellow[800],
          icon: Colors.yellow[500],
        };
      case "info":
        return {
          background: Colors.blue[50],
          border: Colors.blue[200],
          text: Colors.blue[800],
          icon: Colors.blue[500],
        };
      default:
        return {
          background: Colors.red[50],
          border: Colors.red[200],
          text: Colors.red[800],
          icon: Colors.red[500],
        };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {showIcon && (
          <Ionicons
            name={getIconName()}
            size={20}
            color={colors.icon}
            style={styles.icon}
          />
        )}
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>

      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    marginRight: 8,
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "NunitoSans-Regular",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "NunitoSans-SemiBold",
  },
  dismissButton: {
    padding: 4,
  },
});
