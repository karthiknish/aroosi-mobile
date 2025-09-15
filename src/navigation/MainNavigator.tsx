import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "@contexts/ThemeContext";
import { getScreenTransition } from "@/utils/navigationAnimations";
import { MainTabParamList, ProfileStackParamList } from "./types";
import ProfileScreen from "@screens/main/ProfileScreen";
import ProfileDetailScreen from "@screens/main/ProfileDetailScreen";
import SubscriptionScreen from "@screens/main/SubscriptionScreen";
import EditProfileScreen from "@screens/main/EditProfileScreen";
import SearchScreen from "@screens/main/SearchScreen";
import MatchesScreen from "@screens/main/MatchesScreen";
import InterestsScreen from "@screens/main/InterestsScreen";
import SettingsScreen from "@screens/settings/SettingsScreen";
import PrivacySettingsScreen from "@screens/settings/PrivacySettingsScreen";
import QuickPicksScreen from "@screens/main/QuickPicksScreen";
import NotificationSettingsScreen from "@screens/settings/NotificationSettingsScreen";
import BlockedUsersScreen from "@screens/settings/BlockedUsersScreen";
import SafetyGuidelinesScreen from "@screens/settings/SafetyGuidelinesScreen";
import AboutScreen from "@screens/settings/AboutScreen";
import IcebreakersScreen from "@screens/main/IcebreakersScreen";
import ContactScreen from "@screens/support/ContactScreen";
import AIChatbotScreen from "@screens/support/AIChatbotScreen";
import ShortlistsScreen from "@screens/main/ShortlistsScreen";
import withScreenContainer from "@components/common/withScreenContainer";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { NavGuideProvider, useNavGuide } from "../../contexts/NavGuideContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PulseView } from "@/components/ui/AnimatedComponents";

// Helper: wrap screens with ScreenContainer; allow opting out of ScrollView for list hosts
function withSC<P extends object>(
  Comp: React.ComponentType<P>,
  options?: { useScrollView?: boolean }
) {
  return withScreenContainer(Comp, {
    useScrollView: options?.useScrollView ?? true,
  }) as any; // cast to any to satisfy React Navigation's ScreenComponentType expectations
}

// (Removed unused PlaceholderScreen)

const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
// Root stack to allow Search screen navigation via central button
const RootStack = createStackNavigator();
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
      <ProfileStack.Screen
        name="About"
        component={withSC(AboutScreen)}
        options={getScreenTransition("default")}
      />
    </ProfileStack.Navigator>
  );
}

// Chat stack removed in new minimalist nav

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

// Custom Tab Bar with centered "A" action button opening Search
function CustomTabBar({ state, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { registerTarget, registerTabBar } = useNavGuide();

  // Dynamic styles (avoid recreating StyleSheet object excessively; small component)
  const tabBarHeight = Platform.select({ ios: 64, android: 68 });
  const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
  const fontFamilyRegular = Platform.select({
    ios: "NunitoSans-Regular",
    android: "NunitoSans-Regular",
  });
  const boldBrandFont = Platform.select({
    ios: "Boldonse-Regular",
    android: "Boldonse-Regular",
  });

  return (
    <View
      style={[
        customStyles.tabBar,
        {
          backgroundColor: theme.colors.background.primary,
          borderTopColor: theme.colors.border.primary,
          paddingBottom: Math.max(insets.bottom, 6),
          height: (tabBarHeight || 68) + Math.max(insets.bottom - 6, 0),
        },
        Platform.OS === "ios" && customStyles.tabBarShadowIOS,
        Platform.OS === "ios" && { shadowColor: theme.colors.neutral[900] },
        Platform.OS === "android" && { elevation: 8 },
      ]}
      accessibilityRole="tablist"
      onLayout={(e) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        registerTabBar({ x, y, width, height });
      }}
    >
      {(() => {
        const route = state.routes[0];
        const isFocused = state.index === 0;
        const iconName: keyof typeof Ionicons.glyphMap = isFocused
          ? "heart"
          : "heart-outline";
        return (
          <Pressable
            key={route.key}
            hitSlop={HIT_SLOP}
            android_ripple={{
              color: theme.colors.primary[200],
              borderless: false,
            }}
            accessibilityRole="tab"
            accessibilityLabel="Matches"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
            style={[customStyles.matchesTab, { minWidth: 72 }]}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              registerTarget("matchesTab", { x, y, width, height });
            }}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={
                isFocused
                  ? theme.colors.primary[600]
                  : theme.colors.text.secondary
              }
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={{
                marginTop: 2,
                fontSize: 12,
                fontFamily: fontFamilyRegular,
                color: isFocused
                  ? theme.colors.primary[600]
                  : theme.colors.text.secondary,
              }}
            >
              Matches
            </Text>
          </Pressable>
        );
      })()}

      <Pressable
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Open Search"
        android_ripple={{ color: theme.colors.primary[300] }}
        onPress={() => navigation.navigate("Search")}
        style={[
          customStyles.centerButton,
          {
            backgroundColor: theme.colors.primary[500],
            shadowColor:
              Platform.OS === "ios" ? theme.colors.primary[800] : undefined,
          },
          Platform.OS === "android" && { elevation: 10 },
        ]}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          registerTarget("searchButton", { x, y, width, height });
        }}
      >
        <PulseView isActive respectReduceMotion>
          <Text
            style={{
              fontFamily: boldBrandFont,
              fontSize: 26,
              color: theme.colors.text.inverse,
              lineHeight: 28,
              includeFontPadding: false,
              textAlignVertical: "center",
            }}
          >
            A
          </Text>
        </PulseView>
      </Pressable>
    </View>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      id={undefined}
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Matches" component={MatchesStackNavigator} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <NavGuideProvider>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={TabsNavigator} />
        <RootStack.Screen
          name="Search"
          component={withSC(SearchScreen)}
          options={getScreenTransition("Search")}
        />
      </RootStack.Navigator>
    </NavGuideProvider>
  );
}

const customStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 24,
  },
  tabBarShadowIOS: {
    shadowColor: "#000", // will be overridden dynamically in CustomTabBar
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  matchesTab: {
    paddingVertical: 6,
    paddingRight: 32,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    position: "absolute",
    top: -28, // lift higher for both platforms
    alignSelf: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
