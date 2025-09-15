import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
  StatusBar,
  SafeAreaView,
  FlatList,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTheme, useThemedStyles } from "@contexts/ThemeContext";
import { rgbaHex } from "@utils/color";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface PhotoItem {
  id: string;
  url: string;
  caption?: string;
  isMain?: boolean;
}

interface PhotoGalleryProps {
  photos: PhotoItem[];
  initialIndex?: number;
  onClose?: () => void;
  onPhotoChange?: (index: number) => void;
  style?: any;
}

interface ZoomableImageProps {
  uri: string;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
}

// Zoomable Image Component
const ZoomableImage: React.FC<ZoomableImageProps> = ({
  uri,
  onSingleTap,
  onDoubleTap,
}) => {
  const zoomStyles = StyleSheet.create({
    zoomableContainer: {
      width: screenWidth,
      height: screenHeight,
      justifyContent: "center",
      alignItems: "center",
    },
    zoomableImage: {
      width: screenWidth,
      height: screenHeight,
    },
  });
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastScale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const resetTransform = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    lastScale.value = 1;
    lastTranslateX.value = 0;
    lastTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = lastScale.value * event.scale;
      scale.value = Math.max(1, Math.min(newScale, 5)); // Limit zoom between 1x and 5x
    })
    .onEnd(() => {
      lastScale.value = scale.value;
      if (scale.value < 1.2) {
        resetTransform();
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        const maxTranslateX = (screenWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (screenHeight * (scale.value - 1)) / 2;

        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, lastTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, lastTranslateY.value + event.translationY)
        );
      }
    })
    .onEnd(() => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(triggerHaptic)();
      onSingleTap?.();
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(triggerHaptic)();
      if (scale.value > 1) {
        resetTransform();
      } else {
        scale.value = withSpring(2);
        lastScale.value = 2;
      }
      onDoubleTap?.();
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTapGesture, tapGesture),
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ] as any,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
    <Animated.View style={[zoomStyles.zoomableContainer, animatedStyle]}>
        <Image
          source={{ uri }}
      style={zoomStyles.zoomableImage}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

