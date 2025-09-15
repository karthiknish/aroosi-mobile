import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useAuth } from "@contexts/AuthProvider";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { ProfileCardSkeleton } from "@/components/ui/LoadingStates";
import { NoSearchResults } from "@/components/ui/EmptyStates";
import { ErrorBoundary } from "@/components/ui/ErrorHandling";
import {
  FadeInView,
  ScaleInView,
  SlideInView,
  AnimatedButton,
} from "@/components/ui/AnimatedComponents";
import { SearchFilters, SearchResponse } from "@/types/profile";
import PaywallModal from "@components/subscription/PaywallModal";
import { useInterests } from "@/hooks/useInterests";
import PremiumFeatureGuard from "@components/subscription/PremiumFeatureGuard";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { getPlans } from "@services/subscriptions";
import SwipeDeck from "@components/search/SwipeDeck";
import AppHeader from "@/components/common/AppHeader";
import HintPopover from "@/components/ui/HintPopover";
import HapticPressable from "@/components/ui/HapticPressable";

interface SearchScreenProps {
  navigation: any;
  route?: any;
}

// Filter options matching main aroosi project
const commonCountries = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Afghanistan",
  "United Arab Emirates",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Germany",
  "France",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Italy",
  "Spain",
  "Portugal",
  "Ireland",
  "Other",
];

const ethnicityOptions = [
  "any",
  "Pashtun",
  "Tajik",
  "Hazara",
  "Uzbek",
  "Turkmen",
  "Nuristani",
  "Aimaq",
  "Baloch",
  "Sadat",
];

const motherTongueOptions = [
  "any",
  "Pashto",
  "Dari",
  "Uzbeki",
  "Turkmeni",
  "Nuristani",
  "Balochi",
];

const languageOptions = [
  "any",
  "English",
  "Pashto",
  "Dari",
  "Farsi",
  "Urdu",
  "Arabic",
  "German",
  "Turkish",
];

// Age calculated inside SwipeDeck cards when needed

