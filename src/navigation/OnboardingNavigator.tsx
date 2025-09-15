import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Import onboarding screens
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import ProfileSetupScreen from "../screens/onboarding/ProfileSetupScreen";
import OnboardingChecklistScreen from "../screens/onboarding/OnboardingChecklistScreen";
import OnboardingCompleteScreen from "../screens/onboarding/OnboardingCompleteScreen";
import withScreenContainer from "@components/common/withScreenContainer";
import { getScreenTransition } from "@/utils/navigationAnimations";

const withSC = <P extends object>(
  Comp: React.ComponentType<P>,
  options?: { useScrollView?: boolean }
) => {
  const Wrapped: React.FC<P> = (props) => {
    const C = withScreenContainer(Comp, {
      useScrollView: options?.useScrollView ?? true,
    });
    return <C {...props} />;
  };
  return Wrapped;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: { step?: number };
  OnboardingComplete: undefined;
  OnboardingChecklist: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        ...getScreenTransition("default"),
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen
        name="ProfileSetup"
        component={withSC(ProfileSetupScreen, { useScrollView: false })}
      />
      <Stack.Screen
        name="OnboardingComplete"
        component={withSC(OnboardingCompleteScreen)}
      />
      <Stack.Screen
        name="OnboardingChecklist"
        component={withSC(OnboardingChecklistScreen)}
      />
    </Stack.Navigator>
  );
}
