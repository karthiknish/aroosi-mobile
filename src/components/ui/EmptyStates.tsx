import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

interface SpecificEmptyStateProps {
  onActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "📭",
  title,
  message,
  actionText,
  onActionPress,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
        {message}
      </Text>
      {actionText && onActionPress && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={onActionPress}
        >
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const NoSearchResults: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="🔍"
    title="No matches found"
    message="We couldn't find any profiles matching your search criteria. Try adjusting your filters or check back later for new members."
    actionText="Adjust Filters"
    onActionPress={onActionPress}
  />
);

export const NoMatches: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="💕"
    title="No matches yet"
    message="Start browsing profiles to find your perfect match. Send interests to people you like and they might send one back!"
    actionText="Start Browsing"
    onActionPress={onActionPress}
  />
);

export const NoMessages: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="💬"
    title="No conversations yet"
    message="When you match with someone, you'll be able to start a conversation here. Get out there and start connecting!"
    actionText="Find Matches"
    onActionPress={onActionPress}
  />
);

export const NoPhotos: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="📷"
    title="No photos uploaded"
    message="Add photos to your profile to get more matches. Profiles with photos get 10x more attention!"
    actionText="Add Photos"
    onActionPress={onActionPress}
  />
);

export const NoInterests: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="💖"
    title="No interests sent"
    message="You haven't sent any interests yet. Browse profiles and send interests to people you'd like to connect with."
    actionText="Browse Profiles"
    onActionPress={onActionPress}
  />
);

export const NoProfileViewers: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="👀"
    title="No profile views yet"
    message="No one has viewed your profile recently. Try updating your photos or boosting your profile to get more visibility."
    actionText="Boost Profile"
    onActionPress={onActionPress}
  />
);

export const NoBlockedUsers: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="🛡️"
    title="No blocked users"
    message="You haven't blocked anyone yet. This is where you can manage users you've blocked for safety reasons."
    actionText="Safety Guidelines"
    onActionPress={onActionPress}
  />
);

export const NetworkError: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="📶"
    title="Connection problem"
    message="We're having trouble connecting to our servers. Please check your internet connection and try again."
    actionText="Try Again"
    onActionPress={onActionPress}
  />
);

export const UnauthorizedAccess: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="🔒"
    title="Access restricted"
    message="You need to upgrade to Premium to access this feature. Unlock unlimited messaging and advanced filters."
    actionText="Upgrade Now"
    onActionPress={onActionPress}
  />
);

export const ProfileIncomplete: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="⚠️"
    title="Complete your profile"
    message="You need to complete your profile before you can access this feature. It only takes a few minutes!"
    actionText="Complete Profile"
    onActionPress={onActionPress}
  />
);

export const NoPermission: React.FC<SpecificEmptyStateProps> = ({
  onActionPress,
}) => (
  <EmptyState
    icon="🚫"
    title="Permission required"
    message="This app needs permission to access this feature. Please grant the necessary permissions in your device settings."
    actionText="Open Settings"
    onActionPress={onActionPress}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
