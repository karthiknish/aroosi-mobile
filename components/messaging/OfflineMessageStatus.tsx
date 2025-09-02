import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useOfflineMessagingHealth } from "@/hooks/useOfflineMessaging";
import { useToast } from "../../contexts/ToastContext";
import { Colors, Layout } from "@constants";
import { rgbaHex } from "@utils/color";

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
  const toast = useToast();
  const [expanded, setExpanded] = useState<boolean>(showDetails);

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case "healthy":
        return Colors.success[500];
      case "warning":
        return Colors.warning[500];
      case "error":
        return Colors.error[500];
      default:
        return Colors.neutral[500];
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
      // Use a conservative toast API: .add or .notify; avoid .show which may not exist in typing
      const msg = `${action.label} completed successfully`;
      // @ts-ignore
      if (typeof (toast as any)?.add === "function") {
        // @ts-ignore
        (toast as any).add({ message: msg, type: "success" });
        // @ts-ignore
      } else if (typeof (toast as any)?.notify === "function") {
        // @ts-ignore
        (toast as any).notify({ message: msg, type: "success" });
      }
    } catch (error: any) {
      const errMsg =
        typeof error === "string" ? error : error?.message || "Unknown error";
      const msg = `Failed to ${action.label.toLowerCase()}: ${errMsg}`;
      // @ts-ignore
      if (typeof (toast as any)?.add === "function") {
        // @ts-ignore
        (toast as any).add({ message: msg, type: "danger" });
        // @ts-ignore
      } else if (typeof (toast as any)?.notify === "function") {
        // @ts-ignore
        (toast as any).notify({ message: msg, type: "danger" });
      }
    }
  };

  const toggleDetails = () => {
    setExpanded((v) => !v);
  };

  if (healthStatus.status === "healthy" && !showDetails) {
    return null; // Don't show anything when everything is working fine
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.statusBar, { backgroundColor: getStatusColor() }]}
        onPress={toggleDetails}
        activeOpacity={0.7}
      >
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{healthStatus.message}</Text>
        <Text style={styles.detailsText}>
          {expanded ? "Hide details" : "Tap for details"}
        </Text>
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

      {expanded && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailItem}>• Status: {healthStatus.status}</Text>
          <Text style={styles.detailItem}>
            • Online: {stats.isOnline ? "Yes" : "No"}
          </Text>
          <Text style={styles.detailItem}>
            • Failed Messages: {stats.failedMessages}
          </Text>
          <Text style={styles.detailItem}>
            • Optimistic Messages: {stats.optimisticMessages}
          </Text>
          <Text style={styles.detailItem}>
            • Sync In Progress: {stats.syncInProgress ? "Yes" : "No"}
          </Text>
          {stats.lastSyncTime > 0 && (
            <Text style={styles.detailItem}>
              • Last Sync: {new Date(stats.lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
          {healthStatus.details.length > 0 &&
            healthStatus.details.map((detail, index) => (
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
    backgroundColor: Colors.background.secondary,
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
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.inverse,
    fontWeight: "bold",
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.inverse,
    fontWeight: "500",
  },
  detailsText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.inverse,
    fontStyle: "italic",
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  actionButton: {
    backgroundColor: Colors.info[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flex: 1,
  },
  actionText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: "500",
    textAlign: "center",
  },
  detailsContainer: {
    padding: 12,
    backgroundColor: rgbaHex(Colors.text.primary, 0.05),
  },
  detailItem: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
});

export default OfflineMessageStatus;
