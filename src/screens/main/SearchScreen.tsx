import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../../../utils/api";
import { useAuth } from "@clerk/clerk-expo";
import { Colors, Layout } from "../../../constants";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  FullScreenLoading,
  ProfileCardSkeleton,
} from "@/components/ui/LoadingStates";
import { NoSearchResults, NetworkError } from "@/components/ui/EmptyStates";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import {
  FadeInView,
  ScaleInView,
  SlideInView,
  AnimatedButton,
  HeartButton,
  StaggeredList,
} from "@/components/ui/AnimatedComponents";
import { Profile } from "../../../types/profile";

interface SearchScreenProps {
  navigation: any;
}

interface SearchFilters {
  ageMin: string;
  ageMax: string;
  location: string;
  education: string;
  religion: string;
}

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const apiClient = useApiClient();
  const [filters, setFilters] = useState<SearchFilters>({
    ageMin: "18",
    ageMax: "35",
    location: "",
    education: "",
    religion: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: profiles = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<Profile[], Error>({
    queryKey: ["searchProfiles", filters],
    queryFn: async () => {
      const response = await apiClient.searchProfiles(filters);
      return response.success ? (response.data as Profile[]) : [];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfilePress = (profileId: string) => {
    navigation.navigate("ProfileDetail", { profileId });
  };

  const renderProfile = (profile: any, index: number) => (
    <FadeInView key={profile._id} delay={index * 100} duration={300}>
      <ScaleInView delay={index * 50}>
        <AnimatedButton
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.primary,
            },
          ]}
          onPress={() => handleProfilePress(profile._id)}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={styles.profileImageContainer}>
            {profile.images && profile.images.length > 0 ? (
              <ScaleInView delay={200 + index * 50} fromScale={0.5}>
                <View
                  style={[
                    styles.profileImagePlaceholder,
                    { backgroundColor: theme.colors.neutral[100] },
                  ]}
                >
                  <Text style={styles.profileImageText}>📷</Text>
                </View>
              </ScaleInView>
            ) : (
              <ScaleInView delay={200 + index * 50} fromScale={0.5}>
                <View
                  style={[
                    styles.profileImagePlaceholder,
                    { backgroundColor: theme.colors.neutral[100] },
                  ]}
                >
                  <Text style={styles.profileImageText}>👤</Text>
                </View>
              </ScaleInView>
            )}
          </View>

          <View style={styles.profileInfo}>
            <SlideInView
              direction="left"
              delay={300 + index * 50}
              distance={20}
            >
              <Text
                style={[
                  styles.profileName,
                  { color: theme.colors.text.primary },
                ]}
              >
                {profile.firstName} {profile.lastName}
              </Text>
            </SlideInView>
            {profile.age && (
              <SlideInView
                direction="left"
                delay={350 + index * 50}
                distance={15}
              >
                <Text
                  style={[
                    styles.profileAge,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  {profile.age} years old
                </Text>
              </SlideInView>
            )}
            {profile.location && (
              <SlideInView
                direction="left"
                delay={400 + index * 50}
                distance={10}
              >
                <Text
                  style={[
                    styles.profileLocation,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  {profile.location}
                </Text>
              </SlideInView>
            )}
            {profile.bio && (
              <SlideInView
                direction="left"
                delay={450 + index * 50}
                distance={5}
              >
                <Text
                  style={[
                    styles.profileBio,
                    { color: theme.colors.text.secondary },
                  ]}
                  numberOfLines={2}
                >
                  {profile.bio}
                </Text>
              </SlideInView>
            )}
          </View>

          <View style={styles.profileActions}>
            <ScaleInView delay={500 + index * 50} fromScale={0.3}>
              <HeartButton
                isLiked={false}
                onToggle={() => {
                  // Handle like action
                  console.log("Liked profile:", profile._id);
                }}
                size={24}
                likedColor={theme.colors.primary[500]}
                unlikedColor={theme.colors.neutral[400]}
              />
            </ScaleInView>
          </View>
        </AnimatedButton>
      </ScaleInView>
    </FadeInView>
  );

  const renderFilters = () => (
    <SlideInView direction="down" duration={300}>
      <View
        style={[
          styles.filtersContainer,
          {
            backgroundColor: theme.colors.background.primary,
            borderBottomColor: theme.colors.border.primary,
          },
        ]}
      >
        <Text style={styles.filtersTitle}>Search Filters</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Age Range</Text>
            <View style={styles.ageRangeContainer}>
              <TextInput
                style={styles.ageInput}
                value={filters.ageMin}
                onChangeText={(value) => handleFilterChange("ageMin", value)}
                placeholder="18"
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.ageRangeSeparator}>-</Text>
              <TextInput
                style={styles.ageInput}
                value={filters.ageMax}
                onChangeText={(value) => handleFilterChange("ageMax", value)}
                placeholder="35"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Location</Text>
          <TextInput
            style={styles.filterInput}
            value={filters.location}
            onChangeText={(value) => handleFilterChange("location", value)}
            placeholder="Enter city or area"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Education</Text>
          <TextInput
            style={styles.filterInput}
            value={filters.education}
            onChangeText={(value) => handleFilterChange("education", value)}
            placeholder="Education level or field"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Religion</Text>
          <TextInput
            style={styles.filterInput}
            value={filters.religion}
            onChangeText={(value) => handleFilterChange("religion", value)}
            placeholder="Religious preference"
            autoCapitalize="words"
          />
        </View>

        <AnimatedButton
          style={[
            styles.applyFiltersButton,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={() => {
            setShowFilters(false);
            refetch();
          }}
          animationType="scale"
        >
          <Text
            style={[
              styles.applyFiltersText,
              { color: theme.colors.text.inverse },
            ]}
          >
            Apply Filters
          </Text>
        </AnimatedButton>
      </View>
    </SlideInView>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.background.primary,
              borderBottomColor: theme.colors.border.primary,
            },
          ]}
        >
          <Text
            style={[styles.headerTitle, { color: theme.colors.text.primary }]}
          >
            Discover
          </Text>
        </View>
        <ProfileCardSkeleton count={3} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        {/* Header */}
        <FadeInView>
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.colors.background.primary,
                borderBottomColor: theme.colors.border.primary,
              },
            ]}
          >
            <SlideInView direction="left" delay={100}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                Discover
              </Text>
            </SlideInView>
            <ScaleInView delay={200}>
              <AnimatedButton
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.primary[50] },
                ]}
                onPress={() => setShowFilters(!showFilters)}
                animationType="bounce"
              >
                <Text style={styles.filterButtonText}>🔍</Text>
              </AnimatedButton>
            </ScaleInView>
          </View>
        </FadeInView>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
        >
          {error ? (
            <ApiErrorDisplay error={error} onRetry={refetch} />
          ) : !profiles || profiles.length === 0 ? (
            <NoSearchResults
              onActionPress={() => {
                setFilters({
                  ageMin: "18",
                  ageMax: "35",
                  location: "",
                  education: "",
                  religion: "",
                });
                refetch();
              }}
            />
          ) : (
            <View style={styles.profilesList}>
              {isFetching && !refreshing && (
                <FadeInView>
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary[500]}
                    />
                  </View>
                </FadeInView>
              )}
              {profiles.map((profile, index) => renderProfile(profile, index))}
            </View>
          )}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 10,
    right: 20,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  headerTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  filterButton: {
    padding: Layout.spacing.sm,
    backgroundColor: Colors.primary[50],
    borderRadius: Layout.radius.md,
  },
  filterButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
  filtersContainer: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  filtersTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: Layout.spacing.md,
  },
  filterItem: {
    flex: 1,
    marginBottom: Layout.spacing.md,
  },
  filterLabel: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    backgroundColor: Colors.background.primary,
  },
  ageRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    backgroundColor: Colors.background.primary,
    textAlign: "center",
  },
  ageRangeSeparator: {
    marginHorizontal: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  applyFiltersButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    marginTop: Layout.spacing.md,
  },
  applyFiltersText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  profilesList: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  profileImageContainer: {
    marginRight: Layout.spacing.md,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: Layout.typography.fontSize["2xl"],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  profileAge: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  profileLocation: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  profileBio: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  profileActions: {
    alignItems: "center",
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
});
