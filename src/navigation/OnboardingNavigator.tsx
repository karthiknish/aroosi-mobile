import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Import onboarding screens
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import ProfileSetupScreen from "../screens/onboarding/ProfileSetupScreen";
import OnboardingCompleteScreen from "../screens/onboarding/OnboardingCompleteScreen";
import withScreenContainer from "@components/common/withScreenContainer";

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: { step?: number };
  OnboardingComplete: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen
        name="ProfileSetup"
        component={withScreenContainer(ProfileSetupScreen)}
      />
      <Stack.Screen
        name="OnboardingComplete"
        component={withScreenContainer(OnboardingCompleteScreen)}
      />
    </Stack.Navigator>
  );
}
