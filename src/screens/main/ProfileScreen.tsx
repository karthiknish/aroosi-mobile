import React, { useState } from "react";
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
import { useSubscription } from "../../../hooks/useSubscription";
import { useApiClient } from "../../../utils/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Colors } from "../../../constants";
import { Profile, ProfileImage } from "../../../types";
import { useTheme } from "../../../contexts/ThemeContext";
import { useResponsiveSpacing, useResponsiveTypography } from "../../../hooks/useResponsive";

const { width } = Dimensions.get("window");

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const {
    subscription,
    hasActiveSubscription,
    isTrialActive,
    daysUntilExpiry,
    loading: subscriptionLoading,
  } = useSubscription();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>(
    {
      queryKey: ["currentProfile"],
      queryFn: async () => {
        const response = await apiClient.getProfile();
        return response.success ? (response.data as Profile) : null;
      },
      enabled: !!userId,
    }
  );

  const { data: profileImages = [] } = useQuery<ProfileImage[]>({
    queryKey: ["profileImages"],
    queryFn: async () => {
      const response = await apiClient.getProfileImages();
      return response.success ? (response.data as ProfileImage[]) : [];
    },
    enabled: !!userId,
  });

  const { data: profileViewers = [] } = useQuery<any[]>({
    queryKey: ["profileViewers"],
    queryFn: async () => {
      const response = await apiClient.getProfileViewers();
      return response.success ? (response.data as any[]) : [];
    },
    enabled: !!userId && hasActiveSubscription,
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: () => apiClient.deleteProfile(),
    onSuccess: () => {
      Alert.alert("Success", "Profile deleted successfully", [
        { text: "OK", onPress: () => navigation.navigate("Auth") },
      ]);
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete profile. Please try again.");
    },
  });

  // Boost profile mutation
  const boostProfileMutation = useMutation({
    mutationFn: () => apiClient.boostProfile(),
    onSuccess: () => {
      Alert.alert("Success", "Profile boosted for 24 hours!");
    },
    onError: () => {
      Alert.alert("Error", "Failed to boost profile. Please try again.");
    },
  });

  const isLoading = profileLoading || subscriptionLoading;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: fontSize.base,
      marginTop: spacing.md,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: fontSize.xl,
      fontWeight: "bold",
    },
    settingsButton: {
      padding: spacing.xs,
    },
    settingsText: {
      fontSize: fontSize.base,
    },
    actionButtonsRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderRadius: 8,
      alignItems: "center",
    },
    actionBtnText: {
      color: "#fff",
      fontSize: fontSize.xs,
      fontWeight: "600",
      textAlign: "center",
    },
    section: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
      padding: spacing.md,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      marginBottom: spacing.md,
    },
    imageGallery: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
    },
    imageContainer: {
      width: width - 40,
      marginHorizontal: 4,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
    },
    profileImage: {
      width: width - 48,
      height: (width - 48) * 1.2,
      resizeMode: "cover",
    },
    mainBadge: {
      position: "absolute",
      top: spacing.md,
      right: spacing.md,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs / 2,
      borderRadius: 12,
    },
    mainBadgeText: {
      color: "#fff",
      fontSize: fontSize.xs,
      fontWeight: "600",
    },
    imageIndicators: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing.md,
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    infoGrid: {
      gap: spacing.md,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: spacing.xs,
    },
    infoLabel: {
      fontSize: fontSize.sm,
      flex: 1,
      fontWeight: "500",
    },
    infoValue: {
      fontSize: fontSize.base,
      flex: 2,
      textAlign: "right",
      fontWeight: "500",
    },
    premiumBadge: {
      color: "#007AFF",
      fontWeight: "bold",
    },
    aboutText: {
      fontSize: fontSize.base,
      lineHeight: spacing.xl,
    },
    noDataText: {
      fontSize: fontSize.base,
      textAlign: "center",
      fontStyle: "italic",
    },
    subscriptionWidget: {
      gap: spacing.md,
    },
    subscriptionHeader: {
      alignItems: "center",
    },
    subscriptionPlan: {
      fontSize: fontSize.lg,
      fontWeight: "bold",
      marginBottom: spacing.xs / 2,
    },
    subscriptionExpiry: {
      fontSize: fontSize.sm,
    },
    subscriptionActions: {
      gap: spacing.md,
    },
    subscriptionButton: {
      paddingVertical: spacing.sm,
      borderRadius: 8,
      alignItems: "center",
    },
    subscriptionButtonText: {
      color: "#fff",
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    boostButton: {
      paddingVertical: spacing.sm,
      borderRadius: 8,
      alignItems: "center",
    },
    viewersList: {
      gap: spacing.xs,
    },
    viewerItem: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      backgroundColor: "#f0f0f0",
      borderRadius: 8,
    },
    viewerText: {
      fontSize: fontSize.sm,
    },
    moreViewersText: {
      fontSize: fontSize.sm,
      fontWeight: "600",
      textAlign: "center",
      marginTop: spacing.xs,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      fontSize: fontSize.xl,
      fontWeight: "bold",
      marginBottom: spacing.xs / 2,
    },
    statLabel: {
      fontSize: fontSize.sm,
    },
    signOutContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    signOutButton: {
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
    },
    signOutButtonText: {
      fontSize: fontSize.base,
      fontWeight: "600",
    },
  });

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleEditPhotos = () => {
    // Navigate to a dedicated photo editing screen (to be created)
    navigation.navigate("EditProfile", { focusOnPhotos: true });
  };

  const handleViewSettings = () => {
    navigation.navigate("Settings");
  };

  const handleViewSubscription = () => {
    navigation.navigate("Subscription");
  };

  const handleBoostProfile = () => {
    if (!hasActiveSubscription) {
      Alert.alert(
        "Premium Required",
        "Profile boost is available for premium members only.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: handleViewSubscription },
        ]
      );
      return;
    }

    Alert.alert(
      "Boost Profile",
      "Boost your profile for 24 hours to get more visibility?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Boost", onPress: () => boostProfileMutation.mutate() },
      ]
    );
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      "Delete Profile",
      "This action cannot be undone. Are you sure you want to delete your profile?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProfileMutation.mutate(),
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // Sign out logic will be handled by Clerk
          navigation.navigate("Auth");
        },
      },
    ]);
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

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: Colors.background.primary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={[styles.loadingText, { color: Colors.text.secondary }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.colors.border.primary },
          ]}
        >
          <Text
            style={[styles.headerTitle, { color: theme.colors.text.primary }]}
          >
            My Profile
          </Text>
          <TouchableOpacity
            onPress={handleViewSettings}
            style={styles.settingsButton}
          >
            <Text
              style={[
                styles.settingsText,
                { color: theme.colors.primary[500] },
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            onPress={handleEditProfile}
            style={[
              styles.actionBtn,
              { backgroundColor: theme.colors.primary[500] },
            ]}
          >
            <Text style={styles.actionBtnText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleEditPhotos}
            style={[
              styles.actionBtn,
              { backgroundColor: theme.colors.secondary[500] },
            ]}
          >
            <Text style={styles.actionBtnText}>📷 Edit Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteProfile}
            style={[
              styles.actionBtn,
              { backgroundColor: theme.colors.error[500] },
            ]}
            disabled={deleteProfileMutation.isPending}
          >
            {deleteProfileMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.background.primary} />
            ) : (
              <Text style={styles.actionBtnText}>🗑️ Delete</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Images Gallery */}
        {profileImages.length > 0 ? (
          <View style={styles.imageGallery}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.primary },
              ]}
            >
              Profile Images
            </Text>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(
                  event.nativeEvent.contentOffset.x / (width - 40)
                );
                setCurrentImageIndex(newIndex);
              }}
            >
              {profileImages.map((image: any, index: number) => (
                <View key={image.id || index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: image.url }}
                    style={styles.profileImage}
                  />
                  {image.isMain && (
                    <View
                      style={[
                        styles.mainBadge,
                        { backgroundColor: theme.colors.primary[500] },
                      ]}
                    >
                      <Text style={styles.mainBadgeText}>Main</Text>
                    </View>
                  )}
                </View>
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
              styles.section,
              { backgroundColor: theme.colors.background.secondary },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.primary },
              ]}
            >
              Profile Images
            </Text>
            <Text
              style={[
                styles.noDataText,
                { color: theme.colors.text.secondary },
              ]}
            >
              No photos uploaded yet
            </Text>
          </View>
        )}

        {/* Basic Information */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Basic Information
          </Text>
          <View style={styles.infoGrid}>
            {profile?.fullName && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Full Name:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.fullName}
                </Text>
              </View>
            )}
            {profile?.email && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Email:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.email}
                </Text>
              </View>
            )}
            {profile?.dateOfBirth && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Date of Birth:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {new Date(profile.dateOfBirth).toLocaleDateString("en-GB")} (
                  {age} years)
                </Text>
              </View>
            )}
            {profile?.gender && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Gender:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.gender}
                </Text>
              </View>
            )}
            {profile?.profileFor && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Profile For:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.profileFor}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Contact
          </Text>
          <View style={styles.infoGrid}>
            {profile?.phoneNumber && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Phone Number:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.phoneNumber}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Location */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Location
          </Text>
          <View style={styles.infoGrid}>
            {profile?.city && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  City:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.city}
                </Text>
              </View>
            )}
            {profile?.country && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Country:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.country}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Physical Attributes */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Physical Attributes
          </Text>
          <View style={styles.infoGrid}>
            {profile?.height && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Height:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {formatHeight(parseInt(profile.height) || 0)}
                </Text>
              </View>
            )}
            {profile?.physicalStatus && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Physical Status:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.physicalStatus}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Lifestyle */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Lifestyle
          </Text>
          <View style={styles.infoGrid}>
            {profile?.diet && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Diet:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.diet}
                </Text>
              </View>
            )}
            {profile?.smoking && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Smoking:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.smoking}
                </Text>
              </View>
            )}
            {profile?.drinking && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Drinking:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.drinking}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Education & Career */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Education & Career
          </Text>
          <View style={styles.infoGrid}>
            {profile?.education && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Education:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.education}
                </Text>
              </View>
            )}
            {profile?.occupation && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Occupation:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.occupation}
                </Text>
              </View>
            )}
            {profile?.annualIncome && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Annual Income:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.annualIncome}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Cultural & Religious */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Cultural & Religious
          </Text>
          <View style={styles.infoGrid}>
            {profile?.motherTongue && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Mother Tongue:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.motherTongue}
                </Text>
              </View>
            )}
            {profile?.religion && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Religion:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.religion}
                </Text>
              </View>
            )}
            {profile?.ethnicity && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Ethnicity:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.ethnicity}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Partner Preferences */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Partner Preferences
          </Text>
          <View style={styles.infoGrid}>
            {(profile?.partnerPreferenceAgeMin ||
              profile?.partnerPreferenceAgeMax) && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Preferred Age:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.partnerPreferenceAgeMin || 18} -{" "}
                  {profile.partnerPreferenceAgeMax || 120} years
                </Text>
              </View>
            )}
            {profile?.partnerPreferenceCity && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Preferred Cities:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {Array.isArray(profile.partnerPreferenceCity)
                    ? profile.partnerPreferenceCity.join(", ")
                    : profile.partnerPreferenceCity}
                </Text>
              </View>
            )}
            {profile?.preferredGender && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Preferred Gender:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.preferredGender}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Subscription & Features */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.secondary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Subscription & Features
          </Text>
          <View style={styles.infoGrid}>
            {profile?.subscriptionPlan && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Subscription Plan:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.subscriptionPlan}
                </Text>
              </View>
            )}
            {profile?.boostsRemaining !== undefined && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Boosts Remaining:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.boostsRemaining}
                </Text>
              </View>
            )}
            {profile?.hasSpotlightBadge && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Spotlight Badge:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {profile.hasSpotlightBadge ? "Yes" : "No"}
                </Text>
              </View>
            )}
            {profile?.spotlightBadgeExpiresAt && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Spotlight Badge Expires At:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {new Date(profile.spotlightBadgeExpiresAt).toLocaleString()}
                </Text>
              </View>
            )}
            {profile?.boostedUntil && (
              <View style={styles.infoRow}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Boosted Until:
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {new Date(profile.boostedUntil).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Viewers (Premium Only) */}
        {hasActiveSubscription && (
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
              Who Viewed Your Profile
            </Text>

            {profileViewers.length > 0 ? (
              <View style={styles.viewersList}>
                {profileViewers
                  .slice(0, 5)
                  .map((viewer: any, index: number) => (
                    <View key={index} style={styles.viewerItem}>
                      <Text
                        style={[
                          styles.viewerText,
                          { color: theme.colors.text.secondary },
                        ]}
                      >
                        {viewer.email || viewer.userId}
                      </Text>
                    </View>
                  ))}
                {profileViewers.length > 5 && (
                  <Text
                    style={[
                      styles.moreViewersText,
                      { color: theme.colors.primary[500] },
                    ]}
                  >
                    +{profileViewers.length - 5} more
                  </Text>
                )}
              </View>
            ) : (
              <Text
                style={[
                  styles.noDataText,
                  { color: theme.colors.text.secondary },
                ]}
              >
                No profile views yet
              </Text>
            )}
          </View>
        )}

        {/* Profile Stats */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Profile Statistics
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  { color: theme.colors.primary[500] },
                ]}
              >
                {profileImages?.length || 0}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.text.secondary },
                ]}
              >
                Photos
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  { color: theme.colors.primary[500] },
                ]}
              >
                {profile?.isProfileComplete ? 100 : 75}%
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.text.secondary },
                ]}
              >
                Complete
              </Text>
            </View>

            {hasActiveSubscription && (
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statNumber,
                    { color: theme.colors.primary[500] },
                  ]}
                >
                  {profileViewers?.length || 0}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Views
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={[
              styles.signOutButton,
              { borderColor: theme.colors.error[500] },
            ]}
          >
            <Text
              style={[
                styles.signOutButtonText,
                { color: theme.colors.error[500] },
              ]}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


