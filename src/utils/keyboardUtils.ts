import { useEffect, useState } from 'react';
import { 
  Keyboard, 
  KeyboardEvent, 
  LayoutAnimation, 
  Platform,
  EmitterSubscription,
} from 'react-native';

export interface KeyboardState {
  isVisible: boolean;
  height: number;
  animationDuration: number;
  animationEasing: string;
}

// Hook to track keyboard visibility and height
export const useKeyboard = (): KeyboardState => {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    animationDuration: 250,
    animationEasing: 'easeInEaseOut',
  });

  useEffect(() => {
    let keyboardDidShowListener: EmitterSubscription;
    let keyboardDidHideListener: EmitterSubscription;
    let keyboardWillShowListener: EmitterSubscription;
    let keyboardWillHideListener: EmitterSubscription;

    if (Platform.OS === 'ios') {
      keyboardWillShowListener = Keyboard.addListener(
        'keyboardWillShow',
        (event: KeyboardEvent) => {
          setKeyboardState({
            isVisible: true,
            height: event.endCoordinates.height,
            animationDuration: event.duration || 250,
            animationEasing: event.easing || 'easeInEaseOut',
          });
        }
      );

      keyboardWillHideListener = Keyboard.addListener(
        'keyboardWillHide',
        (event: KeyboardEvent) => {
          setKeyboardState({
            isVisible: false,
            height: 0,
            animationDuration: event.duration || 250,
            animationEasing: event.easing || 'easeInEaseOut',
          });
        }
      );
    } else {
      keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        (event: KeyboardEvent) => {
          setKeyboardState({
            isVisible: true,
            height: event.endCoordinates.height,
            animationDuration: 250,
            animationEasing: 'easeInEaseOut',
          });
        }
      );

      keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setKeyboardState({
            isVisible: false,
            height: 0,
            animationDuration: 250,
            animationEasing: 'easeInEaseOut',
          });
        }
      );
    }

    return () => {
      if (Platform.OS === 'ios') {
        keyboardWillShowListener?.remove();
        keyboardWillHideListener?.remove();
      } else {
        keyboardDidShowListener?.remove();
        keyboardDidHideListener?.remove();
      }
    };
  }, []);

  return keyboardState;
};

// Hook to automatically adjust layout when keyboard appears
export const useKeyboardAnimation = () => {
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
};

// Utility functions
export const dismissKeyboard = () => {
  Keyboard.dismiss();
};

export const getKeyboardAvoidingViewBehavior = () => {
  return Platform.OS === 'ios' ? 'padding' : 'height';
};

// Custom layout animation configurations
export const keyboardLayoutAnimations = {
  easeInEaseOut: {
    duration: 300,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  },
  
  spring: {
    duration: 400,
    create: {
      type: LayoutAnimation.Types.spring,
      property: LayoutAnimation.Properties.scaleXY,
      springDamping: 0.7,
    },
    update: {
      type: LayoutAnimation.Types.spring,
      springDamping: 0.7,
    },
  },
  
  linear: {
    duration: 200,
    create: {
      type: LayoutAnimation.Types.linear,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.linear,
    },
  },
};

// Apply custom keyboard animation
export const applyKeyboardAnimation = (
  animationType: keyof typeof keyboardLayoutAnimations = 'easeInEaseOut'
) => {
  LayoutAnimation.configureNext(keyboardLayoutAnimations[animationType]);
};