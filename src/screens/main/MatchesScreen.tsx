import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../../../utils/api";
import { useAuth } from "../../../contexts/AuthContext";
import { Colors, Layout } from "../../../constants";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  FullScreenLoading,
  ProfileCardSkeleton,
} from "@/components/ui/LoadingStates";
import { NoMatches, NoInterests } from "@/components/ui/EmptyStates";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import {
  FadeInView,
  ScaleInView,
  SlideInView,
  AnimatedButton,
  StaggeredList,
} from "@/components/ui/AnimatedComponents";
import ScreenContainer from "@components/common/ScreenContainer";
import { Profile } from "../../../types/profile";

interface MatchesScreenProps {
  navigation: any;
}

// Local types for matches and interests
interface Match extends Profile {
  conversationId?: string;
  matchedAt?: number;
  lastActivity?: number;
}

interface Interest {
  _id: string;
  fromUserId: string;
  fromProfile?: Profile;
  createdAt?: number;
}

export default function MatchesScreen({ navigation }: MatchesScreenProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const apiClient = useApiClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const response = await apiClient.getMatches();
      return response.success ? (response.data as Match[]) : [];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const {
    data: receivedInterests,
    isLoading: interestsLoading,
    error: interestsError,
    refetch: refetchInterests,
  } = useQuery<Interest[]>({
    queryKey: ["receivedInterests"],
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiClient.getReceivedInterests(userId);
      return response.success ? (response.data as Interest[]) : [];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMatches(), refetchInterests()]);
    setRefreshing(false);
  };

  const handleMatchPress = (match: Match) => {
    navigation.navigate("Chat", {
      screen: "Chat",
      params: {
        conversationId: match.conversationId,
        partnerName: match.fullName || "Unknown",
        partnerId: match.userId,
      },
    });
  };

  const handleInterestPress = (interest: Interest) => {
    navigation.navigate("ProfileDetail", { profileId: interest.fromUserId });
  };

  const handleRespondToInterest = async (
    interestId: string,
    response: "accept" | "reject"
  ) => {
    // Auto-matching system - no manual response needed
    console.warn(
      "Auto-matching system: Manual interest responses are not needed. " +
        "Matches are created automatically when mutual interest exists."
    );
  };

  const renderMatch = (match: Match, index: number) => (
    <FadeInView key={match._id} delay={index * 100}>
      <AnimatedButton
        style={[
          styles.matchCard,
          {
            backgroundColor: theme.colors.background.primary,
            borderColor: theme.colors.border.primary,
          },
        ]}
        onPress={() => handleMatchPress(match)}
        animationType="scale"
      >
        <ScaleInView delay={index * 50} fromScale={0.8}>
          <View style={styles.matchImageContainer}>
            <View
              style={[
                styles.matchImagePlaceholder,
                { backgroundColor: theme.colors.neutral[100] },
              ]}
            >
              <Text style={styles.matchImageText}>👤</Text>
            </View>
          </View>
        </ScaleInView>

        <View style={styles.matchInfo}>
          <SlideInView direction="left" delay={100 + index * 50}>
            <Text
              style={[styles.matchName, { color: theme.colors.text.primary }]}
            >
              {match.fullName || "Unknown"}
            </Text>
          </SlideInView>
          <SlideInView direction="left" delay={150 + index * 50}>
            <Text
              style={[
                styles.matchStatus,
                { color: theme.colors.text.secondary },
              ]}
            >
              {match.lastActivity ? "Recent activity" : "Say hello!"}
            </Text>
          </SlideInView>
          {match.matchedAt && (
            <SlideInView direction="left" delay={200 + index * 50}>
              <Text
                style={[
                  styles.matchTime,
                  { color: theme.colors.text.tertiary },
                ]}
              >
                Matched {new Date(match.matchedAt).toLocaleDateString()}
              </Text>
            </SlideInView>
          )}
        </View>

        <ScaleInView delay={250 + index * 50} fromScale={0.5}>
          <View style={styles.matchActions}>
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: theme.colors.primary[50] },
              ]}
            >
              <Text style={styles.unreadText}>💬</Text>
            </View>
          </View>
        </ScaleInView>
      </AnimatedButton>
    </FadeInView>
  );

  const renderInterest = (interest: Interest) => (
    <View key={interest._id} style={styles.interestCard}>
      <TouchableOpacity
        style={styles.interestProfile}
        onPress={() => handleInterestPress(interest)}
      >
        <View style={styles.interestImageContainer}>
          <View style={styles.interestImagePlaceholder}>
            <Text style={styles.interestImageText}>👤</Text>
          </View>
        </View>

        <View style={styles.interestInfo}>
          <Text style={styles.interestName}>
            {interest.fromProfile?.fullName || "Someone"} sent you an interest
          </Text>
          <Text style={styles.interestTime}>
            {new Date(interest.createdAt).toLocaleDateString()}
          </Text>
          <Text
            style={[
              styles.interestNote,
              { color: theme.colors.text.secondary },
            ]}
          >
            Auto-matching: If you also express interest, you'll match
            automatically
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (matchesLoading || interestsLoading) {
    return (
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
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
            Matches
          </Text>
        </View>
        <ProfileCardSkeleton count={3} />
      </ScreenContainer>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
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
                Matches
              </Text>
            </SlideInView>
          </View>
        </FadeInView>

        {/* Pending Interests Section */}
        {interestsError ? (
          <View style={styles.section}>
            <ApiErrorDisplay
              error={interestsError}
              onRetry={refetchInterests}
            />
          </View>
        ) : (
          receivedInterests &&
          (receivedInterests as Interest[]).length > 0 && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                New Interests
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: theme.colors.text.secondary },
                ]}
              >
                People who are interested in connecting with you
              </Text>
              {(receivedInterests as Interest[]).map(renderInterest)}
            </View>
          )
        )}

        {/* Matches Section */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Your Matches
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: theme.colors.text.secondary },
            ]}
          >
            Start conversations with your mutual matches
          </Text>

          {matchesError ? (
            <ApiErrorDisplay error={matchesError} onRetry={refetchMatches} />
          ) : !matches || (matches as Match[]).length === 0 ? (
            <NoMatches onActionPress={() => navigation.navigate("Search")} />
          ) : (
            <View style={styles.matchesList}>
              {(matches as Match[]).map((match: Match, index: number) =>
                renderMatch(match, index)
              )}
            </View>
          )}
        </View>

        {/* Show no interests state if no interests and no error */}
        {!interestsError &&
          (!receivedInterests ||
            (receivedInterests as Interest[]).length === 0) && (
            <View style={styles.section}>
              <NoInterests
                onActionPress={() => navigation.navigate("Search")}
              />
            </View>
          )}
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
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
  contentStyle: {
    flexGrow: 1,
  },
  section: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
  },
  sectionTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
  },
  matchesList: {
    paddingBottom: Layout.spacing.lg,
  },
  matchCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  matchImageContainer: {
    marginRight: Layout.spacing.md,
  },
  matchImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  matchImageText: {
    fontSize: Layout.typography.fontSize["2xl"],
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  matchStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  matchTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  matchActions: {
    alignItems: "center",
  },
  unreadBadge: {
    width: 32,
    height: 32,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    fontSize: Layout.typography.fontSize.base,
  },
  interestCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  interestProfile: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },
  interestImageContainer: {
    marginRight: Layout.spacing.md,
  },
  interestImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  interestImageText: {
    fontSize: Layout.typography.fontSize.lg,
  },
  interestInfo: {
    flex: 1,
  },
  interestName: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  interestTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  interestNote: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  interestActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Layout.spacing.lg,
  },
  interestButton: {
    width: 56,
    height: 56,
    borderRadius: Layout.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: Colors.success[50],
  },
  rejectButton: {
    backgroundColor: Colors.error[50],
  },
  acceptButtonText: {
    fontSize: Layout.typography.fontSize.xl,
  },
  rejectButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
});
