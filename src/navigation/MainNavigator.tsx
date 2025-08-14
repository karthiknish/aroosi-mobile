import React from "react";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useApiClient } from "../../utils/api";
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
import InterestsScreen from "@src/screens/main/InterestsScreen";
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
const MatchesStack =
  createStackNavigator<import("./types").MatchesStackParamList>();

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
  const navigation = useNavigation();
  const apiClient = useApiClient();
  const [unreadTotal, setUnreadTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    let canceled = false;
    const loadUnread = async () => {
      const res = await apiClient.getConversations();
      if (!res.success) return;
      const list = Array.isArray((res.data as any)?.conversations)
        ? (res.data as any).conversations
        : (res.data as any);
      if (!Array.isArray(list)) return;
      const total = list.reduce(
        (sum: number, conv: any) => sum + (conv.unreadCount || 0),
        0
      );
      if (!canceled) {
        setUnreadTotal(total);
        navigation.setOptions({
          tabBarBadge: total > 0 ? (total > 99 ? "99+" : total) : undefined,
        });
      }
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [apiClient, navigation]);

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

function MatchesStackNavigator() {
  return (
    <MatchesStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        ...getScreenTransition("default"),
      }}
    >
      <MatchesStack.Screen
        name="MatchesMain"
        component={SC(MatchesScreen)}
        options={getScreenTransition("MatchesMain")}
      />
      <MatchesStack.Screen
        name="Interests"
        component={SC(InterestsScreen)}
        options={getScreenTransition("Interests")}
      />
    </MatchesStack.Navigator>
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
        component={MatchesStackNavigator}
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
