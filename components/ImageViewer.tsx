import React, { useState, useRef } from "react";
import {
  View,
  Modal,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
  StatusBar,
  Platform,
  SafeAreaView,
  Image,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "@contexts/ThemeContext";
import { rgbaHex } from "@utils/color";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  onDelete?: (index: number) => void;
  onShare?: (index: number) => void;
  showControls?: boolean;
  backgroundColor?: string;
}

export function ImageViewer({
  images,
  initialIndex = 0,
  visible,
  onClose,
  onDelete,
  onShare,
  showControls = true,
  backgroundColor,
}: ImageViewerProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const currentImage = images[currentIndex];

  // Reset animation values when image changes
  React.useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, [currentIndex]);

  // Auto-hide controls
  React.useEffect(() => {
    if (!controlsVisible) return;

    const timer = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [controlsVisible]);

  // Gesture handlers (RNGH v2 API)
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(setControlsVisible)(false);
    })
    .onChange((e) => {
      "worklet";
      const next = Math.max(0.5, Math.min(e.scale, 3));
      scale.value = next;
    })
    .onEnd(() => {
      "worklet";
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else if (scale.value > 2.5) {
        scale.value = withSpring(2.5);
      }
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      runOnJS(setControlsVisible)(false);
    })
    .onChange((e) => {
      "worklet";
      if (scale.value > 1) {
        // Pan when zoomed in
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      } else {
        // Swipe to change images when not zoomed
        translateX.value = e.translationX;

        // Add some resistance when swiping beyond bounds
        if (currentIndex === 0 && e.translationX > 0) {
          translateX.value = e.translationX * 0.3;
        } else if (currentIndex === images.length - 1 && e.translationX < 0) {
          translateX.value = e.translationX * 0.3;
        }
      }
    })
    .onEnd((e) => {
      "worklet";
      if (scale.value > 1) {
        // Snap back to bounds when zoomed
        const maxTranslateX = (screenWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (screenHeight * (scale.value - 1)) / 2;

        translateX.value = withSpring(
          Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value))
        );
        translateY.value = withSpring(
          Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value))
        );
      } else {
        // Handle image swipe
        const threshold = screenWidth * 0.3;

        if (Math.abs(e.translationX) > threshold) {
          if (e.translationX > 0 && currentIndex > 0) {
            // Swipe right - previous image
            runOnJS(setCurrentIndex)(currentIndex - 1);
          } else if (e.translationX < 0 && currentIndex < images.length - 1) {
            // Swipe left - next image
            runOnJS(setCurrentIndex)(currentIndex + 1);
          }
        }

        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const handleDoubleTap = () => {
    if (scale.value > 1) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    } else {
      scale.value = withSpring(2);
    }
  };

  const handleSingleTap = () => {
    setControlsVisible(!controlsVisible);
  };

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(currentIndex);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(currentIndex);
    }
  };

  if (!visible || !currentImage) {
    return null;
  }

  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      container: {
        flex: 1,
      },
      safeArea: {
        flex: 1,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: "absolute",
        top: Platform.OS === "ios" ? 44 : 24,
        left: 0,
        right: 0,
        zIndex: 1,
        backgroundColor: rgbaHex(t.colors.text.primary, 0.5),
      },
      closeButton: {
        padding: 8,
      },
      counter: {
        color: t.colors.text.inverse,
        fontSize: 16,
        fontWeight: "500",
        fontFamily: "NunitoSans-Medium",
      },
      headerActions: {
        flexDirection: "row",
      },
      actionButton: {
        padding: 8,
        marginLeft: 8,
      },
      imageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      },
      imageWrapper: {
        width: screenWidth,
        height: screenHeight,
        justifyContent: "center",
        alignItems: "center",
      },
      imageTouchable: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      },
      image: {
        width: screenWidth,
        height: screenHeight * 0.8,
      },
      navigation: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: "absolute",
        bottom: Platform.OS === "ios" ? 34 : 24,
        left: 0,
        right: 0,
        backgroundColor: rgbaHex(t.colors.text.primary, 0.5),
      },
      navButton: {
        padding: 8,
      },
      navButtonDisabled: {
        opacity: 0.5,
      },
      dots: {
        flexDirection: "row",
        alignItems: "center",
      },
      dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: rgbaHex(t.colors.background.primary, 0.5),
        marginHorizontal: 4,
      },
      activeDot: {
        backgroundColor: t.colors.text.inverse,
        width: 10,
        height: 10,
        borderRadius: 5,
      },
    })
  );

  const bgColor = backgroundColor ?? theme.colors.neutral[900];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header Controls */}
          {showControls && controlsVisible && (
            <Animated.View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.inverse} />
              </TouchableOpacity>

              <Text style={styles.counter}>
                {currentIndex + 1} of {images.length}
              </Text>

              <View style={styles.headerActions}>
                {onShare && (
                  <TouchableOpacity
                    onPress={handleShare}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="share-outline"
                      size={24}
                      color={theme.colors.text.inverse}
                    />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={24}
                      color={theme.colors.text.inverse}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          {/* Image Container */}
          <View style={styles.imageContainer}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleSingleTap}
                  onLongPress={handleDoubleTap}
                  style={styles.imageTouchable}
                >
                  <Image
                    source={{ uri: currentImage }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            </GestureDetector>
          </View>

          {/* Navigation Controls */}
          {showControls && controlsVisible && images.length > 1 && (
            <Animated.View style={styles.navigation}>
              <TouchableOpacity
                onPress={handlePrevious}
                style={[
                  styles.navButton,
                  currentIndex === 0 && styles.navButtonDisabled,
                ]}
                disabled={currentIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={
                    currentIndex === 0
                      ? theme.colors.gray[500]
                      : theme.colors.text.inverse
                  }
                />
              </TouchableOpacity>

              <View style={styles.dots}>
                {images.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentIndex(index)}
                    style={[
                      styles.dot,
                      index === currentIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleNext}
                style={[
                  styles.navButton,
                  currentIndex === images.length - 1 &&
                    styles.navButtonDisabled,
                ]}
                disabled={currentIndex === images.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={
                    currentIndex === images.length - 1
                      ? theme.colors.gray[500]
                      : theme.colors.text.inverse
                  }
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

