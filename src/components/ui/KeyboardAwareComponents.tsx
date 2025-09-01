import React, { useRef, useEffect, useState } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  TouchableWithoutFeedback,
  View,
  ViewProps,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { useKeyboard, useKeyboardAnimation, dismissKeyboard, getKeyboardAvoidingViewBehavior } from '@utils/keyboardUtils';
import { Colors } from "@constants";

// KeyboardAwareScrollView - Automatically scrolls to focused input
interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  extraScrollHeight?: number;
  enableAutomaticScroll?: boolean;
  enableResetScrollToCoords?: boolean;
  resetScrollToCoords?: { x: number; y: number };
}

export const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  extraScrollHeight = 75,
  enableAutomaticScroll = true,
  enableResetScrollToCoords = true,
  resetScrollToCoords = { x: 0, y: 0 },
  style,
  ...props
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboard = useKeyboard();
  
  useKeyboardAnimation();

  useEffect(() => {
    if (!keyboard.isVisible && enableResetScrollToCoords) {
      scrollViewRef.current?.scrollTo({
        ...resetScrollToCoords,
        animated: true,
      });
    }
  }, [keyboard.isVisible, enableResetScrollToCoords, resetScrollToCoords]);

  const scrollToInput = (reactNode: any) => {
    if (!enableAutomaticScroll) return;

    // Find the focused input and scroll to it
    setTimeout(() => {
      reactNode.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        const scrollY = pageY - extraScrollHeight;
        scrollViewRef.current?.scrollTo({
          x: 0,
          y: Math.max(0, scrollY),
          animated: true,
        });
      });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={getKeyboardAvoidingViewBehavior()}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          ref={scrollViewRef}
          style={style}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          {...props}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// DismissKeyboardView - Dismisses keyboard when tapped
interface DismissKeyboardViewProps extends ViewProps {
  children: React.ReactNode;
}

export const DismissKeyboardView: React.FC<DismissKeyboardViewProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={[{ flex: 1 }, style]} {...props}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};

// KeyboardAvoidingContainer - Alternative to KeyboardAvoidingView with animation
interface KeyboardAvoidingContainerProps extends ViewProps {
  children: React.ReactNode;
  offset?: number;
}

export const KeyboardAvoidingContainer: React.FC<KeyboardAvoidingContainerProps> = ({
  children,
  offset = 0,
  style,
  ...props
}) => {
  const keyboard = useKeyboard();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: keyboard.isVisible ? -(keyboard.height - offset) : 0,
      duration: keyboard.animationDuration,
      useNativeDriver: true,
    }).start();
  }, [keyboard.isVisible, keyboard.height, keyboard.animationDuration, offset]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateY: animatedValue }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

// KeyboardSpacer - Adds space when keyboard is visible
interface KeyboardSpacerProps {
  topSpacing?: number;
  onToggle?: (isVisible: boolean, keyboardHeight: number) => void;
}

export const KeyboardSpacer: React.FC<KeyboardSpacerProps> = ({
  topSpacing = 0,
  onToggle,
}) => {
  const keyboard = useKeyboard();
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onToggle?.(keyboard.isVisible, keyboard.height);
    
    Animated.timing(animatedHeight, {
      toValue: keyboard.isVisible ? keyboard.height + topSpacing : 0,
      duration: keyboard.animationDuration,
      useNativeDriver: false,
    }).start();
  }, [keyboard.isVisible, keyboard.height, keyboard.animationDuration, topSpacing, onToggle]);

  return <Animated.View style={{ height: animatedHeight }} />;
};

// AnimatedTextInput - TextInput with smooth focus animations
interface AnimatedTextInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: any;
  containerStyle?: any;
  focusedBorderColor?: string;
  unfocusedBorderColor?: string;
  placeholderTextColor?: string;
  [key: string]: any;
}

export const AnimatedTextInput: React.FC<AnimatedTextInputProps> = ({
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  style,
  containerStyle,
  focusedBorderColor = Colors.border.focus,
  unfocusedBorderColor = Colors.border.primary,
  placeholderTextColor = Colors.text.secondary,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedBorderColor, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(animatedScale, {
        toValue: isFocused ? 1.02 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const borderColor = animatedBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [unfocusedBorderColor, focusedBorderColor],
  });

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <Animated.View
      style={[
        {
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: Colors.background.primary,
          transform: [{ scale: animatedScale }],
        },
        containerStyle,
        { borderColor },
      ]}
    >
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          {
            fontSize: 16,
            color: Colors.text.primary,
            minHeight: 20,
          },
          style,
        ]}
        {...props}
      />
    </Animated.View>
  );
};

// KeyboardToolbar - Toolbar that appears above keyboard
interface KeyboardToolbarProps {
  children: React.ReactNode;
  backgroundColor?: string;
  borderColor?: string;
}

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  children,
  backgroundColor = Colors.background.secondary,
  borderColor = Colors.border.primary,
}) => {
  const keyboard = useKeyboard();
  const animatedTranslateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.timing(animatedTranslateY, {
      toValue: keyboard.isVisible ? 0 : 100,
      duration: keyboard.animationDuration,
      useNativeDriver: true,
    }).start();
  }, [keyboard.isVisible, keyboard.animationDuration]);

  if (!keyboard.isVisible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: keyboard.height,
        left: 0,
        right: 0,
        backgroundColor,
        borderTopWidth: 1,
        borderTopColor: borderColor,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        transform: [{ translateY: animatedTranslateY }],
      }}
    >
      {children}
    </Animated.View>
  );
};