import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Layout } from "../../../constants";
import { useTheme } from "@contexts/ThemeContext";
import { rgbaHex } from "@utils/color";
import * as Haptics from "expo-haptics";

const { height: screenHeight } = Dimensions.get("window");

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number;
  showHandle?: boolean;
  enableBackdropDismiss?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  children,
  height = screenHeight * 0.6,
  showHandle = true,
  enableBackdropDismiss = true,
}) => {
  const { theme } = useTheme();
  const translateY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (isVisible) {
      runOnJS(triggerHaptic)();
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(height, { duration: 200 });
    }
  }, [isVisible, height, backdropOpacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const handleBackdropPress = () => {
    if (enableBackdropDismiss) {
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: rgbaHex(theme.colors.neutral[900], 0.5) },
              backdropStyle,
            ]}
          >
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height,
              backgroundColor: theme.colors.background.primary,
              shadowColor: theme.colors.neutral[900],
            },
            sheetStyle,
          ]}
        >
          <View style={styles.sheetContent}>
            {/* Handle */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: theme.colors.neutral[300] },
                  ]}
                />
              </View>
            )}

            {/* Header */}
            {title && (
              <View
                style={[
                  styles.header,
                  { borderBottomColor: theme.colors.border.primary },
                ]}
              >
                <Text
                  style={[styles.title, { color: theme.colors.text.primary }]}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.closeButtonText,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>{children}</View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetContent: {
    flex: 1,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor provided inline when rendered if needed
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});