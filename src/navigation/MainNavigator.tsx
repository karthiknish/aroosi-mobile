import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useApiClient } from "@/utils/api";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
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
} from "@/utils/navigationAnimations";

// Import main screens
import ProfileScreen from "@screens/main/ProfileScreen";
import ProfileDetailScreen from "@screens/main/ProfileDetailScreen";
import SubscriptionScreen from "@screens/main/SubscriptionScreen";
import EditProfileScreen from "@screens/main/EditProfileScreen";
import SearchScreen from "@screens/main/SearchScreen";
import MatchesScreen from "@screens/main/MatchesScreen";
import InterestsScreen from "@screens/main/InterestsScreen";
import ConversationListScreen from "@screens/main/ConversationListScreen";
import ChatScreen from "@screens/main/ChatScreen";
import SettingsScreen from "@screens/settings/SettingsScreen";
import PrivacySettingsScreen from "@screens/settings/PrivacySettingsScreen";
import IcebreakersScreen from "@screens/main/IcebreakersScreen";
import ContactScreen from "@screens/support/ContactScreen";
import AIChatbotScreen from "@screens/support/AIChatbotScreen";
import ShortlistsScreen from "@screens/main/ShortlistsScreen";
import QuickPicksScreen from "@screens/main/QuickPicksScreen";
import NotificationSettingsScreen from "@screens/settings/NotificationSettingsScreen";
import BlockedUsersScreen from "@screens/settings/BlockedUsersScreen";
import SafetyGuidelinesScreen from "@screens/settings/SafetyGuidelinesScreen";
import withScreenContainer from "@components/common/withScreenContainer";
import { TabBarProvider } from "@contexts/TabBarContext";

// Placeholder screens for now
import { View, Text } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper: wrap screens with ScreenContainer; allow opting out of ScrollView for list hosts
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
        component={withSC(ProfileScreen, { useScrollView: false })}
        options={getScreenTransition("Profile")}
      />
      <ProfileStack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={getScreenTransition("ProfileDetail")}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={withSC(EditProfileScreen, { useScrollView: false })}
        options={getScreenTransition("EditProfile")}
      />
      <ProfileStack.Screen
        name="Settings"
        component={withSC(SettingsScreen)}
        options={getScreenTransition("Settings")}
      />
      <ProfileStack.Screen
        name="Privacy"
        component={withSC(PrivacySettingsScreen)}
        options={getScreenTransition("default")}
      />
      <ProfileStack.Screen
        name="Subscription"
        component={withSC(SubscriptionScreen)}
        options={getScreenTransition("Subscription")}
      />
      <ProfileStack.Screen
        name="Icebreakers"
        component={withSC(IcebreakersScreen)}
        options={getScreenTransition("default")}
      />
      <ProfileStack.Screen
        name="Contact"
        component={withSC(ContactScreen)}
        options={getScreenTransition("Contact")}
      />
      <ProfileStack.Screen
        name="AIChatbot"
        component={withSC(AIChatbotScreen)}
        options={getScreenTransition("default")}
      />
      <ProfileStack.Screen
        name="Shortlists"
        component={withSC(ShortlistsScreen, { useScrollView: false })}
        options={getScreenTransition("default")}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={withSC(NotificationSettingsScreen)}
        options={getScreenTransition("default")}
      />
      <ProfileStack.Screen
        name="BlockedUsers"
        component={withSC(BlockedUsersScreen, { useScrollView: false })}
        options={getScreenTransition("default")}
      />
      <ProfileStack.Screen
        name="Safety"
        component={withSC(SafetyGuidelinesScreen)}
        options={getScreenTransition("default")}
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
        component={withSC(ConversationListScreen, { useScrollView: false })}
        options={getScreenTransition("ConversationList")}
      />
      <ChatStack.Screen
        name="Chat"
        component={withSC(ChatScreen, { useScrollView: false })}
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
        component={withSC(MatchesScreen, { useScrollView: false })}
        options={getScreenTransition("MatchesMain")}
      />
      <MatchesStack.Screen
        name="Interests"
        component={withSC(InterestsScreen, { useScrollView: false })}
        options={getScreenTransition("Interests")}
      />
      <MatchesStack.Screen
        name="QuickPicks"
        component={withSC(QuickPicksScreen)}
        options={getScreenTransition("default")}
      />
    </MatchesStack.Navigator>
  );
}

export default function MainNavigator() {
  const insets = useSafeAreaInsets();
  const baseHeight = 60;
  const computedTabHeight = baseHeight + insets.bottom;
  return (
    <TabBarProvider height={computedTabHeight}>
      <Tab.Navigator
        id={undefined}
        screenOptions={({
          route,
        }: {
          route: RouteProp<MainTabParamList, keyof MainTabParamList>;
        }): BottomTabNavigationOptions => ({
          tabBarIcon: ({
            focused,
            color,
            size,
          }: {
            focused: boolean;
            color: string;
            size: number;
          }) => {
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
          tabBarStyle: {
            ...tabBarAnimationConfig.screenOptions.tabBarStyle,
            // Ensure the tab bar sits fully inside the safe area on devices with a home indicator
            paddingBottom: (
              tabBarAnimationConfig.screenOptions.tabBarStyle as any
            )?.paddingBottom
              ? (tabBarAnimationConfig.screenOptions.tabBarStyle as any)
                  .paddingBottom + insets.bottom
              : insets.bottom + 5,
            height: (tabBarAnimationConfig.screenOptions.tabBarStyle as any)
              ?.height
              ? (tabBarAnimationConfig.screenOptions.tabBarStyle as any)
                  .height + insets.bottom
              : computedTabHeight,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Search"
          component={withSC(SearchScreen)}
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
          component={withSC(SubscriptionScreen)}
          options={{ title: "Premium" }}
        />
      </Tab.Navigator>
    </TabBarProvider>
  );
}
