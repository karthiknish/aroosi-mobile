import { Dimensions, PixelRatio, Platform } from "react-native";
import { responsive as sharedResponsive } from "@utils/responsive";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Base dimensions for scaling
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Enhanced responsive system
export const Responsive = {
  // Screen dimensions
  screen: {
    width: screenWidth,
    height: screenHeight,
    aspectRatio: screenWidth / screenHeight,
    isPortrait: screenHeight > screenWidth,
    isLandscape: screenWidth > screenHeight,
  },

  // Device breakpoints
  breakpoints: {
    xs: 320,
    sm: 375,
    md: 390,
    lg: 414,
    xl: 428,
    phone: 414,
    tablet: 768,
    desktop: 1024,
  },

  // Device detection
  device: {
    isSmallPhone: screenWidth < 375,
    isMediumPhone: screenWidth >= 375 && screenWidth < 414,
    isLargePhone: screenWidth >= 414 && screenWidth < 768,
    isTablet: screenWidth >= 768,
    isSmall: screenWidth < 375,
    isMedium: screenWidth >= 375 && screenWidth < 768,
    isLarge: screenWidth >= 768,
  },

  // Pixel density
  pixelRatio: {
    current: PixelRatio.get(),
    isHighDensity: PixelRatio.get() >= 2,
    isLowDensity: PixelRatio.get() < 2,
  },

  // Platform-specific adjustments
  platform: {
    isIOS: Platform.OS === "ios",
    isAndroid: Platform.OS === "android",
    isWeb: Platform.OS === "web",
  },

  // Enhanced responsive scaling
  scale: {
    // Width-based scaling
    width: (size: number) => {
      return sharedResponsive.width(size);
    },

    // Height-based scaling
    height: (size: number) => {
      return sharedResponsive.height(size);
    },

    // Font scaling with platform adjustments
    font: (size: number) => {
      return sharedResponsive.font(size);
    },

    // Spacing scaling
    spacing: (size: number) => {
      return sharedResponsive.spacing(size);
    },

    // Border radius scaling
    radius: (size: number) => {
      return sharedResponsive.radius(size);
    },

    // Icon size scaling
    icon: (size: number) => {
      return sharedResponsive.icon(size);
    },
  },

  // Enhanced responsive values
  values: {
    // Get responsive value based on screen size
    responsive: <T>(
      values: {
        xs?: T;
        sm?: T;
        md?: T;
        lg?: T;
        xl?: T;
        tablet?: T;
      },
      defaultValue: T
    ): T => {
      if (screenWidth >= 768 && values.tablet) return values.tablet;
      if (screenWidth >= 428 && values.xl) return values.xl;
      if (screenWidth >= 414 && values.lg) return values.lg;
      if (screenWidth >= 390 && values.md) return values.md;
      if (screenWidth >= 375 && values.sm) return values.sm;
      if (screenWidth >= 320 && values.xs) return values.xs;
      return defaultValue;
    },

    // Get responsive array
    responsiveArray: <T>(values: T[]): T => {
      const index = Math.min(
        Math.floor(screenWidth / 100) - 3,
        values.length - 1
      );
      return values[Math.max(0, index)];
    },
  },

  // Safe area insets
  safeArea: {
    top: Platform.select({ ios: 44, android: 0, default: 0 }),
    bottom: Platform.select({ ios: 34, android: 0, default: 0 }),
    left: 0,
    right: 0,
  },

  // Grid system
  grid: {
    container: {
      paddingHorizontal: 16,
    },
    gutterWidth: 16,
    columns: 4,
  },

  // Enhanced spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Enhanced border radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Enhanced shadows
  shadows: {
    small: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: sharedResponsive.radius(2),
      },
      android: {
        elevation: sharedResponsive.spacing(2),
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: sharedResponsive.radius(4),
      },
      android: {
        elevation: sharedResponsive.spacing(4),
      },
    }),
    large: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: sharedResponsive.radius(8),
      },
      android: {
        elevation: sharedResponsive.spacing(8),
      },
    }),
  },

  // Animation durations
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Component-specific responsive values
  components: {
    button: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 8,
      fontSize: 16,
    },
    input: {
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 8,
      fontSize: 16,
    },
    card: {
      padding: 16,
      borderRadius: 12,
      margin: 8,
    },
    avatar: {
      small: 32,
      medium: 48,
      large: 64,
      xlarge: 96,
    },
  },

  // Utility functions
  utils: {
    // Clamp value between min and max
    clamp: (value: number, min: number, max: number) => {
      return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation
    lerp: (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    },

    // Normalize value between 0 and 1
    normalize: (value: number, min: number, max: number) => {
      return (value - min) / (max - min);
    },

    // Map value from one range to another
    mapRange: (
      value: number,
      inMin: number,
      inMax: number,
      outMin: number,
      outMax: number
    ) => {
      return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    },
  },
};

// Create responsive hook
export const useResponsive = () => {
  return Responsive;
};

// Export for backward compatibility
export default Responsive;
