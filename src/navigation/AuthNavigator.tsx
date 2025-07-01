import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Import auth screens (to be created)
import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
// import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import withScreenContainer from "@components/common/withScreenContainer";

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
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
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={withScreenContainer(LoginScreen)}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={withScreenContainer(SignUpScreen)}
        options={{ headerShown: false }}
      />
      {/* <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ title: 'Reset Password' }}
      /> */}
    </Stack.Navigator>
  );
}
