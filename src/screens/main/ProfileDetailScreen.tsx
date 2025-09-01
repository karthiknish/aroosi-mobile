import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@contexts/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useInterests } from "@/hooks/useInterests";
import { useSafety } from "@/hooks/useSafety";
import { useTheme } from "@contexts/ThemeContext";
import SafetyActionSheet from "@components/safety/SafetyActionSheet";
import ReportUserModal from "@components/safety/ReportUserModal";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, {
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import { useInterestStatus } from "@/hooks/useInterests";
import { useBlockStatus } from "@/hooks/useSafety";
import { Profile } from "@/types/profile";
import type { ReportReason } from "@/types/profile";
import ScreenContainer from "@components/common/ScreenContainer";
import { useToast } from "@/providers/ToastContext";
import ConfirmModal from "@components/ui/ConfirmModal";
import { ProfileActions } from "@components/profile/ProfileActions";

const { width } = Dimensions.get("window");

interface ProfileDetailScreenProps {
  route: {
    params: {
      profileId: string;
      userId?: string;
    };
  };
  navigation: any;
}

export default function ProfileDetailScreen({
  route,
  navigation,
}: ProfileDetailScreenProps) {
  const { profileId, userId: paramUserId } = route.params;
  const { user } = useAuth();
  const currentUserId = user?.id;
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSafetySheet, setShowSafetySheet] = useState(false);
  const [confirmBlockVisible, setConfirmBlockVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const toast = useToast();

  const { sendInterest, removeInterest } = useInterests();

  const { reportUserAsync, blockUserAsync, isUserBlocked } = useSafety();

  const { status: interestStatus, loading: interestLoading } =
    useInterestStatus(profileId);
  const { data: blockStatus } = useBlockStatus(profileId);

  // Define styles early so they can be used in early returns
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: spacing.sm,
    },
    backText: {
      fontSize: Layout.typography.fontSize.base,
      fontWeight: "500",
    },
    safetyButton: {
      padding: spacing.sm,
    },
    safetyText: {
      fontSize: Layout.typography.fontSize.xl,
      fontWeight: "bold",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: Layout.typography.fontSize.base,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
    },
    errorText: {
      fontSize: Layout.typography.fontSize.lg,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    scrollView: {
      flex: 1,
    },
    imageGallery: {
      position: "relative",
    },
    profileImage: {
      width: width,
      height: width * 1.2,
      resizeMode: "cover",
    },
    imageIndicators: {
      flexDirection: "row",
      justifyContent: "center",
      position: "absolute",
      bottom: spacing.lg,
      left: 0,
      right: 0,
    },
    indicator: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: spacing.xs,
      marginHorizontal: spacing.xs,
    },
    noImageContainer: {
      width: width,
      height: width * 0.8,
      justifyContent: "center",
      alignItems: "center",
    },
    noImageText: {
      fontSize: Layout.typography.fontSize.base,
    },
    profileInfo: {
      padding: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
      padding: spacing.md,
      borderRadius: spacing.xs * 3,
    },
    name: {
      fontFamily: "Boldonse-Regular",
      fontSize: Layout.typography.fontSize["2xl"] + spacing.xs,
      marginBottom: spacing.sm,
    },
    basicDetails: {
      gap: spacing.xs,
    },
    detail: {
      fontSize: Layout.typography.fontSize.base,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: Layout.typography.fontSize.xl,
      marginBottom: spacing.sm * 1.5,
    },
    sectionText: {
      fontSize: Layout.typography.fontSize.base,
      lineHeight: Layout.typography.fontSize.base * 1.5,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.primary,
    },
    detailLabel: {
      fontSize: Layout.typography.fontSize.sm,
      flex: 1,
    },
    detailValue: {
      fontSize: Layout.typography.fontSize.base,
      fontWeight: "500",
      flex: 2,
      textAlign: "right",
    },
    actionContainer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border.primary,
    },
    interestButton: {
      paddingVertical: spacing.md,
      borderRadius: spacing.xs * 3,
      alignItems: "center",
    },
    button: {
      paddingVertical: spacing.sm * 1.5,
      paddingHorizontal: spacing.lg,
      borderRadius: spacing.sm,
      alignItems: "center",
    },
    buttonText: {
      color: Colors.text.inverse,
      fontSize: Layout.typography.fontSize.base,
      fontWeight: "600",
    },
    contentStyle: {
      flexGrow: 1,
    },
  });

  // Get profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    error,
  } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const response = await apiClient.getProfileById(profileId);
      return response.success ? response.data : null;
    },
    enabled: !!profileId,
  });
  const profile = profileData as Profile | null;

  // Get profile images
  const { data: profileImages = [] } = useQuery({
    queryKey: ["profileImages", profileId],
    queryFn: async () => {
      const response = await apiClient.getBatchProfileImages([profileId]);
      return response.success ? (response.data as any)[profileId] || [] : [];
    },
    enabled: !!profileId,
  });

  // Record profile view
  useEffect(() => {
    if (profile && currentUserId && profileId !== currentUserId) {
      apiClient.recordProfileView(profileId);
    }
  }, [profile, currentUserId, profileId]);

  const handleSendInterest = async () => {
    if (!currentUserId || !profileId) return;
    try {
      await sendInterest(profileId);
      queryClient.invalidateQueries({
        queryKey: ["interestStatus", currentUserId, profileId],
      });
      toast.show("Interest sent successfully!", "success");
    } catch (error) {
      toast.show("Failed to send interest. Please try again.", "error");
    }
  };

  const handleRemoveInterest = async () => {
    if (!currentUserId || !profileId) return;
    try {
      await removeInterest(profileId);
      queryClient.invalidateQueries({
        queryKey: ["interestStatus", currentUserId, profileId],
      });
      toast.show("Interest removed successfully!", "success");
    } catch (error) {
      toast.show("Failed to remove interest. Please try again.", "error");
    }
  };

  const handleReportUser = async (reason: string, description?: string) => {
    if (!profileId || profileId === currentUserId) {
      toast.show("You cannot report yourself.", "info");
      return;
    }
    const ok = await reportUserAsync(
      profileId,
      reason as ReportReason,
      description
    );
    if (ok) {
      toast.show(
        "User reported successfully. Our team will review this report.",
        "success"
      );
      setShowSafetySheet(false);
    } else {
      toast.show("Failed to report user. Please try again.", "error");
    }
  };

  const handleBlockUser = async () => {
    if (!profileId) return;
    setConfirmBlockVisible(true);
  };
  const confirmBlock = async () => {
    if (!profileId || profileId === currentUserId) {
      toast.show("You cannot block yourself.", "info");
      setConfirmBlockVisible(false);
      return;
    }
    try {
      const ok = await blockUserAsync(profileId);
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ["blockStatus", profileId] });
        toast.show("User blocked successfully.", "success");
        setShowSafetySheet(false);
        navigation.goBack();
      } else {
        toast.show("Failed to block user. Please try again.", "error");
      }
    } finally {
      setConfirmBlockVisible(false);
    }
  };
  const cancelBlock = () => setConfirmBlockVisible(false);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const formatHeight = (heightCm: number) => {
    const feet = Math.floor(heightCm / 30.48);
    const inches = Math.round((heightCm % 30.48) / 2.54);
    return `${feet}'${inches}" (${heightCm}cm)`;
  };

  if (profileLoading) {
    return (
      <ScreenContainer
        containerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
        contentStyle={styles.contentStyle}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text
              style={[styles.backText, { color: theme.colors.primary[500] }]}
            >
              ← Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text
            style={[styles.loadingText, { color: theme.colors.text.secondary }]}
          >
            Loading profile...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !profile) {
    return (
      <ScreenContainer
        containerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
        contentStyle={styles.contentStyle}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text
              style={[styles.backText, { color: theme.colors.primary[500] }]}
            >
              ← Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error[500] }]}>
            Profile not found or unavailable
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary[500] },
            ]}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (blockStatus?.isBlocked) {
    return (
      <ScreenContainer
        containerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
        contentStyle={styles.contentStyle}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text
              style={[styles.backText, { color: theme.colors.primary[500] }]}
            >
              ← Back
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text
            style={[styles.errorText, { color: theme.colors.text.secondary }]}
          >
            This profile is not available
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary[500] },
            ]}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
  const isOwnProfile = currentUserId === profileId;
  const hasInterest = interestStatus === "sent" || interestStatus === "matched";

  return (
    <ScreenContainer
      containerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
      contentStyle={styles.contentStyle}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.border.primary },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: theme.colors.primary[500] }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        {!isOwnProfile && (
          <TouchableOpacity
            onPress={() => setShowSafetySheet(true)}
            style={styles.safetyButton}
          >
            <Text
              style={[
                styles.safetyText,
                { color: theme.colors.text.secondary },
              ]}
            >
              ⋯
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View>
        {/* Image Gallery */}
        {profileImages.length > 0 ? (
          <View style={styles.imageGallery}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(
                  event.nativeEvent.contentOffset.x / width
                );
                setCurrentImageIndex(newIndex);
              }}
            >
              {profileImages.map((image: any, index: number) => (
                <Image
                  key={image.id || index}
                  source={{ uri: image.url }}
                  style={styles.profileImage}
                />
              ))}
            </ScrollView>

            {profileImages.length > 1 && (
              <View style={styles.imageIndicators}>
                {profileImages.map((_: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      {
                        backgroundColor:
                          index === currentImageIndex
                            ? theme.colors.primary[500]
                            : theme.colors.neutral[300],
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.noImageContainer,
              { backgroundColor: theme.colors.background.secondary },
            ]}
          >
            <Text
              style={[
                styles.noImageText,
                { color: theme.colors.text.secondary },
              ]}
            >
              No photos available
            </Text>
          </View>
        )}

        {/* Profile Information */}
        <View style={styles.profileInfo}>
          {/* Basic Info */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.background.primary },
            ]}
          >
            <Text style={[styles.name, { color: theme.colors.text.primary }]}>
              {profile?.fullName}
            </Text>

            <View style={styles.basicDetails}>
              {age && (
                <Text
                  style={[
                    styles.detail,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  {age} years old
                </Text>
              )}
              {profile?.city && (
                <Text
                  style={[
                    styles.detail,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  📍 {profile.city}
                </Text>
              )}
              {profile?.height && (
                <Text
                  style={[
                    styles.detail,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  📏{" "}
                  {typeof profile.height === "string"
                    ? profile.height
                    : formatHeight(Number(profile.height))}
                </Text>
              )}
            </View>
          </View>

          {/* About Me */}
          {profile.aboutMe && (
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.background.primary },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                About Me
              </Text>
              <Text
                style={[
                  styles.sectionText,
                  { color: theme.colors.text.secondary },
                ]}
              >
                {profile.aboutMe}
              </Text>
            </View>
          )}

          {/* Professional Details */}
          {(profile.occupation ||
            profile.education ||
            profile.annualIncome) && (
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.background.primary },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                Professional Details
              </Text>
              {profile.occupation && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Occupation:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.occupation}
                  </Text>
                </View>
              )}
              {profile.education && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Education:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.education}
                  </Text>
                </View>
              )}
              {profile.annualIncome && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Annual Income:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    £{profile.annualIncome.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Lifestyle */}
          {(profile.diet ||
            profile.smoking ||
            profile.drinking ||
            profile.physicalStatus) && (
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.background.primary },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                Lifestyle
              </Text>
              {profile.diet && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Diet:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.diet}
                  </Text>
                </View>
              )}
              {profile.smoking && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Smoking:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.smoking}
                  </Text>
                </View>
              )}
              {profile.drinking && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Drinking:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.drinking}
                  </Text>
                </View>
              )}
              {profile.physicalStatus && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Physical Status:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.physicalStatus}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {!isOwnProfile && (
        <View
          style={[
            styles.actionContainer,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <TouchableOpacity
            onPress={hasInterest ? handleRemoveInterest : handleSendInterest}
            disabled={interestLoading}
            style={[
              styles.interestButton,
              {
                backgroundColor: hasInterest
                  ? theme.colors.error[500]
                  : theme.colors.primary[500],
              },
            ]}
          >
            {interestLoading ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>
                {hasInterest ? "💔 Remove Interest" : "💖 Send Interest"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Shortlist Actions */}
          <ProfileActions
            toUserId={profileId}
            onShortlistChange={(isShortlisted: boolean) => {
              // Optional: Handle shortlist state changes if needed
            }}
          />
        </View>
      )}

      {/* Safety Action Sheet */}
      <SafetyActionSheet
        visible={showSafetySheet}
        onClose={() => setShowSafetySheet(false)}
        userId={profileId}
        userName={profile?.fullName || ""}
        isBlocked={blockStatus?.isBlocked}
        onReport={() => setReportModalVisible(true)}
      />
      <ReportUserModal
        visible={reportModalVisible}
        userId={profileId}
        userName={profile?.fullName || ""}
        onClose={() => setReportModalVisible(false)}
      />
      <ConfirmModal
        visible={confirmBlockVisible}
        title="Block User"
        message="Are you sure you want to block this user? They will not be able to contact you."
        confirmLabel="Block"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmBlock}
        onCancel={cancelBlock}
      />
    </ScreenContainer>
  );
}
