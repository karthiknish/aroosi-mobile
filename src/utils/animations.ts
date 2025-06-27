import { Animated, Easing } from 'react-native';

// Animation duration constants
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 250,
  slow: 350,
  page: 300,
  bounce: 400,
} as const;

// Easing presets
export const EASING_PRESETS = {
  ease: Easing.ease,
  easeIn: Easing.in(Easing.quad),
  easeOut: Easing.out(Easing.quad),
  easeInOut: Easing.inOut(Easing.quad),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
  spring: Easing.bezier(0.68, -0.55, 0.265, 1.55),
} as const;

// Fade animations
export const createFadeInAnimation = (
  animatedValue: Animated.Value,
  duration: number = ANIMATION_DURATIONS.normal,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    easing: EASING_PRESETS.easeOut,
    useNativeDriver: true,
  });
};

export const createFadeOutAnimation = (
  animatedValue: Animated.Value,
  duration: number = ANIMATION_DURATIONS.normal,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    delay,
    easing: EASING_PRESETS.easeIn,
    useNativeDriver: true,
  });
};

// Scale animations
export const createScaleInAnimation = (
  animatedValue: Animated.Value,
  fromScale: number = 0.8,
  toScale: number = 1,
  duration: number = ANIMATION_DURATIONS.normal
): Animated.CompositeAnimation => {
  animatedValue.setValue(fromScale);
  return Animated.timing(animatedValue, {
    toValue: toScale,
    duration,
    easing: EASING_PRESETS.spring,
    useNativeDriver: true,
  });
};

export const createScaleOutAnimation = (
  animatedValue: Animated.Value,
  fromScale: number = 1,
  toScale: number = 0.8,
  duration: number = ANIMATION_DURATIONS.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: toScale,
    duration,
    easing: EASING_PRESETS.easeIn,
    useNativeDriver: true,
  });
};

// Slide animations
export const createSlideInAnimation = (
  animatedValue: Animated.Value,
  fromValue: number,
  toValue: number = 0,
  duration: number = ANIMATION_DURATIONS.normal
): Animated.CompositeAnimation => {
  animatedValue.setValue(fromValue);
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: EASING_PRESETS.easeOut,
    useNativeDriver: true,
  });
};

export const createSlideOutAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = ANIMATION_DURATIONS.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: EASING_PRESETS.easeIn,
    useNativeDriver: true,
  });
};

// Bounce animation
export const createBounceAnimation = (
  animatedValue: Animated.Value,
  fromValue: number = 1,
  toValue: number = 1.1,
  duration: number = ANIMATION_DURATIONS.fast
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue,
      duration,
      easing: EASING_PRESETS.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: fromValue,
      duration,
      easing: EASING_PRESETS.easeIn,
      useNativeDriver: true,
    }),
  ]);
};

// Pulse animation (continuous)
export const createPulseAnimation = (
  animatedValue: Animated.Value,
  minValue: number = 0.95,
  maxValue: number = 1.05,
  duration: number = 1000
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxValue,
        duration: duration / 2,
        easing: EASING_PRESETS.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: minValue,
        duration: duration / 2,
        easing: EASING_PRESETS.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};

// Spring animation
export const createSpringAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  tension: number = 100,
  friction: number = 7
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    tension,
    friction,
    useNativeDriver: true,
  });
};

// Stagger animation helper
export const createStaggeredAnimation = (
  animations: Animated.CompositeAnimation[],
  staggerDelay: number = 100
): Animated.CompositeAnimation => {
  const staggeredAnimations = animations.map((animation, index) => {
    return Animated.delay(index * staggerDelay).start(() => animation.start());
  });
  
  return Animated.parallel(animations);
};

// Card flip animation
export const createCardFlipAnimation = (
  animatedValue: Animated.Value,
  duration: number = ANIMATION_DURATIONS.normal
): {
  flipToBack: Animated.CompositeAnimation;
  flipToFront: Animated.CompositeAnimation;
} => {
  const flipToBack = Animated.timing(animatedValue, {
    toValue: 1,
    duration: duration / 2,
    easing: EASING_PRESETS.easeIn,
    useNativeDriver: true,
  });

  const flipToFront = Animated.timing(animatedValue, {
    toValue: 0,
    duration: duration / 2,
    easing: EASING_PRESETS.easeOut,
    useNativeDriver: true,
  });

  return { flipToBack, flipToFront };
};

// Shake animation
export const createShakeAnimation = (
  animatedValue: Animated.Value,
  intensity: number = 10,
  duration: number = ANIMATION_DURATIONS.fast
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: duration / 8,
      easing: EASING_PRESETS.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: duration / 4,
      easing: EASING_PRESETS.easeInOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: duration / 4,
      easing: EASING_PRESETS.easeInOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: duration / 4,
      easing: EASING_PRESETS.easeInOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration / 8,
      easing: EASING_PRESETS.easeIn,
      useNativeDriver: true,
    }),
  ]);
};

// Progress animation
export const createProgressAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = ANIMATION_DURATIONS.slow
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: EASING_PRESETS.easeOut,
    useNativeDriver: false, // Width/height animations can't use native driver
  });
};

// Sequential fade in animation for lists
export const createSequentialFadeIn = (
  animatedValues: Animated.Value[],
  delay: number = 50,
  duration: number = ANIMATION_DURATIONS.normal
): Animated.CompositeAnimation => {
  const animations = animatedValues.map((value, index) => {
    return Animated.timing(value, {
      toValue: 1,
      duration,
      delay: index * delay,
      easing: EASING_PRESETS.easeOut,
      useNativeDriver: true,
    });
  });

  return Animated.parallel(animations);
};

// Button press animation
export const createButtonPressAnimation = (
  scaleValue: Animated.Value,
  pressScale: number = 0.95,
  duration: number = ANIMATION_DURATIONS.fast
): {
  pressIn: () => void;
  pressOut: () => void;
} => {
  const pressIn = () => {
    Animated.timing(scaleValue, {
      toValue: pressScale,
      duration,
      easing: EASING_PRESETS.easeOut,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration,
      easing: EASING_PRESETS.easeOut,
      useNativeDriver: true,
    }).start();
  };

  return { pressIn, pressOut };
};

// Heart animation for like button
export const createHeartAnimation = (
  scaleValue: Animated.Value,
  duration: number = ANIMATION_DURATIONS.bounce
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(scaleValue, {
      toValue: 1.3,
      duration: duration / 3,
      easing: EASING_PRESETS.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(scaleValue, {
      toValue: 0.9,
      duration: duration / 3,
      easing: EASING_PRESETS.easeInOut,
      useNativeDriver: true,
    }),
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: duration / 3,
      easing: EASING_PRESETS.bounce,
      useNativeDriver: true,
    }),
  ]);
};