import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "@contexts/AuthProvider";

// Import navigators
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
// import { Profile } from "@/types"; // unused
// Import screens that can be accessed globally
import ProfileDetailScreen from "@screens/main/ProfileDetailScreen";
import StartupScreen from "@screens/StartupScreen";

// Import types
import { RootStackParamList } from "./types";

// Loading screen
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@constants/Colors";

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const userId = user?.id;
  const profile = user?.profile;

  // Show startup splash until user presses Get Started (unauthenticated only)
  const [showStartup, setShowStartup] = React.useState(true);

  React.useEffect(() => {
    // Auto-dismiss startup once authenticated so we can route to Onboarding/Main
    if (userId) {
      setShowStartup(false);
    } else {
      setShowStartup(true);
    }
  }, [userId]);

  const isAuthenticated = !!userId;

  const hasProfile = !!profile;
  const isProfileLoading = !!userId && isLoading && !profile;

  // Debug navigation state
  console.log("🧭 Navigation state:", {
    userId: !!userId,
    isProfileLoading,
    hasProfile,
    // profileId omitted since not on type
  });

  if (isLoading || (userId && isProfileLoading)) {
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
  // Unauthenticated users land on Auth (Login) after Get Started; Onboarding is still accessible via links
  const navState: "auth" | "onboarding" | "main" = !isAuthenticated
    ? "auth"
    : !hasProfile
    ? "onboarding"
    : "main";

  if (!isAuthenticated) {
    console.log("🔐 Showing Auth screens");
  } else if (!hasProfile) {
    console.log("📝 Showing Onboarding screens - hasProfile:", hasProfile);
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
        <>
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        </>
      ) : !hasProfile ? (
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