export default function SearchScreen({ navigation, route }: SearchScreenProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { theme } = useTheme();
  const apiClient = useApiClient();
  const { sentInterests } = useInterests();

  // State matching main aroosi project
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("any");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [ethnicity, setEthnicity] = useState("any");
  const [motherTongue, setMotherTongue] = useState("any");
  const [language, setLanguage] = useState("any");
  const [pageSize] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  // const [refreshing, setRefreshing] = useState(false);

  // Entitlement gating for advanced search
  const { checkFeatureAccess } = useFeatureAccess();
  const [advancedAllowed, setAdvancedAllowed] = useState<boolean>(true);
  const [advancedLoading, setAdvancedLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAdvancedLoading(true);
        const res = await checkFeatureAccess("canUseAdvancedFilters" as any);
        if (mounted) setAdvancedAllowed(!!res.allowed);
      } catch {
        if (mounted) setAdvancedAllowed(true);
      } finally {
        if (mounted) setAdvancedLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [checkFeatureAccess]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      features?: string[];
      popular?: boolean;
    }>
  >([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    // Preload plans when opening paywall
    if (showPaywall && plans.length === 0 && !loadingPlans) {
      (async () => {
        try {
          setLoadingPlans(true);
          const p = await getPlans();
          setPlans(p);
        } catch {
          setPlans([]);
        } finally {
          setLoadingPlans(false);
        }
      })();
    }
  }, [showPaywall, plans.length, loadingPlans]);

  // Auto-open advanced filters on mount via route param
  useEffect(() => {
    const shouldOpen = !!route?.params?.openAdvancedFilters;
    if (shouldOpen) {
      if (advancedAllowed) {
        setShowFilters(true);
      } else {
        setShowPaywall(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.openAdvancedFilters, advancedAllowed]);

  // Build filters object
  const filters: SearchFilters = useMemo(
    () => ({
      city: city || undefined,
      country: country === "any" ? undefined : country,
      ageMin: ageMin ? parseInt(ageMin) : undefined,
      ageMax: ageMax ? parseInt(ageMax) : undefined,
      ethnicity: ethnicity === "any" ? undefined : ethnicity,
      motherTongue: motherTongue === "any" ? undefined : motherTongue,
      language: language === "any" ? undefined : language,
    }),
    [city, country, ageMin, ageMax, ethnicity, motherTongue, language]
  );

  const {
    data: infiniteData,
    isLoading,
    error,
    refetch,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<
    SearchResponse,
    Error,
    InfiniteData<SearchResponse, string | undefined>,
    (string | number | SearchFilters)[],
    string | undefined
  >({
    queryKey: ["searchProfiles", filters, pageSize],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.searchProfiles(
        { ...filters, pageSize, cursor: pageParam as any },
        0
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error("Failed to fetch search results");
    },
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: undefined,
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const profiles = useMemo(
    () =>
      (infiniteData?.pages || []).flatMap((p: SearchResponse) =>
        Array.isArray(p?.profiles) ? p.profiles : []
      ),
    [infiniteData]
  );

  // Locally track uninterested profiles to avoid resurfacing within session
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  // Exclude users you've already sent interest to
  const sentToIds = useMemo(
    () => (sentInterests || []).map((i) => i.toUserId),
    [sentInterests]
  );
  const filteredProfiles = useMemo(
    () =>
      profiles.filter(
        (p: any) =>
          !dismissedIds.includes(p.userId) && !sentToIds.includes(p.userId)
      ),
    [profiles, dismissedIds, sentToIds]
  );

  // const handleRefresh = async () => {
  //   setPage(0);
  //   await refetch();
  // };

  const handleFilterChange = (field: string, value: string) => {
    switch (field) {
      case "city":
        setCity(value);
        break;
      case "country":
        setCountry(value);
        break;
      case "ageMin":
        setAgeMin(value);
        break;
      case "ageMax":
        setAgeMax(value);
        break;
      case "ethnicity":
        setEthnicity(value);
        break;
      case "motherTongue":
        setMotherTongue(value);
        break;
      case "language":
        setLanguage(value);
        break;
    }
  };

  const handleProfilePress = (profileId: string) => {
    navigation.navigate("ProfileDetail", { profileId });
  };

  // List rendering removed (replaced by SwipeDeck)

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
        <PremiumFeatureGuard
          feature="canUseAdvancedFilters"
          mode="inline"
          message="Advanced filters are a Premium feature"
          onUpgrade={() => setShowPaywall(true)}
        />
        <Text
          style={[styles.filtersTitle, { color: theme.colors.text.primary }]}
        >
          Filters
        </Text>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text
              style={[styles.filterLabel, { color: theme.colors.text.primary }]}
            >
              City
            </Text>
            <TextInput
              style={[
                styles.filterInput,
                {
                  borderColor: theme.colors.border.primary,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary,
                },
              ]}
              placeholder="Enter city"
              placeholderTextColor={theme.colors.text.secondary}
              value={city}
              onChangeText={(value) => handleFilterChange("city", value)}
            />
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text
            style={[styles.filterLabel, { color: theme.colors.text.primary }]}
          >
            Country
          </Text>
          <View style={styles.pickerContainer}>
            {["any", ...commonCountries].map((countryOption) => (
              <HapticPressable
                key={countryOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  country === countryOption && {
                    backgroundColor: theme.colors.primary[500],
                    borderColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => handleFilterChange("country", countryOption)}
                haptic="selection"
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    country === countryOption && {
                      color: theme.colors.text.inverse,
                    },
                  ]}
                >
                  {countryOption === "any" ? "Any Country" : countryOption}
                </Text>
              </HapticPressable>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text
              style={[styles.filterLabel, { color: theme.colors.text.primary }]}
            >
              Age Range
            </Text>
            <View style={styles.ageRangeContainer}>
              <TextInput
                style={[
                  styles.ageInput,
                  {
                    borderColor: theme.colors.border.primary,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background.primary,
                  },
                ]}
                placeholder="Min"
                placeholderTextColor={theme.colors.text.secondary}
                value={ageMin}
                onChangeText={(value) => handleFilterChange("ageMin", value)}
                keyboardType="numeric"
              />
              <Text
                style={[
                  styles.ageRangeSeparator,
                  { color: theme.colors.text.secondary },
                ]}
              >
                -
              </Text>
              <TextInput
                style={[
                  styles.ageInput,
                  {
                    borderColor: theme.colors.border.primary,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background.primary,
                  },
                ]}
                placeholder="Max"
                placeholderTextColor={theme.colors.text.secondary}
                value={ageMax}
                onChangeText={(value) => handleFilterChange("ageMax", value)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text
            style={[styles.filterLabel, { color: theme.colors.text.primary }]}
          >
            Ethnicity
          </Text>
          <View style={styles.pickerContainer}>
            {ethnicityOptions.map((ethnicityOption) => (
              <HapticPressable
                key={ethnicityOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  ethnicity === ethnicityOption && {
                    backgroundColor: theme.colors.primary[500],
                    borderColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => handleFilterChange("ethnicity", ethnicityOption)}
                haptic="selection"
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    ethnicity === ethnicityOption && {
                      color: theme.colors.text.inverse,
                    },
                  ]}
                >
                  {ethnicityOption === "any"
                    ? "Any Ethnicity"
                    : ethnicityOption}
                </Text>
              </HapticPressable>
            ))}
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text
            style={[styles.filterLabel, { color: theme.colors.text.primary }]}
          >
            Mother Tongue
          </Text>
          <View style={styles.pickerContainer}>
            {motherTongueOptions.map((tongueOption) => (
              <HapticPressable
                key={tongueOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  motherTongue === tongueOption && {
                    backgroundColor: theme.colors.primary[500],
                    borderColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => handleFilterChange("motherTongue", tongueOption)}
                haptic="selection"
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    motherTongue === tongueOption && {
                      color: theme.colors.text.inverse,
                    },
                  ]}
                >
                  {tongueOption === "any" ? "Any Mother Tongue" : tongueOption}
                </Text>
              </HapticPressable>
            ))}
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text
            style={[styles.filterLabel, { color: theme.colors.text.primary }]}
          >
            Language
          </Text>
          <View style={styles.pickerContainer}>
            {languageOptions.map((langOption) => (
              <HapticPressable
                key={langOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  language === langOption && {
                    backgroundColor: theme.colors.primary[500],
                    borderColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => handleFilterChange("language", langOption)}
                haptic="selection"
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    language === langOption && {
                      color: theme.colors.text.inverse,
                    },
                  ]}
                >
                  {langOption === "any" ? "Any Language" : langOption}
                </Text>
              </HapticPressable>
            ))}
          </View>
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

  // Pagination handled by deck end

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <AppHeader title="Search Profiles" />
        <ProfileCardSkeleton count={6} />
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
        <AppHeader
          title="Search Profiles"
          rightActions={
            <AnimatedButton
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.primary[50] },
              ]}
              onPress={() => {
                if (advancedLoading) return;
                if (!advancedAllowed) {
                  setShowPaywall(true);
                  return;
                }
                setShowFilters(!showFilters);
              }}
              animationType="bounce"
            >
              <Text style={styles.filterButtonText}>🔍</Text>
            </AnimatedButton>
          }
        />

        {!advancedAllowed && (
          <View style={{ paddingHorizontal: Layout.spacing.lg, marginTop: 6 }}>
            <HintPopover
              label="Why?"
              hint={
                "Advanced filters are a Premium feature. Upgrade to unlock detailed search filters."
              }
            />
          </View>
        )}

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Icebreaker engagement banner removed as requested */}

        {/* Content: Swipe deck */}
        {filteredProfiles?.length ? (
          <SwipeDeck
            data={filteredProfiles}
            onEnd={() => {
              if (!isFetchingNextPage && hasNextPage) {
                fetchNextPage();
              }
            }}
            onOpenProfile={(id) => handleProfilePress(id)}
            onUninterested={(id) => {
              setDismissedIds((prev) =>
                prev.includes(id) ? prev : [...prev, id]
              );
            }}
            onRestore={(id) =>
              setDismissedIds((prev) => prev.filter((x) => x !== id))
            }
          />
        ) : (
          <View style={{ padding: 20, alignItems: "center" }}>
            {error ? (
              <>
                <Text
                  style={{
                    color: theme.colors.text.secondary,
                    marginBottom: 10,
                  }}
                >
                  Error loading profiles. Please try again.
                </Text>
                <HapticPressable
                  style={{
                    backgroundColor: theme.colors.primary[500],
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 5,
                  }}
                  onPress={() => refetch()}
                  haptic="light"
                >
                  <Text style={{ color: theme.colors.text.inverse }}>
                    Retry
                  </Text>
                </HapticPressable>
              </>
            ) : (
              <NoSearchResults
                onActionPress={() => {
                  setCity("");
                  setCountry("any");
                  setAgeMin("");
                  setAgeMax("");
                  setEthnicity("any");
                  setMotherTongue("any");
                  setLanguage("any");
                  refetch();
                }}
              />
            )}
          </View>
        )}
        {/* Paywall for advanced search */}
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onUpgrade={() => {
            setShowPaywall(false);
            // Optional: navigate to Subscription screen, e.g., navigation.navigate('Subscription')
          }}
          title="Unlock Advanced Search"
          subtitle="Upgrade your plan to access advanced filters and find better matches."
          plans={plans}
          loading={loadingPlans}
          recommendedPlanId={plans.find((p) => p.popular)?.id}
        />
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
  },
  filterButton: {
    padding: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  filterButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
  filtersContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderBottomWidth: 1,
  },
  filtersTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
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
    marginBottom: Layout.spacing.xs,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
  },
  ageRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    textAlign: "center",
  },
  ageRangeSeparator: {
    marginHorizontal: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.xs,
  },
  pickerOption: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    marginRight: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },
  pickerOptionText: {
    fontSize: Layout.typography.fontSize.sm,
  },
  applyFiltersButton: {
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    marginTop: Layout.spacing.md,
  },
  applyFiltersText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  // pagination styles removed; pagination handled by deck
});
