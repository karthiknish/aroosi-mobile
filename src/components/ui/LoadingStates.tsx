import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ViewStyle,
} from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Colors } from "@constants";

const { width } = Dimensions.get("window");

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  style?: ViewStyle;
}

interface FullScreenLoadingProps {
  message?: string;
  showBackdrop?: boolean;
}

interface SkeletonLoadingProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface ProfileCardSkeletonProps {
  count?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  color,
  style,
}) => {
  const { theme } = useTheme();
  const spinnerColor = color || theme.colors.primary[500];

  return <ActivityIndicator size={size} color={spinnerColor} style={style} />;
};

export const FullScreenLoading: React.FC<FullScreenLoadingProps> = ({
  message = "Loading...",
  showBackdrop = true,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.fullScreenContainer,
        {
          backgroundColor: showBackdrop
            ? theme.colors.background.primary
            : "transparent",
        },
      ]}
    >
      <LoadingSpinner size="large" />
      <Text
        style={[styles.loadingText, { color: theme.colors.text.secondary }]}
      >
        {message}
      </Text>
    </View>
  );
};

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          overflow: "hidden",
          backgroundColor: theme.colors.neutral[200],
        },
        styles.skeleton,
        style,
      ]}
    />
  );
};

export const ProfileCardSkeleton: React.FC<ProfileCardSkeletonProps> = ({
  count = 1,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.profileCardSkeleton,
            { backgroundColor: theme.colors.background.secondary },
          ]}
        >
          {/* Image placeholder */}
          <SkeletonLoading
            width={width - 32}
            height={(width - 32) * 0.75}
            borderRadius={12}
            style={{ marginBottom: 12 }}
          />

          {/* Name placeholder */}
          <SkeletonLoading
            width="60%"
            height={24}
            style={{ marginBottom: 8 }}
          />

          {/* Details placeholder */}
          <SkeletonLoading
            width="80%"
            height={16}
            style={{ marginBottom: 6 }}
          />
          <SkeletonLoading
            width="70%"
            height={16}
            style={{ marginBottom: 12 }}
          />

          {/* Button placeholders */}
          <View style={styles.buttonRow}>
            <SkeletonLoading width="45%" height={36} borderRadius={18} />
            <SkeletonLoading width="45%" height={36} borderRadius={18} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const ChatListSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.chatListContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.chatItemSkeleton,
            { borderBottomColor: theme.colors.border.primary },
          ]}
        >
          {/* Avatar */}
          <SkeletonLoading
            width={50}
            height={50}
            borderRadius={25}
            style={{ marginRight: 12 }}
          />

          <View style={styles.chatItemContent}>
            {/* Name */}
            <SkeletonLoading
              width="40%"
              height={18}
              style={{ marginBottom: 6 }}
            />

            {/* Last message */}
            <SkeletonLoading width="80%" height={14} />
          </View>

          {/* Time */}
          <SkeletonLoading width={40} height={12} />
        </View>
      ))}
    </View>
  );
};

export const ProfileDetailSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.profileDetailContainer,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      {/* Header */}
      <View style={styles.headerSkeleton}>
        <SkeletonLoading width={60} height={16} />
        <SkeletonLoading width={20} height={20} borderRadius={10} />
      </View>

      {/* Main image */}
      <SkeletonLoading
        width={width}
        height={width * 1.2}
        borderRadius={0}
        style={{ marginBottom: 16 }}
      />

      {/* Profile info */}
      <View style={styles.profileInfoSkeleton}>
        <SkeletonLoading width="60%" height={28} style={{ marginBottom: 8 }} />
        <SkeletonLoading width="40%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoading width="50%" height={16} style={{ marginBottom: 16 }} />

        {/* About section */}
        <SkeletonLoading width="30%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonLoading width="100%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoading width="90%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoading width="70%" height={16} style={{ marginBottom: 16 }} />

        {/* Details sections */}
        <SkeletonLoading width="40%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonLoading width="80%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoading width="75%" height={16} style={{ marginBottom: 4 }} />
      </View>

      {/* Action button */}
      <View style={styles.actionButtonSkeleton}>
        <SkeletonLoading width="100%" height={48} borderRadius={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  skeleton: {
    opacity: 0.7,
  },
  skeletonContainer: {
    padding: 16,
  },
  profileCardSkeleton: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chatListContainer: {
    flex: 1,
  },
  chatItemSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  chatItemContent: {
    flex: 1,
  },
  profileDetailContainer: {
    flex: 1,
  },
  headerSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 12,
  },
  profileInfoSkeleton: {
    padding: 16,
  },
  actionButtonSkeleton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
});
