import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useClerkAuth } from "../../contexts/ClerkAuthContext";

// Import navigators
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
// import { Profile } from "../../types"; // unused
// Import screens that can be accessed globally
import ProfileDetailScreen from "../screens/main/ProfileDetailScreen";
import StartupScreen from "../screens/StartupScreen";

// Import types
import { RootStackParamList } from "./types";

// Loading screen
import { View, ActivityIndicator } from "react-native";
import { Colors } from "../../constants/Colors";

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { userId, isLoaded, profile, isLoading, isOnboardingComplete } =
    useClerkAuth();

  // Show startup splash until user presses Get Started (unauthenticated only)
  const [showStartup, setShowStartup] = React.useState(true);

  React.useEffect(() => {
    // Auto-dismiss startup once authenticated so we can route to Onboarding/Main
    if (isLoaded && userId) {
      setShowStartup(false);
    }
    // Optionally re-show on logout
    if (isLoaded && !userId) {
      setShowStartup(true);
    }
  }, [isLoaded, userId]);

  const isAuthenticated = !!userId;

  const hasProfile = !!profile;
  const isProfileLoading = !!userId && isLoading && !profile;

  // Debug navigation state
  console.log("🧭 Navigation state:", {
    isLoaded,
    userId: !!userId,
    isProfileLoading,
    hasProfile,
    isOnboardingComplete,
    // profileId omitted since not on type
  });

  if (!isLoaded || (userId && isProfileLoading)) {
    console.log("⏳ Showing loading screen");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!isAuthenticated && showStartup) {
    return <StartupScreen onGetStarted={() => setShowStartup(false)} />;
  }

  // Force remount navigator when switching between auth/onboarding/main
  const navState: "auth" | "onboarding" | "main" = !isAuthenticated
    ? "auth"
    : !hasProfile || !isOnboardingComplete
    ? "onboarding"
    : "main";

  if (!isAuthenticated) {
    console.log("🔐 Showing Auth screens");
  } else if (!hasProfile || !isOnboardingComplete) {
    console.log(
      "📝 Showing Onboarding screens - hasProfile:",
      hasProfile,
      "isOnboardingComplete:",
      isOnboardingComplete
    );
  } else {
    console.log("🏠 Showing Main screens (Search should be default)");
  }

  return (
    <Stack.Navigator
      id={undefined}
      key={navState}
      screenOptions={{ headerShown: false }}
    >
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
