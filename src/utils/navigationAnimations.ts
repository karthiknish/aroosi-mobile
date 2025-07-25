import { StackNavigationOptions } from "@react-navigation/stack";
import {
  CardStyleInterpolators,
  TransitionPresets,
} from "@react-navigation/stack";
import { Easing } from "react-native";
import type { StackCardInterpolatedStyle } from "@react-navigation/stack";

// Custom transition configurations
export const navigationAnimations = {
  // Slide from right (default iOS)
  slideFromRight: {
    ...TransitionPresets.SlideFromRightIOS,
  },

  // Slide from bottom (modal style)
  slideFromBottom: {
    ...TransitionPresets.ModalSlideFromBottomIOS,
  },

  // Fade transition
  fade: {
    cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 250,
          easing: Easing.linear,
        },
      } as const,
      close: {
        animation: "timing",
        config: {
          duration: 200,
          easing: Easing.linear,
        },
      } as const,
    },
  },

  // Scale transition
  scale: {
    cardStyleInterpolator: ({ current, layouts }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        },
      } as StackCardInterpolatedStyle;
    },
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 250,
          easing: Easing.linear,
        },
      } as const,
      close: {
        animation: "timing",
        config: {
          duration: 200,
          easing: Easing.linear,
        },
      } as const,
    },
  },

  // Flip transition
  flip: {
    cardStyleInterpolator: ({ current, layouts }: any) => {
      const rotateY = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["180deg", "0deg"],
      });

      return {
        cardStyle: {
          transform: [{ perspective: 1000 }, { rotateY }],
        },
      } as StackCardInterpolatedStyle;
    },
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 400,
          easing: Easing.linear,
        },
      } as const,
      close: {
        animation: "timing",
        config: {
          duration: 300,
          easing: Easing.linear,
        },
      } as const,
    },
  },

  // Slide up with scale
  slideUpScale: {
    cardStyleInterpolator: ({ current, layouts }: any) => {
      const { height } = layouts.screen;

      return {
        cardStyle: {
          transform: [
            {
              translateY: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [height, 0],
              }),
            },
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.8, 1],
          }),
        },
      } as StackCardInterpolatedStyle;
    },
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 350,
          easing: Easing.linear,
        },
      } as const,
      close: {
        animation: "timing",
        config: {
          duration: 250,
          easing: Easing.linear,
        },
      } as const,
    },
  },

  // Horizontal slide with opacity
  horizontalSlideOpacity: {
    cardStyleInterpolator: ({ current, layouts }: any) => {
      const { width } = layouts.screen;

      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0.7, 1],
          }),
        },
      } as StackCardInterpolatedStyle;
    },
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 250,
          easing: Easing.linear,
        },
      } as const,
      close: {
        animation: "timing",
        config: {
          duration: 200,
          easing: Easing.linear,
        },
      } as const,
    },
  },

  // Zoom transition
  zoom: {
    cardStyleInterpolator: ({ current }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.9, 1],
          }),
        },
      } as StackCardInterpolatedStyle;
    },
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 250,
          easing: Easing.linear,
        },
      } as const,
      close: {
        animation: "timing",
        config: {
          duration: 200,
          easing: Easing.linear,
        },
      } as const,
    },
  },
};

// Screen-specific animation configurations
export const getScreenTransition = (
  screenName: string
): StackNavigationOptions => {
  switch (screenName) {
    case "ProfileDetail":
      return {
        ...navigationAnimations.slideUpScale,
        presentation: "modal",
      };

    case "EditProfile":
      return {
        ...navigationAnimations.slideFromBottom,
        presentation: "modal",
      };

    case "Settings":
      return navigationAnimations.slideFromRight;

    case "Chat":
      return navigationAnimations.horizontalSlideOpacity;

    case "Search":
    case "Matches":
    case "ProfileTab":
      return navigationAnimations.fade;

    default:
      return navigationAnimations.slideFromRight;
  }
};

// Tab bar animation config
export const tabBarAnimationConfig = {
  tabBarOptions: {
    tabStyle: {
      opacity: 1,
    },
  },
  screenOptions: {
    tabBarActiveTintColor: "#EC4899",
    tabBarInactiveTintColor: "#999",
    tabBarStyle: {
      backgroundColor: "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor: "#E0E0E0",
      paddingBottom: 5,
      paddingTop: 5,
      height: 60,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: 500,
    },
    tabBarIconStyle: {
      marginBottom: 2,
    },
  },
};

// Gesture configuration for smooth navigation
export const gestureConfig = {
  gestureEnabled: true,
  gestureDirection: "horizontal" as const,
  gestureResponseDistance: {
    horizontal: 50,
    vertical: 135,
  },
};
