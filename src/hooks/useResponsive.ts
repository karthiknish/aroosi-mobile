import { useMemo, useState, useEffect } from 'react';
import {
  useWindowDimensions,
  PixelRatio,
  Platform,
} from "react-native";

/**
 * Canonical responsive hooks expected by consumers:
 * - useResponsive (default and named)
 * - useResponsiveSpacing
 * - useResponsiveTypography
 * - useResponsiveValue
 * - useBreakpoint
 */

// Responsive configuration
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'tablet';

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

const BREAKPOINTS = {
  xs: 320,
  sm: 375,
  md: 390,
  lg: 414,
  xl: 428,
  tablet: 768,
} as const;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const [config, setConfig] = useState<ResponsiveConfig>(() =>
    calculateResponsiveConfig(width, height)
  );

  useEffect(() => {
    setConfig(calculateResponsiveConfig(width, height));
  }, [width, height]);

  // Responsive scaling functions
  const scale = useMemo(() => ({
    width: (size: number, baseWidth = BASE_WIDTH) => (width / baseWidth) * size,
    height: (size: number, baseHeight = BASE_HEIGHT) =>
      (height / baseHeight) * size,
    font: (size: number) => {
      const s = width / BASE_WIDTH;
      const newSize = size * s;

      if (Platform.OS === "ios") {
        return Math.round(PixelRatio.roundToNearestPixel(newSize));
      } else {
        return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
      }
    },
    spacing: (size: number) => {
      const s = Math.min(width / BASE_WIDTH, 1.2);
      return Math.round(size * s);
    },
    radius: (size: number) => Math.round((width / BASE_WIDTH) * size),
    icon: (size: number) => {
      const s = Math.min(width / BASE_WIDTH, 1.1);
      return Math.round(size * s);
    },
  }), [width, height]);

  // Responsive value selection
  const responsive = useMemo(() => {
    return function responsiveFn<T>(
      values: Partial<Record<BreakpointKey, T>>,
      defaultValue: T
    ): T {
      if (config.isTablet && values.tablet !== undefined) return values.tablet as T;
      if (width >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl as T;
      if (width >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg as T;
      if (width >= BREAKPOINTS.md && values.md !== undefined) return values.md as T;
      if (width >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm as T;
      if (width >= BREAKPOINTS.xs && values.xs !== undefined) return values.xs as T;
      return defaultValue;
    };
  }, [width, config.isTablet]);

  // Component-specific responsive values
  const components = useMemo(() => ({
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
  }), [scale]);

  // Typography scaling (hook-variant; constants still available via Layout.typography)
  const typography = useMemo(() => ({
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
    // also expose sizes comparable to Layout.typography.fontSize semantic keys
    fontSize: {
      xs: scale.font(12),
      sm: scale.font(14),
      base: scale.font(16),
      lg: scale.font(18),
      xl: scale.font(20),
      "2xl": scale.font(24),
      "3xl": scale.font(30),
      "4xl": scale.font(36),
      "5xl": scale.font(48),
    } as Record<"xs"|"sm"|"base"|"lg"|"xl"|"2xl"|"3xl"|"4xl"|"5xl", number>,
  }), [scale]);

  // Spacing system
  const spacing = useMemo(() => ({
    xs: scale.spacing(4),
    sm: scale.spacing(8),
    md: scale.spacing(16),
    lg: scale.spacing(24),
    xl: scale.spacing(32),
    xxl: scale.spacing(48),
  }), [scale]);

  // Grid system
  const grid = useMemo(() => ({
    container: {
      paddingHorizontal: scale.spacing(16),
    },
    gutterWidth: scale.spacing(16),
    columns: config.isTablet ? 12 : 4,
  }), [scale, config.isTablet]);

  // Shadows
  const shadows = useMemo(() => ({
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
  }), [scale]);

  // Utility functions
  const utils = useMemo(() => ({
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
  }), []);

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

// Convenience hooks expected by consumers

export const useResponsiveSpacing = () => {
  const { spacing } = useResponsive();
  return { spacing };
};

export const useResponsiveTypography = () => {
  const { typography } = useResponsive();
  // Expose both headline sizes and semantic fontSize map for parity with Layout.typography.fontSize
  return {
    ...typography,
    fontSize: typography.fontSize
  };
};

export const useResponsiveValue = <T,>(
  values: Partial<Record<BreakpointKey, T>>,
  defaultValue: T
) => {
  const { responsive } = useResponsive();
  return responsive<T>(values, defaultValue);
};

export const useBreakpoint = () => {
  const { width, isTablet } = useResponsive();
  const current: BreakpointKey =
    isTablet ? 'tablet'
    : width >= BREAKPOINTS.xl ? 'xl'
    : width >= BREAKPOINTS.lg ? 'lg'
    : width >= BREAKPOINTS.md ? 'md'
    : width >= BREAKPOINTS.sm ? 'sm'
    : 'xs';

  return {
    current,
    matches: {
      xs: current === 'xs',
      sm: current === 'sm',
      md: current === 'md',
      lg: current === 'lg',
      xl: current === 'xl',
      tablet: current === 'tablet',
    },
    up: (bp: BreakpointKey) => width >= BREAKPOINTS[bp],
    down: (bp: BreakpointKey) => width < BREAKPOINTS[bp],
    between: (min: BreakpointKey, max: BreakpointKey) =>
      width >= BREAKPOINTS[min] && width < BREAKPOINTS[max],
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
      top: Platform.select({ ios: 44, android: 0, default: 0 }) as number,
      bottom: Platform.select({ ios: 34, android: 0, default: 0 }) as number,
    },
  };
}

// Export for direct usage
export default useResponsive;