import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../../utils/api";

// Import navigators
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
import { Profile } from "../../types";
// Import screens that can be accessed globally
import ProfileDetailScreen from "../screens/main/ProfileDetailScreen";

// Import types
import { RootStackParamList } from "./types";

// Loading screen
import { View, ActivityIndicator } from "react-native";

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { userId, isLoaded } = useAuth();
  const apiClient = useApiClient();

  // Check if user has a profile using API call
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["currentProfile"],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiClient.getProfile();
      return response.success ? response.data : null;
    },
    enabled: !!userId && isLoaded,
    retry: 1,
  });

  if (!isLoaded || (userId && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const isAuthenticated = !!userId;
  const hasProfile = !!profile;
  const isOnboardingComplete =
    (profile as Profile)?.isOnboardingComplete ?? false;

  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !hasProfile || !isOnboardingComplete ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="ProfileDetail"
            component={ProfileDetailScreen}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
