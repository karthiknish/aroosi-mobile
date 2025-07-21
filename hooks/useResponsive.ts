import { useState, useEffect } from 'react';
import {
  Dimensions,
  useWindowDimensions,
  PixelRatio,
  Platform,
} from "react-native";

// Responsive configuration
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

interface ResponsiveConfig {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isTablet: boolean;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  platform: {
    isIOS: boolean;
    isAndroid: boolean;
    isWeb: boolean;
  };
  safeArea: {
    top: number;
    bottom: number;
  };
}

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const [config, setConfig] = useState<ResponsiveConfig>(() =>
    calculateResponsiveConfig(width, height)
  );

  useEffect(() => {
    setConfig(calculateResponsiveConfig(width, height));
  }, [width, height]);

  // Responsive scaling functions
  const scale = {
    width: (size: number, baseWidth = BASE_WIDTH) => (width / baseWidth) * size,
    height: (size: number, baseHeight = BASE_HEIGHT) =>
      (height / baseHeight) * size,
    font: (size: number) => {
      const scale = width / BASE_WIDTH;
      const newSize = size * scale;

      if (Platform.OS === "ios") {
        return Math.round(PixelRatio.roundToNearestPixel(newSize));
      } else {
        return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
      }
    },
    spacing: (size: number) => {
      const scale = Math.min(width / BASE_WIDTH, 1.2);
      return Math.round(size * scale);
    },
    radius: (size: number) => Math.round((width / BASE_WIDTH) * size),
    icon: (size: number) => {
      const scale = Math.min(width / BASE_WIDTH, 1.1);
      return Math.round(size * scale);
    },
  };

  // Responsive value selection
  const responsive = <T>(
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
    if (config.isTablet && values.tablet) return values.tablet;
    if (width >= 428 && values.xl) return values.xl;
    if (width >= 414 && values.lg) return values.lg;
    if (width >= 390 && values.md) return values.md;
    if (width >= 375 && values.sm) return values.sm;
    if (width >= 320 && values.xs) return values.xs;
    return defaultValue;
  };

  // Component-specific responsive values
  const components = {
    button: {
      minHeight: scale.height(44),
      paddingHorizontal: scale.spacing(16),
      borderRadius: scale.radius(8),
      fontSize: scale.font(16),
    },
    input: {
      minHeight: scale.height(48),
      paddingHorizontal: scale.spacing(12),
      borderRadius: scale.radius(8),
      fontSize: scale.font(16),
    },
    card: {
      padding: scale.spacing(16),
      borderRadius: scale.radius(12),
      margin: scale.spacing(8),
    },
    avatar: {
      small: scale.icon(32),
      medium: scale.icon(48),
      large: scale.icon(64),
      xlarge: scale.icon(96),
    },
  };

  // Typography scaling
  const typography = {
    h1: scale.font(48),
    h2: scale.font(36),
    h3: scale.font(30),
    h4: scale.font(24),
    h5: scale.font(20),
    h6: scale.font(18),
    body1: scale.font(16),
    body2: scale.font(14),
    caption: scale.font(12),
    small: scale.font(11),
  };

  // Spacing system
  const spacing = {
    xs: scale.spacing(4),
    sm: scale.spacing(8),
    md: scale.spacing(16),
    lg: scale.spacing(24),
    xl: scale.spacing(32),
    xxl: scale.spacing(48),
  };

  // Grid system
  const grid = {
    container: {
      paddingHorizontal: scale.spacing(16),
    },
    gutterWidth: scale.spacing(16),
    columns: config.isTablet ? 12 : 4,
  };

  // Shadows
  const shadows = {
    small: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: scale.radius(2),
      },
      android: {
        elevation: scale.spacing(2),
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: scale.radius(4),
      },
      android: {
        elevation: scale.spacing(4),
      },
    }),
    large: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: scale.radius(8),
      },
      android: {
        elevation: scale.spacing(8),
      },
    }),
  };

  // Utility functions
  const utils = {
    clamp: (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max),
    lerp: (start: number, end: number, factor: number) =>
      start + (end - start) * factor,
    normalize: (value: number, min: number, max: number) =>
      (value - min) / (max - min),
    mapRange: (
      value: number,
      inMin: number,
      inMax: number,
      outMin: number,
      outMax: number
    ) => ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin,
  };

  return {
    ...config,
    scale,
    responsive,
    components,
    typography,
    spacing,
    grid,
    shadows,
    utils,
  };
};

// Helper function to calculate responsive config
function calculateResponsiveConfig(
  width: number,
  height: number
): ResponsiveConfig {
  return {
    width,
    height,
    scale: width / BASE_WIDTH,
    fontScale: Math.min(width / BASE_WIDTH, 1.2),
    isPortrait: height > width,
    isLandscape: width > height,
    isTablet: width >= 768,
    isSmall: width < 375,
    isMedium: width >= 375 && width < 768,
    isLarge: width >= 768,
    platform: {
      isIOS: Platform.OS === "ios",
      isAndroid: Platform.OS === "android",
      isWeb: Platform.OS === "web",
    },
    safeArea: {
      top: Platform.select({ ios: 44, android: 0, default: 0 }),
      bottom: Platform.select({ ios: 34, android: 0, default: 0 }),
    },
  };
}

// Export for direct usage
export default useResponsive;