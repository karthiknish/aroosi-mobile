import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Layout } from "@constants";

// Import auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import withScreenContainer from "@components/common/withScreenContainer";

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f8f8f8",
        },
        headerTintColor: "#333",
        headerTitleStyle: {
          fontFamily: Layout.typography.fontFamily.serif,
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={withScreenContainer(LoginScreen)}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={withScreenContainer(ForgotPasswordScreen)}
        options={{ headerShown: true, title: "Reset Password" }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={withScreenContainer(ResetPasswordScreen)}
        options={{ headerShown: true, title: "Reset Password" }}
      />
    </Stack.Navigator>
  );
}