// Photo Gallery Component
export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  initialIndex = 0,
  onClose,
  onPhotoChange,
  style,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      galleryContainer: {
        flex: 1,
        backgroundColor: t.colors.background.primary,
      },
      photoContainer: {
        width: screenWidth,
        height: screenHeight,
        justifyContent: "center",
        alignItems: "center",
      },
      zoomableContainer: {
        width: screenWidth,
        height: screenHeight,
        justifyContent: "center",
        alignItems: "center",
      },
      zoomableImage: {
        width: screenWidth,
        height: screenHeight,
      },
      controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: "box-none",
      },
      header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      },
      headerGradient: {
        paddingTop: 20,
        paddingBottom: 20,
      },
      headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
      },
      closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: rgbaHex(t.colors.text.primary, 0.5),
        justifyContent: "center",
        alignItems: "center",
      },
      closeButtonText: {
        color: t.colors.background.primary,
        fontSize: 18,
        fontWeight: "600",
      },
      photoInfo: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 20,
      },
      photoCounter: {
        color: t.colors.background.primary,
        fontSize: 16,
        fontWeight: "600",
      },
      photoCaption: {
        color: t.colors.background.primary,
        fontSize: 14,
        textAlign: "center",
        marginTop: 4,
        opacity: 0.8,
      },
      shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: rgbaHex(t.colors.text.primary, 0.5),
        justifyContent: "center",
        alignItems: "center",
      },
      shareButtonText: {
        fontSize: 18,
      },
      navButtonLeft: {
        position: "absolute",
        left: 20,
        top: "50%",
        marginTop: -25,
        zIndex: 10,
      },
      navButtonRight: {
        position: "absolute",
        right: 20,
        top: "50%",
        marginTop: -25,
        zIndex: 10,
      },
      navButtonBackground: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: rgbaHex(t.colors.text.primary, 0.5),
        justifyContent: "center",
        alignItems: "center",
      },
      navButtonText: {
        color: t.colors.background.primary,
        fontSize: 24,
        fontWeight: "600",
      },
      bottomControls: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      },
      bottomGradient: {
        paddingTop: 40,
        paddingBottom: 20,
      },
      thumbnailsContainer: {
        paddingHorizontal: 20,
      },
      thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "transparent",
      },
      activeThumbnail: {
        borderColor: t.colors.primary[500],
      },
      thumbnailImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
      },
      mainBadge: {
        position: "absolute",
        top: 4,
        right: 4,
        backgroundColor: t.colors.primary[500],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
      },
      mainBadgeText: {
        color: t.colors.background.primary,
        fontSize: 10,
        fontWeight: "600",
      },
      gridContainer: {
        flex: 1,
      },
      gridItem: {
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
      },
      gridImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
      },
      gridMainBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: t.colors.primary[500],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      },
      gridMainBadgeText: {
        color: t.colors.background.primary,
        fontSize: 12,
        fontWeight: "600",
      },
    })
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isVisible, setIsVisible] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const controlsOpacity = useSharedValue(1);

  const toggleControls = () => {
    const newShowControls = !showControls;
    setShowControls(newShowControls);
    controlsOpacity.value = withTiming(newShowControls ? 1 : 0, {
      duration: 300,
    });
  };

  const handlePhotoChange = (index: number) => {
    setCurrentIndex(index);
    onPhotoChange?.(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      onPhotoChange?.(newIndex);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      onPhotoChange?.(newIndex);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: controlsOpacity.value,
    };
  });

  const renderPhoto = ({ item, index }: { item: PhotoItem; index: number }) => (
    <View style={styles.photoContainer}>
      <ZoomableImage
        uri={item.url}
        onSingleTap={toggleControls}
        onDoubleTap={() => {}}
      />
    </View>
  );

  const renderThumbnail = ({
    item,
    index,
  }: {
    item: PhotoItem;
    index: number;
  }) => (
    <TouchableOpacity
      style={[
        styles.thumbnail,
        index === currentIndex && styles.activeThumbnail,
      ]}
      onPress={() => {
        setCurrentIndex(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
        onPhotoChange?.(index);
      }}
    >
      <Image source={{ uri: item.url }} style={styles.thumbnailImage} />
      {item.isMain && (
        <View style={styles.mainBadge}>
          <Text style={styles.mainBadgeText}>Main</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
  <View style={styles.galleryContainer}>
        {/* Background */}
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
    { backgroundColor: rgbaHex(theme.colors.text.primary, 0.9) },
          ]}
        />

        {/* Main Photo */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / screenWidth
            );
            handlePhotoChange(index);
          }}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
        />

        {/* Controls Overlay */}
        <Animated.View style={[styles.controlsOverlay, controlsAnimatedStyle]}>
          {/* Header */}
          <SafeAreaView style={styles.header}>
            <LinearGradient
              colors={[rgbaHex(theme.colors.text.primary, 0.8), "transparent"]}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                <View style={styles.photoInfo}>
                  <Text style={styles.photoCounter}>
                    {currentIndex + 1} of {photos.length}
                  </Text>
                  {photos[currentIndex]?.caption && (
                    <Text style={styles.photoCaption}>
                      {photos[currentIndex].caption}
                    </Text>
                  )}
                </View>

                <TouchableOpacity style={styles.shareButton}>
                  <Text style={styles.shareButtonText}>↗️</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaView>

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.navButtonLeft}
              onPress={goToPrevious}
            >
              <View style={styles.navButtonBackground}>
                <Text style={styles.navButtonText}>‹</Text>
              </View>
            </TouchableOpacity>
          )}

          {currentIndex < photos.length - 1 && (
            <TouchableOpacity style={styles.navButtonRight} onPress={goToNext}>
              <View style={styles.navButtonBackground}>
                <Text style={styles.navButtonText}>›</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Bottom Thumbnails */}
          {photos.length > 1 && (
            <View style={styles.bottomControls}>
              <LinearGradient
                colors={["transparent", rgbaHex(theme.colors.text.primary, 0.8)]}
                style={styles.bottomGradient}
              >
                <FlatList
                  data={photos}
                  renderItem={renderThumbnail}
                  keyExtractor={(item) => `thumb-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailsContainer}
                />
              </LinearGradient>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// Photo Grid Component for displaying multiple photos
interface PhotoGridProps {
  photos: PhotoItem[];
  onPhotoPress: (index: number) => void;
  columns?: number;
  spacing?: number;
  style?: any;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoPress,
  columns = 2,
  spacing = 8,
  style,
}) => {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      gridContainer: {
        flex: 1,
      },
      gridItem: {
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
      },
      gridImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
      },
      gridMainBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: t.colors.primary[500],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      },
      gridMainBadgeText: {
        color: t.colors.background.primary,
        fontSize: 12,
        fontWeight: "600",
      },
    })
  );
  const itemSize = (screenWidth - spacing * (columns + 1)) / columns;

  const renderPhoto = ({ item, index }: { item: PhotoItem; index: number }) => (
    <TouchableOpacity
      style={[
        styles.gridItem,
        {
          width: itemSize,
          height: itemSize,
          marginLeft: spacing,
          marginBottom: spacing,
        },
      ]}
      onPress={() => onPhotoPress(index)}
    >
      <Image source={{ uri: item.url }} style={styles.gridImage} />
      {item.isMain && (
        <View style={styles.gridMainBadge}>
          <Text style={styles.gridMainBadgeText}>Main</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.gridContainer, style]}>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        scrollEnabled={false}
        contentContainerStyle={{ paddingTop: spacing }}
      />
    </View>
  );
};

// themed styles are provided above via useThemedStyles