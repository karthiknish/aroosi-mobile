import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useAuth } from "@contexts/AuthProvider";
import { Colors, Layout } from "@constants";
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
import { SearchFilters } from "@/types/profile";
import PaywallModal from "@components/subscription/PaywallModal";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { getPlans } from "@services/subscriptions";
import SwipeDeck from "@components/search/SwipeDeck";

interface SearchScreenProps {
  navigation: any;
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

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { theme } = useTheme();
  const apiClient = useApiClient();

  // State matching main aroosi project
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("any");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [ethnicity, setEthnicity] = useState("any");
  const [motherTongue, setMotherTongue] = useState("any");
  const [language, setLanguage] = useState("any");
  const [page, setPage] = useState(0);
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
    data: searchResults,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["searchProfiles", filters, page, pageSize],
    queryFn: async () => {
      const response = await apiClient.searchProfiles(
        { ...filters, pageSize },
        page
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error("Failed to fetch search results");
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { profiles = [], total = 0 } = searchResults || {};
  const totalPages = Math.ceil(total / pageSize);

  // Locally track uninterested profiles to avoid resurfacing within session
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const filteredProfiles = useMemo(
    () => profiles.filter((p: any) => !dismissedIds.includes(p.userId)),
    [profiles, dismissedIds]
  );

  // const handleRefresh = async () => {
  //   setPage(0);
  //   await refetch();
  // };

  const handleFilterChange = (field: string, value: string) => {
    setPage(0);
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
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        {!advancedAllowed && (
          <View
            style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.secondary,
            }}
          >
            <Text
              style={{
                color: theme.colors.text.primary,
                marginBottom: 8,
                fontWeight: "600",
              }}
            >
              Advanced filters are a Premium feature
            </Text>
            <TouchableOpacity
              style={{
                alignSelf: "flex-start",
                backgroundColor: theme.colors.primary[500],
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
              }}
              onPress={() => setShowPaywall(true)}
            >
              <Text style={{ color: theme.colors.text.inverse }}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        )}
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
              <TouchableOpacity
                key={countryOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  country === countryOption && [
                    styles.pickerOptionSelected,
                    { backgroundColor: theme.colors.primary[500] },
                  ],
                ]}
                onPress={() => handleFilterChange("country", countryOption)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    country === countryOption &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  {countryOption === "any" ? "Any Country" : countryOption}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                key={ethnicityOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  ethnicity === ethnicityOption && [
                    styles.pickerOptionSelected,
                    { backgroundColor: theme.colors.primary[500] },
                  ],
                ]}
                onPress={() => handleFilterChange("ethnicity", ethnicityOption)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    ethnicity === ethnicityOption &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  {ethnicityOption === "any"
                    ? "Any Ethnicity"
                    : ethnicityOption}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                key={tongueOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  motherTongue === tongueOption && [
                    styles.pickerOptionSelected,
                    { backgroundColor: theme.colors.primary[500] },
                  ],
                ]}
                onPress={() => handleFilterChange("motherTongue", tongueOption)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    motherTongue === tongueOption &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  {tongueOption === "any" ? "Any Mother Tongue" : tongueOption}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                key={langOption}
                style={[
                  styles.pickerOption,
                  { borderColor: theme.colors.border.primary },
                  language === langOption && [
                    styles.pickerOptionSelected,
                    { backgroundColor: theme.colors.primary[500] },
                  ],
                ]}
                onPress={() => handleFilterChange("language", langOption)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: theme.colors.text.primary },
                    language === langOption && styles.pickerOptionTextSelected,
                  ]}
                >
                  {langOption === "any" ? "Any Language" : langOption}
                </Text>
              </TouchableOpacity>
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
            Search Profiles
          </Text>
        </View>
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
                Search Profiles
              </Text>
            </SlideInView>
            <ScaleInView delay={200}>
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
            </ScaleInView>
          </View>
        </FadeInView>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Icebreaker engagement banner */}
        {((!user?.profile as any) ||
          !(user?.profile as any)?.answeredIcebreakersCount ||
          ((user?.profile as any)?.answeredIcebreakersCount as number) < 3) && (
          <View
            style={{
              marginHorizontal: Layout.spacing.lg,
              marginTop: Layout.spacing.md,
              marginBottom: Layout.spacing.sm,
              padding: Layout.spacing.md,
              borderRadius: Layout.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.primary,
            }}
          >
            <Text
              style={{
                color: theme.colors.text.primary,
                fontFamily: Layout.typography.fontFamily.serif,
                fontSize: Layout.typography.fontSize.lg,
                marginBottom: 6,
              }}
            >
              Boost your profile with icebreakers
            </Text>
            <Text
              style={{ color: theme.colors.text.secondary, marginBottom: 10 }}
            >
              Answer a few quick questions so your personality shines. Profiles
              with icebreakers get more interests.
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "ProfileTab" as any,
                  { screen: "Icebreakers" } as any
                )
              }
              style={{
                alignSelf: "flex-start",
                backgroundColor: theme.colors.primary[500],
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: theme.colors.text.inverse }}>
                Answer Icebreakers
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content: Swipe deck */}
        {filteredProfiles?.length ? (
          <SwipeDeck
            data={filteredProfiles}
            onEnd={() => {
              if (!isFetching && page < totalPages - 1) {
                setPage((p) => p + 1);
                refetch();
              }
            }}
            onOpenProfile={(id) => handleProfilePress(id)}
            onUninterested={(id) => {
              setDismissedIds((prev) =>
                prev.includes(id) ? prev : [...prev, id]
              );
            }}
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
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary[500],
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 5,
                  }}
                  onPress={() => refetch()}
                >
                  <Text style={{ color: "white" }}>Retry</Text>
                </TouchableOpacity>
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
                  setPage(0);
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
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.xs,
  },
  pickerOption: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    marginRight: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  pickerOptionText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.primary,
  },
  pickerOptionTextSelected: {
    color: Colors.text.inverse,
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
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  paginationButton: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.md,
  },
  paginationButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  paginationButtonText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.base,
  },
  paginationText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
});
