import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import { useAuth } from "@contexts/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useInterests } from "@/hooks/useInterests";
import { useSafety } from "@/hooks/useSafety";
import { useTheme } from "@contexts/ThemeContext";
import SafetyActionSheet from "@components/safety/SafetyActionSheet";
import ReportUserModal from "@components/safety/ReportUserModal";
import { Layout } from "@constants";
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
import AppHeader from "@/components/common/AppHeader";
import { useSubscription } from "@/hooks/useSubscription";
import type { SubscriptionTier } from "@/types/subscription";
import UpgradePrompt from "@components/subscription/UpgradePrompt";
import HintPopover from "@/components/ui/HintPopover";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import HapticPressable from "@/components/ui/HapticPressable";

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
  const { profileId } = route.params;
  const { user } = useAuth();
  const currentUserId = user?.id;
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [progressWidth, setProgressWidth] = useState(0);
  const [showSafetySheet, setShowSafetySheet] = useState(false);
  const [confirmBlockVisible, setConfirmBlockVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const toast = useToast();

  const { sendInterest, removeInterest } = useInterests();

  const { reportUserAsync, blockUserAsync, isUserBlocked } = useSafety();

  const { status: interestStatus, loading: interestLoading } =
    useInterestStatus(profileId);
  const { data: blockStatus } = useBlockStatus(profileId);
  // Subscription and usage for gating + hints
  const { subscription, usage, canUseFeatureNow, trackFeatureUsage } =
    useSubscription();
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [recommendedTier, setRecommendedTier] =
    useState<SubscriptionTier>("premium");
  const subscriptionPlan =
    (subscription?.plan as SubscriptionTier) ||
    ((subscription as any)?.tier as SubscriptionTier) ||
    ("free" as SubscriptionTier);

  // Refs and layout positions for section index
  const scrollRef = React.useRef<ScrollView | null>(null);
  const aboutRef = React.useRef<View | null>(null);
  const workRef = React.useRef<View | null>(null);
  const lifestyleRef = React.useRef<View | null>(null);
  const [sectionY, setSectionY] = useState<{
    about?: number;
    work?: number;
    life?: number;
  }>({});

  const scrollTo = (y?: number) => {
    if (!scrollRef.current || typeof y !== "number") return;
    try {
      scrollRef.current.scrollTo({ y, animated: true });
    } catch {}
  };

  // Define styles early so they can be used in early returns
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    contentStyle: {
      flexGrow: 1,
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
    imageGallery: {
      position: "relative",
    },
    profileImage: {
      width: width,
      height: width * 1.2,
      resizeMode: "cover",
    },
    progressTrack: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      opacity: 0.9,
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
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
    sectionIndexBar: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    sectionIndexRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    sectionIndexDot: {
      marginHorizontal: spacing.xs,
      opacity: 0.7,
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
    detail: {
      fontSize: Layout.typography.fontSize.base,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: Layout.typography.fontSize.xl,
      marginBottom: spacing.sm * 1.5,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.xs,
    },
    sectionChevron: {
      fontSize: Layout.typography.fontSize.xl,
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
      borderBottomColor: theme.colors.border.primary,
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
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: Layout.radius.full,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    chipText: {
      fontSize: Layout.typography.fontSize.sm,
    },
    actionContainer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
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
      color: theme.colors.text.inverse,
      fontSize: Layout.typography.fontSize.base,
      fontWeight: "600",
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
      // Prefer detail-specific endpoint which is now normalized
      const response = await apiClient.getProfileDetailImages(profileId);
      if (response.success) return (response.data as any[]) || [];
      // Fallback to batch mapping if needed
      const batch = await apiClient.getBatchProfileImages([profileId]);
      return batch.success ? (batch.data as any)[profileId] || [] : [];
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
      // Preflight usage gating
      try {
        const availability = await canUseFeatureNow("interestsSent");
        if (!availability.canUse) {
          setRecommendedTier(
            (availability.requiredPlan as SubscriptionTier) || "premium"
          );
          setUpgradeVisible(true);
          return;
        }
      } catch {}

      const ok = await sendInterest(profileId);
      if (ok) {
        try {
          await trackFeatureUsage("interestsSent");
        } catch {}
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        queryClient.invalidateQueries({
          queryKey: ["interestStatus", currentUserId, profileId],
        });
        toast.show("Interest sent successfully!", "success");
      } else {
        toast.show("Failed to send interest. Please try again.", "error");
      }
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
        <AppHeader title="Profile" onPressBack={() => navigation.goBack()} />
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
        <AppHeader title="Profile" onPressBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error[500] }]}>
            Profile not found or unavailable
          </Text>
          <HapticPressable
            onPress={() => navigation.goBack()}
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary[500] },
            ]}
            haptic="selection"
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </HapticPressable>
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
        <AppHeader title="Profile" onPressBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text
            style={[styles.errorText, { color: theme.colors.text.secondary }]}
          >
            This profile is not available
          </Text>
          <HapticPressable
            onPress={() => navigation.goBack()}
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary[500] },
            ]}
            haptic="selection"
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </HapticPressable>
        </View>
      </ScreenContainer>
    );
  }

  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
  const isOwnProfile = currentUserId === profileId;
  const hasInterest = interestStatus === "sent" || interestStatus === "matched";
  // Derive usage for inline hint
  const interestUsage = usage?.features?.find(
    (x: any) => x.name === "interestsSent"
  );
  const interestsReached = (interestUsage?.percentageUsed ?? 0) >= 100;

  // Local UI helpers: ExpandableSection & CollapsibleText
  const ExpandableSection: React.FC<{
    title: string;
    initiallyOpen?: boolean;
    children: React.ReactNode;
  }> = ({ title, initiallyOpen = true, children }) => {
    const [open, setOpen] = useState(initiallyOpen);
    // Enable android layout animation
    useEffect(() => {
      if (
        Platform.OS === "android" &&
        UIManager.setLayoutAnimationEnabledExperimental
      ) {
        try {
          UIManager.setLayoutAnimationEnabledExperimental(true);
        } catch {}
      }
    }, []);
    return (
      <View
        style={[
          styles.section,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <HapticPressable
          accessibilityRole="button"
          accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title}`}
          onPress={() => {
            // Smooth expand/collapse
            LayoutAnimation.configureNext(
              LayoutAnimation.create(
                200,
                LayoutAnimation.Types.easeInEaseOut,
                LayoutAnimation.Properties.opacity
              )
            );
            setOpen((v) => !v);
          }}
          style={styles.sectionHeaderRow}
          haptic="selection"
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.sectionChevron,
              { color: theme.colors.text.secondary },
            ]}
          >
            {open ? "▾" : "▸"}
          </Text>
        </HapticPressable>
        {open ? <View>{children}</View> : null}
      </View>
    );
  };

  const CollapsibleText: React.FC<{
    text: string;
    numberOfLines?: number;
  }> = ({ text, numberOfLines = 3 }) => {
    const [expanded, setExpanded] = useState(false);
    const [showFade, setShowFade] = useState(false);
    return (
      <View style={{ position: "relative" }}>
        <Text
          style={[styles.sectionText, { color: theme.colors.text.secondary }]}
          numberOfLines={expanded ? undefined : numberOfLines}
          onTextLayout={(e) => {
            const lines = e.nativeEvent.lines?.length ?? 0;
            setShowFade(!expanded && lines > numberOfLines);
          }}
        >
          {text}
        </Text>
        {!expanded && showFade ? (
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0)", theme.colors.background.primary]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: spacing.lg * 1.2,
            }}
          />
        ) : null}
        {text && text.length > 0 ? (
          <HapticPressable
            onPress={() => setExpanded((v) => !v)}
            style={{ marginTop: spacing.xs }}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Show less" : "Read more"}
            haptic="selection"
          >
            <Text
              style={{ color: theme.colors.primary[600], fontWeight: "600" }}
            >
              {expanded ? "Show less" : "Read more"}
            </Text>
          </HapticPressable>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenContainer
      containerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
      contentStyle={styles.contentStyle}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        title={profile?.fullName || "Profile"}
        onPressBack={() => navigation.goBack()}
        rightActions={
          !isOwnProfile ? (
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="Safety actions"
              onPress={() => setShowSafetySheet(true)}
              style={{ padding: spacing.sm }}
              haptic="selection"
            >
              <Text
                style={{
                  fontSize: Layout.typography.fontSize.xl,
                  fontWeight: "bold",
                  color: theme.colors.text.secondary,
                }}
              >
                ⋯
              </Text>
            </HapticPressable>
          ) : undefined
        }
      />

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
                try {
                  const to = (newIndex + 1) / Math.max(profileImages.length, 1);
                  Animated.timing(progressAnim, {
                    toValue: to,
                    duration: 220,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                  }).start();
                } catch {}
              }}
            >
              {profileImages.map((image: any, index: number) => {
                const uri = typeof image === "string" ? image : image?.url;
                const key = (image && (image.id || image._id)) || index;
                return (
                  <Image
                    key={key}
                    source={{ uri }}
                    style={styles.profileImage}
                  />
                );
              })}
            </ScrollView>

            {/* Slim progress bar instead of dots */}
            {profileImages.length > 1 ? (
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.neutral[300] },
                ]}
                onLayout={(e) => setProgressWidth(e.nativeEvent.layout.width)}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: Animated.multiply(
                        progressAnim,
                        progressWidth || 1
                      ),
                      backgroundColor: theme.colors.primary[500],
                    },
                  ]}
                />
              </View>
            ) : null}
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

        {/* Section index bar */}
        <View
          style={[
            styles.sectionIndexBar,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <View style={styles.sectionIndexRow}>
            <HapticPressable
              onPress={() => scrollTo(sectionY.about)}
              haptic="selection"
            >
              <Text
                style={{ color: theme.colors.primary[700], fontWeight: "600" }}
              >
                About
              </Text>
            </HapticPressable>
            <Text
              style={[
                styles.sectionIndexDot,
                { color: theme.colors.text.tertiary },
              ]}
            >
              •
            </Text>
            <HapticPressable
              onPress={() => scrollTo(sectionY.work)}
              haptic="selection"
            >
              <Text
                style={{ color: theme.colors.primary[700], fontWeight: "600" }}
              >
                Work
              </Text>
            </HapticPressable>
            <Text
              style={[
                styles.sectionIndexDot,
                { color: theme.colors.text.tertiary },
              ]}
            >
              •
            </Text>
            <HapticPressable
              onPress={() => scrollTo(sectionY.life)}
              haptic="selection"
            >
              <Text
                style={{ color: theme.colors.primary[700], fontWeight: "600" }}
              >
                Lifestyle
              </Text>
            </HapticPressable>
          </View>
        </View>

        {/* Profile Information */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.profileInfo}
          showsVerticalScrollIndicator={false}
        >
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
            <View style={styles.chipsRow}>
              {age ? (
                <View
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    🎂 {age}
                  </Text>
                </View>
              ) : null}
              {profile?.city ? (
                <View
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    📍 {profile.city}
                  </Text>
                </View>
              ) : null}
              {profile?.height ? (
                <View
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    📏{" "}
                    {typeof profile.height === "string"
                      ? profile.height
                      : formatHeight(Number(profile.height))}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* About Me */}
          {profile.aboutMe ? (
            <View
              ref={aboutRef as any}
              onLayout={(e) =>
                setSectionY((s) => ({
                  ...s,
                  about: e.nativeEvent.layout.y - 12,
                }))
              }
            >
              <ExpandableSection title="About Me" initiallyOpen={true}>
                <CollapsibleText text={profile.aboutMe} numberOfLines={4} />
              </ExpandableSection>
            </View>
          ) : null}

          {/* Professional Details */}
          {profile.occupation || profile.education || profile.annualIncome ? (
            <View
              ref={workRef as any}
              onLayout={(e) =>
                setSectionY((s) => ({
                  ...s,
                  work: e.nativeEvent.layout.y - 12,
                }))
              }
            >
              <ExpandableSection
                title="Professional Details"
                initiallyOpen={false}
              >
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
              </ExpandableSection>
            </View>
          ) : null}

          {/* Lifestyle */}
          {profile.diet ||
          profile.smoking ||
          profile.drinking ||
          profile.physicalStatus ? (
            <View
              ref={lifestyleRef as any}
              onLayout={(e) =>
                setSectionY((s) => ({
                  ...s,
                  life: e.nativeEvent.layout.y - 12,
                }))
              }
            >
              <ExpandableSection title="Lifestyle" initiallyOpen={false}>
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
              </ExpandableSection>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      {!isOwnProfile && (
        <View
          style={[
            styles.actionContainer,
            { backgroundColor: theme.colors.background.primary },
          ]}
        >
          <HapticPressable
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
            accessibilityRole="button"
            accessibilityLabel={
              hasInterest ? "Remove interest" : "Send interest"
            }
            haptic={hasInterest ? "medium" : "light"}
          >
            {interestLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.text.inverse}
              />
            ) : (
              <Text style={styles.buttonText}>
                {hasInterest ? "💔 Remove Interest" : "💖 Send Interest"}
              </Text>
            )}
          </HapticPressable>

          {/* Inline hint when interest sending is gated */}
          {!hasInterest && interestsReached ? (
            <View style={{ marginTop: spacing.sm }}>
              <HintPopover
                label="Why?"
                hint={
                  "You've reached this month's free interest limit. Upgrade to continue sending interests."
                }
              />
            </View>
          ) : null}

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

      {/* Upgrade prompt for gated actions */}
      <UpgradePrompt
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        onUpgrade={(tier) => {
          setUpgradeVisible(false);
          navigation.navigate("Subscription", {
            screen: "Subscription",
            params: { tier },
          } as any);
        }}
        currentTier={subscriptionPlan}
        recommendedTier={recommendedTier}
        title={
          recommendedTier === "premiumPlus"
            ? "Premium Plus required"
            : "Upgrade required"
        }
        message={
          recommendedTier === "premiumPlus"
            ? "This feature is part of Premium Plus. Upgrade to unlock it."
            : "Upgrade to Premium to continue sending interests and unlock more features."
        }
        feature="Interests"
      />
    </ScreenContainer>
  );
}
