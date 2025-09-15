import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Layout } from "@constants";
import { rgbaHex } from "@utils/color";
import { useTheme } from "@contexts/ThemeContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.7;
const SWIPE_THRESHOLD = screenWidth * 0.25;

interface SwipeableCardProps {
  profile: {
    id: string;
    fullName: string;
    age?: number;
    city?: string;
    images?: Array<{ url: string; isMain?: boolean }>;
    bio?: string;
    occupation?: string;
    education?: string;
    interests?: string[];
  };
  onSwipeLeft?: (profileId: string) => void;
  onSwipeRight?: (profileId: string) => void;
  onPress?: (profileId: string) => void;
  style?: any;
  isTopCard?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  style,
  isTopCard = false,
}) => {
  const { theme, isDark } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(isTopCard ? 1 : 0.95);
  const opacity = useSharedValue(isTopCard ? 1 : 0.8);
  const thresholdDir = useSharedValue(0); // -1 left, 0 none, 1 right
  const pinchScale = useSharedValue(1);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const flatListRef = useRef<FlatList<any> | null>(null);

  const images = profile.images || [];
  const mainImage = images.find((img) => img.isMain) || images[0];

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resetCard = () => {
    translateX.value = withSpring(0, { damping: 12, stiffness: 180 });
    translateY.value = withSpring(0, { damping: 12, stiffness: 180 });
    rotate.value = withSpring(0, { damping: 12, stiffness: 180 });
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  const swipeCard = (direction: "left" | "right") => {
    const toValue = direction === "right" ? screenWidth : -screenWidth;
    translateX.value = withTiming(toValue, { duration: 300 });
    translateY.value = withTiming(-100, { duration: 300 });
    rotate.value = withTiming(direction === "right" ? 30 : -30, {
      duration: 300,
    });
    opacity.value = withTiming(0, { duration: 300 });

    setTimeout(() => {
      if (direction === "right") {
        onSwipeRight?.(profile.id);
      } else {
        onSwipeLeft?.(profile.id);
      }
    }, 300);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withTiming(0.98, { duration: 120 });
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.1;
      rotate.value = interpolate(
        event.translationX,
        [-screenWidth, 0, screenWidth],
        [-30, 0, 30],
        Extrapolation.CLAMP
      );

      // Trigger haptic feedback at threshold
      const dir = event.translationX > 0 ? 1 : -1;
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (dir !== thresholdDir.value) {
          thresholdDir.value = dir;
          runOnJS(triggerHaptic)();
        }
      } else if (thresholdDir.value !== 0) {
        thresholdDir.value = 0;
      }
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        runOnJS(swipeCard)(event.translationX > 0 ? "right" : "left");
      } else {
        runOnJS(resetCard)();
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
        { scale: scale.value },
      ] as any,
      opacity: opacity.value,
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scaleStamp = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 1.5],
      [0.9, 1.05],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale: scaleStamp }] as any };
  });

  const passOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scaleStamp = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 1.5, 0],
      [1.05, 0.9],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale: scaleStamp }] as any };
  });

  // Image subtle parallax/zoom effect for focused slide
  const imageParallaxStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value * 0.05 },
        { scale: Math.max(1, Math.min(2.5, pinchScale.value)) * 1.03 },
      ],
    } as any;
  });

  const handleImageTap = (side: "left" | "right") => {
    if (side === "left" && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (side === "right" && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
    triggerHaptic();
  };

  const currentImage = images[currentImageIndex] || mainImage;

  // Double-tap to like gesture
  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(triggerHaptic)();
      runOnJS(swipeCard)("right");
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = e.scale;
    })
    .onEnd(() => {
      pinchScale.value = withTiming(1, { duration: 180 });
    });

  const combinedGesture = Gesture.Simultaneous(
    tapGesture,
    pinchGesture,
    panGesture
  );

  const onMomentumEnd = (e: any) => {
    const x = e?.nativeEvent?.contentOffset?.x || 0;
    const index = Math.round(x / CARD_WIDTH);
    setCurrentImageIndex(Math.max(0, Math.min(index, images.length - 1)));
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.card,
          { shadowColor: theme.colors.neutral[900] },
          cardStyle,
          style,
        ]}
      >
        {/* Main Image */}
        <View style={styles.imageContainer}>
          <GestureDetector gesture={combinedGesture}>
            <FlatList
              ref={flatListRef}
              data={images}
              keyExtractor={(_, idx) => String(idx)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH}
              decelerationRate="fast"
              onMomentumScrollEnd={onMomentumEnd}
              renderItem={({ item, index }) => (
                <TouchableWithoutFeedback onPress={() => openViewer(index)}>
                  <View style={{ width: CARD_WIDTH, height: "100%" }}>
                    {item && !imageError ? (
                      <Animated.Image
                        source={{ uri: item.url }}
                        style={[
                          styles.image,
                          index === currentImageIndex
                            ? imageParallaxStyle
                            : undefined,
                        ]}
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <View
                        style={[
                          styles.image,
                          styles.imageFallback,
                          {
                            backgroundColor: rgbaHex(
                              theme.colors.neutral[900],
                              0.05
                            ),
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 48 }}>🖼️</Text>
                      </View>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              )}
            />
          </GestureDetector>

          {/* Top readability gradient */}
          <LinearGradient
            colors={[
              rgbaHex(theme.colors.neutral[900], isDark ? 0.6 : 0.35),
              "transparent",
            ]}
            pointerEvents="none"
            style={styles.topGradient}
          />

          {/* Image Navigation Areas (tap zones) */}
          <TouchableOpacity
            style={styles.imageNavLeft}
            onPress={() => {
              const next = Math.max(0, currentImageIndex - 1);
              setCurrentImageIndex(next);
              flatListRef.current?.scrollToIndex({
                index: next,
                animated: true,
              });
              triggerHaptic();
            }}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.imageNavRight}
            onPress={() => {
              const next = Math.min(images.length - 1, currentImageIndex + 1);
              setCurrentImageIndex(next);
              flatListRef.current?.scrollToIndex({
                index: next,
                animated: true,
              });
              triggerHaptic();
            }}
            activeOpacity={1}
          />

          {/* Image Indicators */}
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex
                      ? {
                          width: 38,
                          backgroundColor: theme.colors.primary[500],
                        }
                      : {
                          width: 22,
                          backgroundColor: rgbaHex(
                            theme.colors.background.primary,
                            0.5
                          ),
                        },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Swipe Overlays */}
          <Animated.View
            style={[
              styles.overlay,
              styles.overlayLikePosition,
              styles.likeOverlay,
              likeOverlayStyle,
            ]}
          >
            <View
              style={[
                styles.overlayStamp,
                {
                  borderColor: theme.colors.success[500],
                  backgroundColor: rgbaHex(theme.colors.text.inverse, 0.05),
                },
              ]}
            >
              <Text
                style={[
                  styles.overlayText,
                  { color: theme.colors.success[500] },
                ]}
              >
                LIKE
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.overlay,
              styles.overlayPassPosition,
              styles.passOverlay,
              passOverlayStyle,
            ]}
          >
            <View
              style={[
                styles.overlayStamp,
                {
                  borderColor: theme.colors.error[500],
                  backgroundColor: rgbaHex(theme.colors.text.inverse, 0.05),
                },
              ]}
            >
              <Text
                style={[styles.overlayText, { color: theme.colors.error[500] }]}
              >
                NOPE
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Card Info */}
        <BlurView intensity={80} style={styles.infoContainer}>
          <LinearGradient
            colors={[
              rgbaHex(theme.colors.background.primary, 0.9),
              rgbaHex(theme.colors.background.primary, 0.7),
            ]}
            style={styles.infoGradient}
          >
            <View style={styles.basicInfo}>
              <Text style={[styles.name, { color: theme.colors.text.primary }]}>
                {profile.fullName}
                {profile.age && `, ${profile.age}`}
              </Text>
              {profile.city && (
                <Text
                  style={[
                    styles.location,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  📍 {profile.city}
                </Text>
              )}
              {profile.occupation && (
                <Text
                  style={[
                    styles.occupation,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  💼 {profile.occupation}
                </Text>
              )}
            </View>

            {/* Quick Info Pills */}
            <View style={styles.pillsContainer}>
              {profile.education && (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: rgbaHex(theme.colors.text.primary, 0.1),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    🎓 {profile.education}
                  </Text>
                </View>
              )}
              {profile.interests?.slice(0, 2).map((interest, index) => (
                <View
                  key={index}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: rgbaHex(theme.colors.text.primary, 0.1),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {interest}
                  </Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Animated.View
                style={useAnimatedStyle(() => {
                  const absX = Math.abs(translateX.value);
                  const translate = interpolate(
                    absX,
                    [0, SWIPE_THRESHOLD],
                    [0, 10],
                    Extrapolation.CLAMP
                  );
                  const s = interpolate(
                    absX,
                    [0, SWIPE_THRESHOLD],
                    [1, 0.95],
                    Extrapolation.CLAMP
                  );
                  const o = interpolate(
                    absX,
                    [0, SWIPE_THRESHOLD * 1.2],
                    [1, 0.6],
                    Extrapolation.CLAMP
                  );
                  return {
                    transform: [{ translateY: translate }, { scale: s }] as any,
                    opacity: o,
                  };
                })}
              >
                <TouchableOpacity
                  accessible
                  accessibilityLabel="Pass"
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: theme.colors.error[500],
                      borderWidth: 2,
                      borderColor: rgbaHex(
                        theme.colors.background.primary,
                        0.6
                      ),
                      shadowColor: theme.colors.neutral[900],
                    },
                  ]}
                  onPress={() => swipeCard("left")}
                >
                  <Text style={styles.actionButtonText}>❌</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessible
                  accessibilityLabel="More info"
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: rgbaHex(theme.colors.neutral[900], 0.5),
                      borderWidth: 2,
                      borderColor: rgbaHex(
                        theme.colors.background.primary,
                        0.6
                      ),
                      shadowColor: theme.colors.neutral[900],
                    },
                  ]}
                  onPress={() => {
                    if (onPress) onPress(profile.id);
                    else setShowDetails((v) => !v);
                  }}
                >
                  <Text style={styles.actionButtonText}>ℹ️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessible
                  accessibilityLabel="Like"
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: theme.colors.success[500],
                      borderWidth: 2,
                      borderColor: rgbaHex(
                        theme.colors.background.primary,
                        0.6
                      ),
                      shadowColor: theme.colors.neutral[900],
                    },
                  ]}
                  onPress={() => swipeCard("right")}
                >
                  <Text style={styles.actionButtonText}>💚</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Optional details toggle area */}
            {showDetails && profile.bio && (
              <View style={{ marginTop: 12 }}>
                <Text
                  style={{ color: theme.colors.text.secondary }}
                  numberOfLines={3}
                >
                  {profile.bio}
                </Text>
              </View>
            )}
          </LinearGradient>
        </BlurView>
      </Animated.View>
      {/* Full-screen Viewer Modal */}
      <Modal visible={viewerVisible} animationType="fade" transparent>
        <View
          style={[
            styles.viewerBackdrop,
            {
              backgroundColor: rgbaHex(theme.colors.neutral[900], 0.85),
            },
          ]}
        >
          {/* Swipe down to dismiss + pinch to zoom */}
          <Viewer
            images={images}
            startIndex={viewerIndex}
            onClose={() => setViewerVisible(false)}
            themeColors={theme.colors}
          />
        </View>
      </Modal>
    </>
  );
};

