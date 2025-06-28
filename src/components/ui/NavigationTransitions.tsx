import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from 'react-native';
import { StackNavigationOptions, TransitionPresets } from '@react-navigation/stack';
import { CardStyleInterpolators, HeaderStyleInterpolators } from '@react-navigation/stack';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Custom transition configurations
export const NavigationTransitions = {
  // Slide from right (default iOS style)
  slideFromRight: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'spring',
        config: {
          stiffness: 1000,
          damping: 500,
          mass: 3,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
      close: {
        animation: 'spring',
        config: {
          stiffness: 1000,
          damping: 500,
          mass: 3,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
    },
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
  },

  // Slide from bottom (modal style)
  slideFromBottom: {
    gestureDirection: 'vertical' as const,
    transitionSpec: {
      open: {
        animation: 'spring',
        config: {
          stiffness: 1000,
          damping: 500,
          mass: 3,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
      close: {
        animation: 'spring',
        config: {
          stiffness: 1000,
          damping: 500,
          mass: 3,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
    },
    cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
    headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
  },

  // Fade transition
  fade: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 300,
          easing: Easing.out(Easing.poly(4)),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 300,
          easing: Easing.in(Easing.poly(4)),
        },
      },
    },
    cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
    headerStyleInterpolator: HeaderStyleInterpolators.forFade,
  },

  // Scale transition
  scale: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'spring',
        config: {
          stiffness: 800,
          damping: 600,
          mass: 1,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
      close: {
        animation: 'spring',
        config: {
          stiffness: 800,
          damping: 600,
          mass: 1,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
      },
    },
    cardStyleInterpolator: ({ current, layouts }) => {
      return {
        cardStyle: {
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        },
      };
    },
    headerStyleInterpolator: HeaderStyleInterpolators.forFade,
  },

  // Flip transition
  flip: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 600,
          easing: Easing.out(Easing.poly(4)),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 600,
          easing: Easing.in(Easing.poly(4)),
        },
      },
    },
    cardStyleInterpolator: ({ current, layouts }) => {
      return {
        cardStyle: {
          transform: [
            {
              rotateY: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['180deg', '90deg', '0deg'],
                extrapolate: 'clamp',
              }),
            },
          ],
          backfaceVisibility: 'hidden',
        },
      };
    },
    headerStyleInterpolator: HeaderStyleInterpolators.forFade,
  },

  // Cube transition
  cube: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 400,
          easing: Easing.out(Easing.poly(4)),
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 400,
          easing: Easing.in(Easing.poly(4)),
        },
      },
    },
    cardStyleInterpolator: ({ current, next, layouts }) => {
      const translateX = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.width, 0],
        extrapolate: 'clamp',
      });

      const rotateY = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['-90deg', '0deg'],
        extrapolate: 'clamp',
      });

      return {
        cardStyle: {
          transform: [
            { perspective: 1000 },
            { translateX },
            { rotateY },
          ],
        },
      };
    },
    headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
  },
};

// Custom card style interpolators
export const CustomCardStyleInterpolators = {
  // Tinder-style swipe
  forTinderSwipe: ({ current, next, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
      extrapolate: 'clamp',
    });

    const rotate = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['15deg', '0deg'],
      extrapolate: 'clamp',
    });

    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return {
      cardStyle: {
        transform: [
          { translateX },
          { rotate },
          { scale },
        ],
      },
    };
  },

  // Elastic bounce
  forElasticBounce: ({ current, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [layouts.screen.width, -50, 0],
      extrapolate: 'clamp',
    });

    return {
      cardStyle: {
        transform: [{ translateX }],
      },
    };
  },

  // Zoom and slide
  forZoomSlide: ({ current, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
      extrapolate: 'clamp',
    });

    const scale = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 0.8, 1],
      extrapolate: 'clamp',
    });

    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    });

    return {
      cardStyle: {
        transform: [
          { translateX },
          { scale },
        ],
        opacity,
      },
    };
  },

  // Parallax effect
  forParallax: ({ current, next, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
      extrapolate: 'clamp',
    });

    const nextTranslateX = next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -layouts.screen.width * 0.3],
          extrapolate: 'clamp',
        })
      : 0;

    return {
      cardStyle: {
        transform: [
          { translateX: next ? nextTranslateX : translateX },
        ],
      },
    };
  },
};

// Transition presets for different screen types
export const ScreenTransitionPresets = {
  // For main navigation screens
  main: NavigationTransitions.slideFromRight,
  
  // For modal screens
  modal: NavigationTransitions.slideFromBottom,
  
  // For profile/detail screens
  profile: NavigationTransitions.scale,
  
  // For chat screens
  chat: NavigationTransitions.slideFromRight,
  
  // For settings screens
  settings: NavigationTransitions.fade,
  
  // For onboarding screens
  onboarding: NavigationTransitions.fade,
  
  // For dating card screens
  dating: {
    ...NavigationTransitions.slideFromRight,
    cardStyleInterpolator: CustomCardStyleInterpolators.forTinderSwipe,
  },
};

// Animated screen wrapper component
interface AnimatedScreenProps {
  children: React.ReactNode;
  animationType?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scale' | 'bounce';
  duration?: number;
  delay?: number;
}

export const AnimatedScreen: React.FC<AnimatedScreenProps> = ({
  children,
  animationType = 'fadeIn',
  duration = 300,
  delay = 0,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animatedValue, duration, delay]);

  const getAnimationStyle = () => {
    switch (animationType) {
      case 'fadeIn':
        return {
          opacity: animatedValue,
        };
      case 'slideUp':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      case 'slideDown':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      case 'bounce':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 1.1, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  return (
    <Animated.View style={[{ flex: 1 }, getAnimationStyle()]}>
      {children}
    </Animated.View>
  );
};

// Page transition component for custom transitions
interface PageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  transitionType?: 'slide' | 'fade' | 'scale' | 'flip';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  isVisible,
  transitionType = 'slide',
  direction = 'right',
  duration = 300,
}) => {
  const animatedValue = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isVisible ? 1 : 0,
      duration,
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: true,
    }).start();
  }, [isVisible, animatedValue, duration]);

  const getTransitionStyle = () => {
    switch (transitionType) {
      case 'slide':
        const getSlideTransform = () => {
          switch (direction) {
            case 'left':
              return {
                translateX: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenWidth, 0],
                  extrapolate: 'clamp',
                }),
              };
            case 'right':
              return {
                translateX: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenWidth, 0],
                  extrapolate: 'clamp',
                }),
              };
            case 'up':
              return {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenHeight, 0],
                  extrapolate: 'clamp',
                }),
              };
            case 'down':
              return {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenHeight, 0],
                  extrapolate: 'clamp',
                }),
              };
            default:
              return {};
          }
        };
        return {
          opacity: animatedValue,
          transform: [getSlideTransform()] as any,
        };
      case 'fade':
        return {
          opacity: animatedValue,
        };
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      case 'flip':
        return {
          opacity: animatedValue,
          transform: [
            {
              rotateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['90deg', '0deg'],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  return (
    <Animated.View style={[{ flex: 1 }, getTransitionStyle()]}>
      {children}
    </Animated.View>
  );
};

// Hook for managing screen transitions
export const useScreenTransition = (isVisible: boolean, duration = 300) => {
  const animatedValue = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isVisible ? 1 : 0,
      duration,
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: true,
    }).start();
  }, [isVisible, animatedValue, duration]);

  return animatedValue;
};

export default {
  NavigationTransitions,
  CustomCardStyleInterpolators,
  ScreenTransitionPresets,
  AnimatedScreen,
  PageTransition,
  useScreenTransition,
};