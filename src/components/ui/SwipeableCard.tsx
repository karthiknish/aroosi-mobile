import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
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
import { Colors, Layout } from "@constants";

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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(isTopCard ? 1 : 0.95);
  const opacity = useSharedValue(isTopCard ? 1 : 0.8);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const images = profile.images || [];
  const mainImage = images.find(img => img.isMain) || images[0];

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resetCard = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotate.value = withSpring(0);
  };

  const swipeCard = (direction: "left" | "right") => {
    const toValue = direction === "right" ? screenWidth : -screenWidth;
    translateX.value = withTiming(toValue, { duration: 300 });
    translateY.value = withTiming(-100, { duration: 300 });
    rotate.value = withTiming(direction === "right" ? 30 : -30, { duration: 300 });
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
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        runOnJS(triggerHaptic)();
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
    return { opacity };
  });

  const passOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
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

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle, style]}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          {currentImage && (
            <Image source={{ uri: currentImage.url }} style={styles.image} />
          )}
          
          {/* Image Navigation Areas */}
          <TouchableOpacity
            style={styles.imageNavLeft}
            onPress={() => handleImageTap("left")}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.imageNavRight}
            onPress={() => handleImageTap("right")}
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
                    {
                      backgroundColor:
                        index === currentImageIndex
                          ? Colors.background.primary
                          : "rgba(255,255,255,0.5)",
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Swipe Overlays */}
          <Animated.View style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}>
            <LinearGradient
              colors={["rgba(76, 217, 100, 0.8)", "rgba(76, 217, 100, 0.6)"]}
              style={styles.overlayGradient}
            >
              <Text style={styles.overlayText}>LIKE</Text>
              <Text style={styles.overlayIcon}>💚</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[styles.overlay, styles.passOverlay, passOverlayStyle]}>
            <LinearGradient
              colors={["rgba(255, 59, 48, 0.8)", "rgba(255, 59, 48, 0.6)"]}
              style={styles.overlayGradient}
            >
              <Text style={styles.overlayText}>PASS</Text>
              <Text style={styles.overlayIcon}>💔</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Card Info */}
        <BlurView intensity={80} style={styles.infoContainer}>
          <LinearGradient
            colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
            style={styles.infoGradient}
          >
            <View style={styles.basicInfo}>
              <Text style={styles.name}>
                {profile.fullName}
                {profile.age && `, ${profile.age}`}
              </Text>
              {profile.city && (
                <Text style={styles.location}>📍 {profile.city}</Text>
              )}
              {profile.occupation && (
                <Text style={styles.occupation}>💼 {profile.occupation}</Text>
              )}
            </View>

            {/* Quick Info Pills */}
            <View style={styles.pillsContainer}>
              {profile.education && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>🎓 {profile.education}</Text>
                </View>
              )}
              {profile.interests?.slice(0, 2).map((interest, index) => (
                <View key={index} style={styles.pill}>
                  <Text style={styles.pillText}>{interest}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.passButton]}
                onPress={() => swipeCard("left")}
              >
                <Text style={styles.actionButtonText}>❌</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.infoButton]}
                onPress={() => onPress?.(profile.id)}
              >
                <Text style={styles.actionButtonText}>ℹ️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.likeButton]}
                onPress={() => swipeCard("right")}
              >
                <Text style={styles.actionButtonText}>💚</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: Colors.background.primary,
    shadowColor: "#000",
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
    width: 30,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  likeOverlay: {
    transform: [{ rotate: "-20deg" }],
  },
  passOverlay: {
    transform: [{ rotate: "20deg" }],
  },
  overlayGradient: {
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  overlayText: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: 32,
    fontWeight: \"bold\",
    color: Colors.background.primary,
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
    fontWeight: \"bold\",
    color: Colors.text.primary,
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 3,
  },
  occupation: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  pill: {
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 14,
    color: Colors.text.primary,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    backgroundColor: Colors.error[500],
  },
  infoButton: {
    backgroundColor: Colors.neutral[500],
  },
  likeButton: {
    backgroundColor: Colors.success[500],
  },
  actionButtonText: {
    fontSize: 24,
  },
});