// Simple viewer component for full-screen zoom/swipe-down
const Viewer: React.FC<{
  images: Array<{ url: string } | undefined>;
  startIndex: number;
  onClose: () => void;
  themeColors: any;
}> = ({ images, startIndex, onClose, themeColors }) => {
  const indexRef = useRef(startIndex);
  const [index, setIndex] = useState(startIndex);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const onMomentumEnd = (e: any) => {
    const x = e?.nativeEvent?.contentOffset?.x || 0;
    const i = Math.round(x / screenWidth);
    setIndex(i);
    indexRef.current = i;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale;
    })
    .onEnd(() => {
      scale.value = withTiming(1, { duration: 180 });
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldClose = e.translationY > 120 || e.velocityY > 1200;
      if (shouldClose) onClose();
      translateY.value = withTiming(0, { duration: 180 });
    });

  const imgStyle = useAnimatedStyle(
    () =>
      ({
        transform: [
          { translateY: translateY.value },
          { scale: Math.max(1, Math.min(3, scale.value)) },
        ],
      } as any)
  );

  const composed = Gesture.Simultaneous(pinch, pan);

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.viewerContainer}>
        <FlatList
          data={images}
          keyExtractor={(_, idx) => String(idx)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({
            length: screenWidth,
            offset: screenWidth * i,
            index: i,
          })}
          renderItem={({ item }) => (
            <View
              style={{
                width: screenWidth,
                height: screenHeight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item?.url ? (
                <Animated.Image
                  source={{ uri: item.url }}
                  style={[
                    {
                      width: screenWidth,
                      height: screenHeight,
                      resizeMode: "contain",
                    },
                    imgStyle,
                  ]}
                />
              ) : (
                <View
                  style={{
                    width: screenWidth,
                    height: screenHeight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.text?.inverse,
                      fontSize: 48,
                    }}
                  >
                    🖼️
                  </Text>
                </View>
              )}
            </View>
          )}
        />
        <TouchableOpacity
          style={styles.viewerClose}
          onPress={onClose}
          accessibilityLabel="Close viewer"
        >
          <Text style={{ color: themeColors.text?.inverse, fontSize: 18 }}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: "transparent", // set via theme in parent if needed
    // shadowColor applied dynamically from theme where used
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor set dynamically based on theme
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  imageNavLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "50%",
    height: "70%",
    zIndex: 2,
  },
  imageNavRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: "50%",
    height: "70%",
    zIndex: 2,
  },
  imageIndicators: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    zIndex: 3,
  },
  indicator: {
    width: 22,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
    backgroundColor: "transparent",
  },
  overlay: {
    position: "absolute",
    zIndex: 1,
  },
  overlayLikePosition: {
    top: 20,
    left: 20,
    right: undefined as any,
    bottom: undefined as any,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  likeOverlay: {
    transform: [{ rotate: "-20deg" }],
  },
  overlayPassPosition: {
    top: 20,
    right: 20,
    left: undefined as any,
    bottom: undefined as any,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  passOverlay: {
    transform: [{ rotate: "20deg" }],
  },

  overlayStamp: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    // backgroundColor applied inline from theme
  },
  overlayText: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  overlayIcon: {
    fontSize: 40,
  },
  infoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  infoGradient: {
    padding: 20,
  },
  basicInfo: {
    marginBottom: 15,
  },
  name: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: 28,
    fontWeight: "bold",
    // color provided inline from theme
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    // color provided inline from theme
    marginBottom: 3,
  },
  occupation: {
    fontSize: 16,
    // color provided inline from theme
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  pill: {
    // backgroundColor provided inline from theme
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 14,
    // color provided inline from theme
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    // shadowColor applied inline from theme
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // button colors applied inline from theme
  actionButtonText: {
    fontSize: 24,
  },
  viewerBackdrop: {
    flex: 1,
    // backgroundColor set inline from theme
  },
  viewerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor set inline from theme
    alignItems: "center",
    justifyContent: "center",
  },
});
