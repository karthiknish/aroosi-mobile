import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../../../utils/api";
import { useInterests } from "../../../hooks/useInterests";
import { useSafety } from "../../../hooks/useSafety";
import { useTheme } from "../../../contexts/ThemeContext";
import SafetyActionSheet from "@components/safety/SafetyActionSheet";
import { Colors } from "../../../constants";
import { useInterestStatus } from "../../../hooks/useInterests";
import { useBlockStatus } from "../../../hooks/useSafety";
import { Profile } from "../../../types/profile";
import type { ReportReason } from "../../../types/index";
import ScreenContainer from "@components/common/ScreenContainer";

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
  const { userId: currentUserId } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSafetySheet, setShowSafetySheet] = useState(false);

  const { sendInterest, removeInterest } = useInterests();

  const { reportUser, blockUser } = useSafety();

  const { status: interestStatus, loading: interestLoading } =
    useInterestStatus(profileId);
  const { data: blockStatus } = useBlockStatus(profileId);

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
      return response.success ? response.data[profileId] || [] : [];
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
      Alert.alert("Success", "Interest sent successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to send interest. Please try again.");
    }
  };

  const handleRemoveInterest = async () => {
    if (!currentUserId || !profileId) return;
    try {
      await removeInterest(profileId);
      queryClient.invalidateQueries({
        queryKey: ["interestStatus", currentUserId, profileId],
      });
      Alert.alert("Success", "Interest removed successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to remove interest. Please try again.");
    }
  };

  const handleReportUser = async (reason: string, description?: string) => {
    if (!profileId) return;
    try {
      await reportUser.mutateAsync({
        reportedUserId: profileId,
        reason: reason as ReportReason,
        description,
      });
      Alert.alert(
        "Success",
        "User reported successfully. We will review this report."
      );
      setShowSafetySheet(false);
    } catch (error) {
      Alert.alert("Error", "Failed to report user. Please try again.");
    }
  };

  const handleBlockUser = async () => {
    if (!profileId) return;
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? They will not be able to contact you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser.mutateAsync({ blockedUserId: profileId });
              queryClient.invalidateQueries({
                queryKey: ["blockStatus", profileId],
              });
              Alert.alert("Success", "User blocked successfully.");
              setShowSafetySheet(false);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to block user. Please try again.");
            }
          },
        },
      ]
    );
  };

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
        </View>
      )}

      {/* Safety Action Sheet */}
      <SafetyActionSheet
        visible={showSafetySheet}
        onClose={() => setShowSafetySheet(false)}
        userId={profileId}
        userName={profile?.fullName || ""}
        isBlocked={blockStatus?.isBlocked}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  safetyButton: {
    padding: 8,
  },
  safetyText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
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
    bottom: 20,
    left: 0,
    right: 0,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  noImageContainer: {
    width: width,
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 16,
  },
  profileInfo: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  basicDetails: {
    gap: 4,
  },
  detail: {
    fontSize: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  actionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  interestButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
  contentStyle: {
    flexGrow: 1,
  },
});
