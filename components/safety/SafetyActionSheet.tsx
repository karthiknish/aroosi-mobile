import {
  useBlockUser,
  useUnblockUser,
  useBlockStatus,
} from "@/hooks/useSafety";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { showSuccessToast, showErrorToast } from "@utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors, Layout } from "../../constants";
import { rgbaHex } from "@utils/color";
import PlatformHaptics from "../../utils/PlatformHaptics";

interface SafetyActionSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  isBlocked?: boolean;
  onReport?: (userId: string, userName: string) => void;
}

export default function SafetyActionSheet({
  visible,
  onClose,
  userId,
  userName,
  isBlocked = false,
  onReport,
}: SafetyActionSheetProps) {
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();
  const { data: blockStatus } = useBlockStatus(userId);

  const actualIsBlocked = blockStatus?.isBlocked ?? isBlocked;
  const isBlockedBy = blockStatus?.isBlockedBy ?? false;
  const blocking = blockUserMutation.isPending || unblockUserMutation.isPending;

  const handleReport = () => {
    if (!userId) return;
    // Prevent self-reporting (cannot easily access current user id here unless passed; left as placeholder if needed)
    onClose();
    if (onReport) {
      onReport(userId, userName);
    } else {
      // Fallback to expo-router route if available
      try {
        router.push({ pathname: "/report-user", params: { userId, userName } });
      } catch {
        // no-op
      }
    }
  };

  const handleBlock = async () => {
    onClose();

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${userName}? They won't be able to see your profile or contact you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await PlatformHaptics.medium();
              if (!userId) return;
              await blockUserMutation.mutateAsync({ blockedUserId: userId });
              await PlatformHaptics.success();
              showSuccessToast("User blocked successfully");
            } catch (error) {
              console.error("Error blocking user:", error);
              await PlatformHaptics.error();
              showErrorToast("Failed to block user. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleUnblock = async () => {
    onClose();

    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${userName}? They will be able to see your profile and contact you again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "default",
          onPress: async () => {
            try {
              await PlatformHaptics.medium();
              if (!userId) return;
              await unblockUserMutation.mutateAsync({ blockedUserId: userId });
              await PlatformHaptics.success();
              showSuccessToast("User unblocked successfully");
            } catch (error) {
              console.error("Error unblocking user:", error);
              await PlatformHaptics.error();
              showErrorToast("Failed to unblock user. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleSafetyGuidelines = () => {
    onClose();
    router.push("/safety-guidelines");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.actionSheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Safety Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleReport}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: Colors.error[100] },
                ]}
              >
                <Ionicons
                  name="flag-outline"
                  size={20}
                  color={Colors.error[500]}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Report User</Text>
                <Text style={styles.actionDescription}>
                  Report inappropriate behavior or content
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.neutral[400]}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            {actualIsBlocked ? (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleUnblock}
                activeOpacity={0.7}
                disabled={blocking}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: Colors.success[100] },
                  ]}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={Colors.success[500]}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Unblock User</Text>
                  <Text style={styles.actionDescription}>
                    Allow this user to contact you again
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.neutral[400]}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleBlock}
                activeOpacity={0.7}
                disabled={blocking}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: Colors.error[100] },
                  ]}
                >
                  <Ionicons
                    name="ban-outline"
                    size={20}
                    color={Colors.error[500]}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Block User</Text>
                  <Text style={styles.actionDescription}>
                    Prevent this user from contacting you
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.neutral[400]}
                />
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleSafetyGuidelines}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: Colors.info[100] },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={Colors.info[500]}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Safety Guidelines</Text>
                <Text style={styles.actionDescription}>
                  Learn about staying safe on our platform
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.neutral[400]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: rgbaHex(Colors.text.primary, 0.5),
    justifyContent: "flex-end",
  },

  backdrop: {
    flex: 1,
  },

  actionSheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    maxHeight: "80%",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  closeButton: {
    padding: Layout.spacing.xs,
  },

  actions: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },

  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.md,
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.md,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  actionDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.sm,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border.primary,
    marginVertical: Layout.spacing.sm,
  },
});
