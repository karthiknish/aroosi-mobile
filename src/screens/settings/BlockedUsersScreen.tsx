import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Colors, Layout } from "../../../constants";
import { useBlockedUsers, useUnblockUser } from "../../../hooks/useSafety";
import { BlockedUserWithProfile } from "../../../types/safety";
import LoadingState from "@components/ui/LoadingState";
import EmptyState from "@components/ui/EmptyState";
import ScreenContainer from "@components/common/ScreenContainer";

interface BlockedUsersScreenProps {
  navigation: any;
}

export default function BlockedUsersScreen({
  navigation,
}: BlockedUsersScreenProps) {
  const {
    data: blockedUsers = [],
    isLoading,
    error,
    refetch,
  } = useBlockedUsers();
  const unblockUserMutation = useUnblockUser();

  const handleUnblockUser = (user: BlockedUserWithProfile) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${user.blockedProfile.fullName}? They will be able to see your profile and contact you again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "default",
          onPress: async () => {
            try {
              await unblockUserMutation.mutateAsync({
                blockedUserId: user.blockedUserId,
              });
              Alert.alert(
                "Success",
                `${user.blockedProfile.fullName} has been unblocked.`
              );
            } catch (error) {
              console.error("Error unblocking user:", error);
              Alert.alert("Error", "Failed to unblock user. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleViewSafetyGuidelines = () => {
    navigation.navigate("SafetyGuidelines");
  };

  const formatBlockDate = (timestamp: number | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Blocked yesterday";
    } else if (diffDays < 7) {
      return `Blocked ${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Blocked ${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `Blocked ${months} month${months > 1 ? "s" : ""} ago`;
    }
  };

  const renderBlockedUser = ({ item }: { item: BlockedUserWithProfile }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        {item.blockedProfile.profileImageUrl ? (
          <Image
            source={{ uri: item.blockedProfile.profileImageUrl }}
            style={styles.userImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>👤</Text>
          </View>
        )}

        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.blockedProfile.fullName}</Text>
          <Text style={styles.blockDate}>
            {formatBlockDate(item.createdAt)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblockUser(item)}
        disabled={unblockUserMutation.isPending}
      >
        <Text style={styles.unblockButtonText}>
          {unblockUserMutation.isPending ? "Unblocking..." : "Unblock"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon="shield-checkmark-outline"
        title="No Blocked Users"
        message="You haven't blocked anyone yet. Blocking prevents users from seeing your profile or contacting you."
      />

      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={styles.guidelinesButton}
          onPress={handleViewSafetyGuidelines}
        >
          <Text style={styles.guidelinesButtonText}>
            View Safety Guidelines
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>What does blocking do?</Text>
        <View style={styles.infoList}>
          <Text style={styles.infoItem}>
            • They can't see your profile in search
          </Text>
          <Text style={styles.infoItem}>
            • They can't send you messages or interests
          </Text>
          <Text style={styles.infoItem}>
            • Existing conversations are hidden
          </Text>
          <Text style={styles.infoItem}>
            • You won't see each other's profiles
          </Text>
          <Text style={styles.infoItem}>
            • Blocking is completely reversible
          </Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer
        containerStyle={styles.container}
        contentStyle={styles.contentStyle}
      >
        <LoadingState message="Loading blocked users..." />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer
        containerStyle={styles.container}
        contentStyle={styles.contentStyle}
      >
        <EmptyState
          title="Unable to load blocked users"
          message="Please check your connection and try again."
          actionText="Retry"
          onAction={refetch}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      {blockedUsers.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              You have blocked {blockedUsers.length} user
              {blockedUsers.length !== 1 ? "s" : ""}. They cannot see your
              profile or contact you.
            </Text>
          </View>

          {/* Blocked Users List */}
          <FlatList
            data={blockedUsers}
            renderItem={renderBlockedUser}
            keyExtractor={(item) => item._id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleViewSafetyGuidelines}
            >
              <Text style={styles.footerButtonText}>Safety Guidelines</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  contentStyle: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.xl,
    color: Colors.primary[500],
  },
  headerTitle: {
    flex: 1,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  infoBanner: {
    backgroundColor: Colors.info[50],
    padding: Layout.spacing.md,
    margin: Layout.spacing.lg,
    borderRadius: Layout.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info[500],
  },
  infoBannerText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.info[700],
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Layout.spacing.lg,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Layout.spacing.md,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.md,
  },
  placeholderText: {
    fontSize: 20,
    color: Colors.neutral[500],
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  blockDate: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  unblockButton: {
    backgroundColor: Colors.success[500],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  unblockButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.background.primary,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  emptyActions: {
    alignItems: "center",
    marginVertical: Layout.spacing.xl,
  },
  guidelinesButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  guidelinesButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.background.primary,
  },
  infoSection: {
    backgroundColor: Colors.background.secondary,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    marginTop: Layout.spacing.xl,
  },
  infoTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  infoList: {
    marginLeft: Layout.spacing.sm,
  },
  infoItem: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Layout.spacing.sm,
  },
  footer: {
    padding: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  footerButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
  },
  footerButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "500",
    color: Colors.primary[500],
  },
});