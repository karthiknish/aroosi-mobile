import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Layout } from '../../constants';
import { rgbaHex } from "@utils/color";
import { useBlockUser, useUnblockUser } from "@/hooks/useSafety";
import { showSuccessToast, showErrorToast } from "@utils/toast";
import PlatformHaptics from "@utils/PlatformHaptics";

interface BlockUserModalProps {
  visible: boolean;
  userId: string;
  userName?: string;
  isBlocked: boolean;
  onClose: () => void;
}

export default function BlockUserModal({
  visible,
  userId,
  userName = "User",
  isBlocked,
  onClose,
}: BlockUserModalProps) {
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();

  const isLoading =
    blockUserMutation.isPending || unblockUserMutation.isPending;

  const handleBlock = async () => {
    try {
      await blockUserMutation.mutateAsync({ blockedUserId: userId });
      await PlatformHaptics.success();
      showSuccessToast("User blocked successfully");
      onClose();
    } catch (error) {
      console.error("Error blocking user:", error);
      await PlatformHaptics.error();
      showErrorToast("Failed to block user. Please try again.");
    }
  };

  const handleUnblock = async () => {
    try {
      await unblockUserMutation.mutateAsync({ blockedUserId: userId });
      await PlatformHaptics.success();
      showSuccessToast("User unblocked successfully");
      onClose();
    } catch (error) {
      console.error("Error unblocking user:", error);
      await PlatformHaptics.error();
      showErrorToast("Failed to unblock user. Please try again.");
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>{isBlocked ? "🔓" : "🚫"}</Text>
            <Text style={styles.headerTitle}>
              {isBlocked ? "Unblock User" : "Block User"}
            </Text>
            <Text style={styles.headerSubtitle}>{userName}</Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isBlocked ? (
              <View>
                <Text style={styles.description}>
                  If you unblock {userName}, they will be able to:
                </Text>

                <View style={styles.effectsList}>
                  <Text style={styles.effectItem}>
                    • See your profile in search results
                  </Text>
                  <Text style={styles.effectItem}>
                    • Send you messages and interests
                  </Text>
                  <Text style={styles.effectItem}>
                    • View your photos and profile details
                  </Text>
                  <Text style={styles.effectItem}>
                    • Contact you if you match again
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 You can block them again at any time if needed.
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.description}>
                  If you block {userName}, the following will happen:
                </Text>

                <View style={styles.effectsList}>
                  <Text style={styles.effectItem}>
                    • They won't be able to see your profile
                  </Text>
                  <Text style={styles.effectItem}>
                    • They can't send you messages or interests
                  </Text>
                  <Text style={styles.effectItem}>
                    • You won't see each other in search results
                  </Text>
                  <Text style={styles.effectItem}>
                    • Any existing conversations will be hidden
                  </Text>
                </View>

                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Blocking is reversible. You can unblock them later if you
                    change your mind.
                  </Text>
                </View>

                <View style={styles.alternativesSection}>
                  <Text style={styles.alternativesTitle}>
                    Consider these alternatives:
                  </Text>
                  <Text style={styles.alternativeItem}>
                    • Report them if they violated community guidelines
                  </Text>
                  <Text style={styles.alternativeItem}>
                    • Adjust your privacy settings to limit who can contact you
                  </Text>
                  <Text style={styles.alternativeItem}>
                    • Simply don't respond to their messages
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isBlocked ? styles.unblockButton : styles.blockButton,
                isLoading && styles.actionButtonDisabled,
              ]}
              onPress={isBlocked ? handleUnblock : handleBlock}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.background.primary}
                />
              ) : (
                <Text
                  style={[
                    styles.actionButtonText,
                    isBlocked
                      ? styles.unblockButtonText
                      : styles.blockButtonText,
                  ]}
                >
                  {isBlocked ? "Unblock" : "Block"}
                </Text>
              )}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
  },
  modal: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.xl,
    width: "100%",
    maxHeight: "80%",
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    paddingVertical: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: Layout.spacing.md,
  },
  headerTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  headerSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  description: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: Layout.spacing.md,
  },
  effectsList: {
    backgroundColor: Colors.background.secondary,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    marginBottom: Layout.spacing.lg,
  },
  effectItem: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Layout.spacing.sm,
  },
  infoBox: {
    backgroundColor: Colors.info[50],
    borderLeftWidth: 4,
    borderLeftColor: Colors.info[500],
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  infoText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.info[700],
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: Colors.warning[50],
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning[500],
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    marginBottom: Layout.spacing.lg,
  },
  warningText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.warning[700],
    lineHeight: 20,
  },
  alternativesSection: {
    marginTop: Layout.spacing.lg,
  },
  alternativesTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  alternativeItem: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Layout.spacing.xs,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    gap: Layout.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "500",
    color: Colors.text.primary,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  blockButton: {
    backgroundColor: Colors.error[500],
  },
  unblockButton: {
    backgroundColor: Colors.success[500],
  },
  actionButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
  },
  blockButtonText: {
    color: Colors.background.primary,
  },
  unblockButtonText: {
    color: Colors.background.primary,
  },
});