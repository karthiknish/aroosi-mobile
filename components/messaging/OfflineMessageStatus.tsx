import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useOfflineMessagingHealth } from "../../hooks/useOfflineMessaging";

interface OfflineMessageStatusProps {
  style?: any;
  showDetails?: boolean;
}

/**
 * Component that displays offline messaging status and provides user actions
 */
export const OfflineMessageStatus: React.FC<OfflineMessageStatusProps> = ({
  style,
  showDetails = false,
}) => {
  const { healthStatus, availableActions, stats } = useOfflineMessagingHealth();

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case "healthy":
        return "#4CAF50"; // Green
      case "warning":
        return "#FF9800"; // Orange
      case "error":
        return "#F44336"; // Red
      default:
        return "#757575"; // Gray
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case "healthy":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✗";
      default:
        return "?";
    }
  };

  const handleActionPress = async (action: any) => {
    try {
      await action.action();
      Alert.alert("Success", `${action.label} completed successfully`);
    } catch (error) {
      Alert.alert("Error", `Failed to ${action.label.toLowerCase()}: ${error}`);
    }
  };

  const showDetailsAlert = () => {
    const details = [
      `Status: ${healthStatus.status}`,
      `Online: ${stats.isOnline ? "Yes" : "No"}`,
      `Failed Messages: ${stats.failedMessages}`,
      `Optimistic Messages: ${stats.optimisticMessages}`,
      `Sync In Progress: ${stats.syncInProgress ? "Yes" : "No"}`,
    ];

    if (stats.lastSyncTime > 0) {
      const lastSync = new Date(stats.lastSyncTime).toLocaleTimeString();
      details.push(`Last Sync: ${lastSync}`);
    }

    Alert.alert("Message Status Details", details.join("\n"));
  };

  if (healthStatus.status === "healthy" && !showDetails) {
    return null; // Don't show anything when everything is working fine
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.statusBar, { backgroundColor: getStatusColor() }]}
        onPress={showDetailsAlert}
        activeOpacity={0.7}
      >
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{healthStatus.message}</Text>
        {showDetails && <Text style={styles.detailsText}>Tap for details</Text>}
      </TouchableOpacity>

      {availableActions.length > 0 && (
        <View style={styles.actionsContainer}>
          {availableActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={() => handleActionPress(action)}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showDetails && healthStatus.details.length > 0 && (
        <View style={styles.detailsContainer}>
          {healthStatus.details.map((detail, index) => (
            <Text key={index} style={styles.detailItem}>
              • {detail}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    margin: 8,
    overflow: "hidden",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  statusIcon: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: "white",
    fontWeight: "500",
  },
  detailsText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  actionButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flex: 1,
  },
  actionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  detailsContainer: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  detailItem: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
});

export default OfflineMessageStatus;
