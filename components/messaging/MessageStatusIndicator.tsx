import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants";
import { MessageStatus } from "../../types/message";

interface MessageStatusIndicatorProps {
  status?: MessageStatus;
  isOwnMessage: boolean;
  readAt?: number;
  style?: any;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status = "pending",
  isOwnMessage,
  readAt,
  style,
}) => {
  if (!isOwnMessage) {
    return null; // Only show status for own messages
  }

  const getStatusIcon = () => {
    if (readAt) {
      return "✓✓"; // Read receipt
    }

    switch (status) {
      case "pending":
        return "⏳";
      case "sent":
        return "✓";
      case "delivered":
        return "✓";
      case "read":
        return "✓✓";
      case "failed":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStatusColor = () => {
    if (readAt) {
      return Colors.primary[400]; // Blue for read
    }

    switch (status) {
      case "pending":
        return Colors.text.tertiary;
      case "sent":
        return Colors.text.tertiary;
      case "delivered":
        return Colors.text.tertiary;
      case "read":
        return Colors.primary[400];
      case "failed":
        return Colors.error[500];
      default:
        return Colors.text.tertiary;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.statusIcon, { color: getStatusColor() }]}>
        {getStatusIcon()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    justifyContent: "center",
  },
  statusIcon: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default MessageStatusIndicator;
