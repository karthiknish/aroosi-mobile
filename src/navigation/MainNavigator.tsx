import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

// Import navigation types
import {
  MainTabParamList,
  ProfileStackParamList,
  ChatStackParamList,
} from "./types";

// Import animation configurations
import {
  getScreenTransition,
  tabBarAnimationConfig,
} from "../utils/navigationAnimations";

// Import main screens
import ProfileScreen from "../screens/main/ProfileScreen";
import ProfileDetailScreen from "../screens/main/ProfileDetailScreen";
import SubscriptionScreen from "../screens/main/SubscriptionScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";
import SearchScreen from "../screens/main/SearchScreen";
import MatchesScreen from "../screens/main/MatchesScreen";
import ConversationListScreen from "../screens/main/ConversationListScreen";
import ChatScreen from "../screens/main/ChatScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import ContactScreen from "../screens/support/ContactScreen";
import withScreenContainer from "@components/common/withScreenContainer";

// Placeholder screens for now
import { View, Text } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { useThemedStyles } from "../../contexts/ThemeContext";

const SC = withScreenContainer;

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    }}
  >
    <Text
      style={{
        fontFamily: "Boldonse-Regular",
        fontSize: 24,
        marginBottom: 16,
        textAlign: "center",
      }}
    >
      Welcome to {name}
    </Text>
    <Text
      style={{
        fontFamily: "NunitoSans-Regular",
        fontSize: 16,
        textAlign: "center",
      }}
    >
      This should use Boldonse font for the heading and Nunito Sans for body
      text.
    </Text>
  </View>
);

const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ChatStack = createStackNavigator<ChatStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        ...getScreenTransition("default"),
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={SC(ProfileScreen)}
        options={getScreenTransition("Profile")}
      />
      <ProfileStack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={getScreenTransition("ProfileDetail")}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={SC(EditProfileScreen)}
        options={getScreenTransition("EditProfile")}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SC(SettingsScreen)}
        options={getScreenTransition("Settings")}
      />
      <ProfileStack.Screen
        name="Subscription"
        component={SC(SubscriptionScreen)}
        options={getScreenTransition("Subscription")}
      />
      <ProfileStack.Screen
        name="Contact"
        component={SC(ContactScreen)}
        options={getScreenTransition("Contact")}
      />
    </ProfileStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        ...getScreenTransition("default"),
      }}
    >
      <ChatStack.Screen
        name="ConversationList"
        component={SC(ConversationListScreen)}
        options={getScreenTransition("ConversationList")}
      />
      <ChatStack.Screen
        name="Chat"
        component={SC(ChatScreen)}
        options={getScreenTransition("Chat")}
      />
    </ChatStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({
        route,
      }: {
        route: RouteProp<MainTabParamList, keyof MainTabParamList>;
      }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Search") {
            iconName = focused ? "search" : "search-outline";
          } else if (route.name === "Matches") {
            iconName = focused ? "heart" : "heart-outline";
          } else if (route.name === "Chat") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "ProfileTab") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Premium") {
            iconName = focused ? "star" : "star-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        ...tabBarAnimationConfig.screenOptions,
        tabBarLabelStyle: {
          ...tabBarAnimationConfig.screenOptions.tabBarLabelStyle,
          fontWeight: "500",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Search"
        component={SC(SearchScreen)}
        options={{ title: "Browse" }}
      />
      <Tab.Screen
        name="Matches"
        component={SC(MatchesScreen)}
        options={{ title: "Matches" }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{ title: "Messages" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: "Profile" }}
      />
      <Tab.Screen
        name="Premium"
        component={SC(SubscriptionScreen)}
        options={{ title: "Premium" }}
      />
    </Tab.Navigator>
  );
}
