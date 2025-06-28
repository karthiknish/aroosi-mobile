import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../../contexts/AuthContext";

// Import navigators
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
import { Profile } from "../../types";
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
  const {
    userId,
    isLoaded,
    profile,
    isProfileLoading,
    hasProfile,
    isOnboardingComplete,
  } = useAuth();

  // Show startup splash until user presses Get Started
  const [showStartup, setShowStartup] = React.useState(true);

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

  if (showStartup) {
    return <StartupScreen onGetStarted={() => setShowStartup(false)} />;
  }

  const isAuthenticated = !!userId;

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
