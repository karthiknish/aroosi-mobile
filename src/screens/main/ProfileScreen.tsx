import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@contexts/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useApiClient } from "@/utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors, Layout } from "@constants";
import { useToast } from "@/providers/ToastContext";
import { Profile } from "@/types/profile";
// Dynamic profile completion calculator (replaces removed isProfileComplete flag)
const REQUIRED_FIELDS: (keyof Profile)[] = [
  "fullName",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "city",
  "country",
  "education",
  "occupation",
  "aboutMe",
  "phoneNumber",
];

function calcCompletion(profile: Profile): number {
  const filled = REQUIRED_FIELDS.filter((f) => {
    const v: any = profile[f];
    return v !== undefined && v !== null && String(v).trim().length > 0;
  }).length;
  return filled / REQUIRED_FIELDS.length;
}
import { ProfileImage } from "@/types/image";
import { useTheme } from "@contexts/ThemeContext";
import useResponsiveSpacing, {
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import {
  GradientButton,
  GlassmorphismCard,
  GradientBackground,
} from "@/components/ui/GradientComponents";
import {
  CircularProgress,
  LinearProgress,
} from "@/components/ui/ProgressIndicators";
import {
  AnimatedButton,
  FadeInView,
  ScaleInView,
} from "@/components/ui/AnimatedComponents";
import * as Haptics from "expo-haptics";
import ScreenContainer from "@components/common/ScreenContainer";
import ConfirmModal from "@components/ui/ConfirmModal";
import VerifyEmailInline from "@components/auth/VerifyEmailInline";
import InlineUpgradeBanner from "@components/subscription/InlineUpgradeBanner";
import PremiumFeatureGuard from "@components/subscription/PremiumFeatureGuard";

const { width } = Dimensions.get("window");

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const {
    user,
    needsEmailVerification,
    resendEmailVerification,
    verifyEmailCode,
    startEmailVerificationPolling,
    refreshUser,
  } = useAuth() as any;
  const userId = user?.id;
  const apiClient = useApiClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const toast = useToast();
  const [showBoostConfirm, setShowBoostConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { checkFeatureAccess } = useFeatureAccess();
  const queryClient = useQueryClient();
  let analyticsTrack: any;
  try {
    // dynamic require to avoid bundling issues if tree-shaken
    analyticsTrack = require("@/utils/analytics").track;
  } catch {}

  // Removed fontSize usage to avoid TS errors and keep spacing-only responsive updates
  const {
    subscription,
    hasActiveSubscription,
    isTrialActive,
    daysUntilExpiry,
    loading: subscriptionLoading,
    trackFeatureUsage,
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

  // Feature access evaluation for profile viewers
  const canViewProfileViewers = useMemo(() => {
    // Use subscription features directly
    return (
      subscription?.plan === "premium" || subscription?.plan === "premiumPlus"
    );
  }, [subscription]);

  const { data: profileViewers = [] } = useQuery<any[]>({
    queryKey: ["profileViewers"],
    queryFn: async () => {
      const response = await apiClient.getProfileViewers(userId as string);
      return response.success ? (response.data as any[]) : [];
    },
    enabled: !!userId && canViewProfileViewers,
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: () => apiClient.deleteProfile(),
    onSuccess: () => {
      toast.show("Profile deleted successfully", "success");
      navigation.navigate("Auth");
    },
    onError: () => {
      toast.show("Failed to delete profile. Please try again.", "error");
    },
  });

  // Boost profile mutation
  const boostProfileMutation = useMutation({
    mutationFn: async () => {
      analyticsTrack?.("profile_boost_attempt", { plan: subscription?.plan });
      const res = await apiClient.boostProfile();
      if (!res.success) {
        throw new Error(
          typeof res.error === "string" ? res.error : "Boost failed"
        );
      }
      return res;
    },
    onSuccess: () => {
      analyticsTrack?.("profile_boost_success", { plan: subscription?.plan });
      toast.show("Profile boosted for 24 hours!", "success");
      try {
        trackFeatureUsage("profileBoosts");
      } catch (e) {
        console.log("Failed to track boost usage", e);
      }
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      queryClient.invalidateQueries({ queryKey: ["usage", userId] });
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
    },
    onError: (error: any) => {
      analyticsTrack?.("profile_boost_failed", {
        plan: subscription?.plan,
        error: String(error),
      });
      const msg = /quota|limit|boost/i.test(String(error))
        ? "You've reached your boost quota. Upgrade for more."
        : "Failed to boost profile. Please try again.";
      toast.show(msg, "error");
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
      fontFamily: Layout.typography.fontFamily.serif,
      fontWeight: "bold",
    },
    settingsButton: {
      padding: spacing.xs,
    },
    settingsText: {},
    emailBadge: {
      marginLeft: spacing.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs / 2,
      borderRadius: 12,
    },
    emailBadgeText: {
      color: "#fff",
      fontWeight: "600",
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
      fontFamily: Layout.typography.fontFamily.serif,
      fontWeight: "400",
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
      flex: 1,
      fontWeight: "500",
    },
    infoValue: {
      flex: 2,
      textAlign: "right",
      fontWeight: "500",
    },
    premiumBadge: {
      color: "#007AFF",
      fontWeight: "bold",
    },
    aboutText: {
      lineHeight: spacing.xl,
    },
    noDataText: {
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
      fontWeight: "bold",
      marginBottom: spacing.xs / 2,
    },
    subscriptionExpiry: {},
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
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 8,
    },
    viewerText: {},
    moreViewersText: {
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
      fontWeight: "bold",
      marginBottom: spacing.xs / 2,
    },
    statLabel: {},
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
      fontWeight: "600",
    },
    progressSection: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.1)",
    },
    contentStyle: {
      flexGrow: 1,
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

  // Email verification actions consolidated in VerifyEmailInline component

  const handleViewSubscription = () => {
    navigation.navigate("Subscription");
  };

  const handleViewShortlists = () => {
    navigation.navigate("Shortlists");
  };

  const handleBoostProfile = async () => {
    // Gating logic: Premium has limited boosts (>=1 remaining). Premium Plus unlimited. Free -> upgrade.
    if (!subscription) {
      toast.show("Please sign in to boost your profile", "info");
      return;
    }
    const plan = subscription.plan;
    if (plan === "free") {
      toast.show(
        "Boosting is a Premium feature. Upgrade to unlock boosts.",
        "info"
      );
      handleViewSubscription();
      return;
    }
    // Determine remaining boosts if limited
    const unlimited = plan === "premiumPlus";
    const boostsRemaining = unlimited
      ? Infinity
      : subscription.boostsRemaining ?? 0;
    if (!unlimited && boostsRemaining <= 0) {
      toast.show(
        "You've used your monthly boost. Upgrade to Premium Plus for unlimited boosts.",
        "info"
      );
      handleViewSubscription();
      return;
    }
    analyticsTrack?.("profile_boost_attempt", {
      from: "pre_confirm",
      plan,
    });
    setShowBoostConfirm(true);
  };

  const handleDeleteProfile = () => {
    setShowDeleteConfirm(true);
  };

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
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
      <ScreenContainer
        containerStyle={{ backgroundColor: Colors.background.primary }}
        contentStyle={styles.contentStyle}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={[styles.loadingText, { color: Colors.text.secondary }]}>
            Loading profile...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;

  return (
    <ScreenContainer
      containerStyle={{ backgroundColor: theme.colors.background.primary }}
      contentStyle={styles.contentStyle}
    >
      {/* Confirm Modals */}
      <ConfirmModal
        visible={showBoostConfirm}
        title="Boost Profile"
        message="Boost your profile for 24 hours to get more visibility."
        confirmLabel="Boost"
        cancelLabel="Cancel"
        destructive={false}
        onCancel={() => setShowBoostConfirm(false)}
        onConfirm={() => {
          setShowBoostConfirm(false);
          boostProfileMutation.mutate();
        }}
      />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Profile"
        message="This action cannot be undone. Are you sure you want to delete your profile?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteProfileMutation.mutate();
        }}
      />

      {/* Sign Out Confirm */}
      <ConfirmModal
        visible={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={() => {
          setShowSignOutConfirm(false);
          navigation.navigate("Auth");
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
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
          {needsEmailVerification ? (
            <VerifyEmailInline variant="badge" />
          ) : null}
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
        <FadeInView delay={200}>
          <View style={styles.actionButtonsRow}>
            <ScaleInView delay={300}>
              <GradientButton
                title="✏️ Edit Profile"
                variant="primary"
                size="medium"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleEditProfile();
                }}
                style={styles.actionBtn}
              />
            </ScaleInView>
            <ScaleInView delay={400}>
              <GradientButton
                title="📷 Edit Photos"
                variant="secondary"
                size="medium"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleEditPhotos();
                }}
                style={styles.actionBtn}
              />
            </ScaleInView>
            <ScaleInView delay={500}>
              <GradientButton
                title="❤️ Shortlists"
                variant="secondary"
                size="medium"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleViewShortlists();
                }}
                style={styles.actionBtn}
              />
            </ScaleInView>
            <ScaleInView delay={600}>
              <GradientButton
                title={
                  deleteProfileMutation.isPending
                    ? "⏳ Deleting..."
                    : "🗑️ Delete"
                }
                variant="error"
                size="medium"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  handleDeleteProfile();
                }}
                disabled={deleteProfileMutation.isPending}
                style={styles.actionBtn}
              />
            </ScaleInView>
          </View>
        </FadeInView>

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
                <View
                  style={{
                    flex: 2,
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <Text
                    style={[
                      styles.infoValue,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {profile.email}
                  </Text>
                  {needsEmailVerification ? (
                    <VerifyEmailInline variant="link" label="Unverified" />
                  ) : (
                    <View
                      style={{
                        backgroundColor: theme.colors.success[500],
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Verified
                      </Text>
                    </View>
                  )}
                </View>
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
                  {subscription?.plan === "premiumPlus"
                    ? "Unlimited"
                    : profile.boostsRemaining}
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
          {/* Boost Action / CTA */}
          <View style={{ marginTop: spacing.md }}>
            {subscription?.plan === "free" && (
              <GradientButton
                title="🚀 Boost Your Profile (Upgrade)"
                variant="primary"
                size="medium"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleViewSubscription();
                }}
              />
            )}
            {subscription?.plan === "free" && (
              <View style={{ marginTop: spacing.sm }}>
                <InlineUpgradeBanner
                  message="Unlock Profile Viewers and more with Premium"
                  ctaLabel="Upgrade"
                  onPress={handleViewSubscription}
                />
              </View>
            )}
            {subscription?.plan && subscription.plan !== "free" && (
              <GradientButton
                title={(() => {
                  const boostedActive =
                    !!profile?.boostedUntil &&
                    new Date(profile.boostedUntil) > new Date();
                  if (boostedActive) return "🔥 Boost Active";
                  const remaining =
                    subscription.plan === "premiumPlus"
                      ? "∞"
                      : subscription.boostsRemaining ?? 0;
                  return `🚀 Boost Profile (${remaining} left)`;
                })()}
                variant="secondary"
                size="medium"
                disabled={
                  boostProfileMutation.isPending ||
                  (subscription.plan === "premium" &&
                    (subscription.boostsRemaining ?? 0) <= 0 &&
                    !(
                      profile?.boostedUntil &&
                      new Date(profile.boostedUntil) > new Date()
                    ))
                }
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleBoostProfile();
                }}
                style={{ opacity: boostProfileMutation.isPending ? 0.7 : 1 }}
              />
            )}
          </View>
        </View>

        {/* Profile Viewers (gated) */}
        <PremiumFeatureGuard
          feature="canViewProfileViewers"
          mode="inline"
          message="Unlock Profile Viewers and more with Premium"
          onUpgrade={() => handleViewSubscription()}
          containerStyle={{
            marginHorizontal: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
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
                        {viewer.fullName || viewer.userId}
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
        </PremiumFeatureGuard>

        {/* Profile Stats */}
        <FadeInView delay={600}>
          <GlassmorphismCard
            style={[styles.section, { backgroundColor: "transparent" }]}
            intensity={60}
            borderColor="rgba(255,255,255,0.1)"
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.primary },
              ]}
            >
              Profile Statistics
            </Text>

            <View style={styles.statsGrid}>
              <ScaleInView delay={700}>
                <View style={styles.statItem}>
                  <CircularProgress
                    progress={(profileImages?.length || 0) / 6}
                    size={80}
                    strokeWidth={6}
                    color={theme.colors.primary[500]}
                    showPercentage={false}
                  >
                    <Text
                      style={[
                        styles.statNumber,
                        {
                          color: theme.colors.primary[500],
                        },
                      ]}
                    >
                      {profileImages?.length || 0}
                    </Text>
                  </CircularProgress>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Photos
                  </Text>
                </View>
              </ScaleInView>

              <ScaleInView delay={800}>
                <View style={styles.statItem}>
                  <CircularProgress
                    progress={profile ? calcCompletion(profile) : 0}
                    size={80}
                    strokeWidth={6}
                    color={theme.colors.success[500]}
                    showPercentage={true}
                  />
                  <Text
                    style={[
                      styles.statLabel,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    Complete
                  </Text>
                </View>
              </ScaleInView>

              {hasActiveSubscription && (
                <ScaleInView delay={900}>
                  <View style={styles.statItem}>
                    <CircularProgress
                      progress={Math.min((profileViewers?.length || 0) / 50, 1)}
                      size={80}
                      strokeWidth={6}
                      color={theme.colors.warning[500]}
                      showPercentage={false}
                    >
                      <Text
                        style={[
                          styles.statNumber,
                          {
                            color: theme.colors.warning[500],
                          },
                        ]}
                      >
                        {profileViewers?.length || 0}
                      </Text>
                    </CircularProgress>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: theme.colors.text.secondary },
                      ]}
                    >
                      Views
                    </Text>
                  </View>
                </ScaleInView>
              )}
            </View>

            {/* Profile Completion Progress */}
            <View style={styles.progressSection}>
              <LinearProgress
                progress={profile ? calcCompletion(profile) : 0}
                height={8}
                colors={[theme.colors.success[400], theme.colors.success[600]]}
                showLabel={true}
                label="Profile Completion"
                animated={true}
                duration={1500}
              />
            </View>
          </GlassmorphismCard>
        </FadeInView>

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
    </ScreenContainer>
  );
}
