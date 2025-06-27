import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { Layout } from '../constants/Layout';

interface ResponsiveHookResult {
  width: number;
  height: number;
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isLargeDevice: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  scale: number;
  fontScale: number;
}

export const useResponsive = (): ResponsiveHookResult => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height, scale, fontScale } = Dimensions.get('window');
    return { width, height, scale, fontScale };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        scale: window.scale,
        fontScale: window.fontScale,
      });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height, scale, fontScale } = dimensions;

  return {
    width,
    height,
    isSmallDevice: width < Layout.breakpoints.sm,
    isMediumDevice: width >= Layout.breakpoints.sm && width < Layout.breakpoints.lg,
    isLargeDevice: width >= Layout.breakpoints.lg && width < Layout.breakpoints.tablet,
    isTablet: width >= Layout.breakpoints.tablet,
    orientation: width > height ? 'landscape' : 'portrait',
    scale,
    fontScale,
  };
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  tablet?: T;
  default: T;
}): T => {
  const { width } = useResponsive();

  if (width >= Layout.breakpoints.tablet && values.tablet !== undefined) {
    return values.tablet;
  }
  if (width >= Layout.breakpoints.xl && values.xl !== undefined) {
    return values.xl;
  }
  if (width >= Layout.breakpoints.lg && values.lg !== undefined) {
    return values.lg;
  }
  if (width >= Layout.breakpoints.md && values.md !== undefined) {
    return values.md;
  }
  if (width >= Layout.breakpoints.sm && values.sm !== undefined) {
    return values.sm;
  }
  if (width >= Layout.breakpoints.xs && values.xs !== undefined) {
    return values.xs;
  }

  return values.default;
};

// Hook for responsive spacing
export const useResponsiveSpacing = () => {
  const { isSmallDevice, isLargeDevice } = useResponsive();

  const getSpacing = (base: number): number => {
    if (isSmallDevice) return base * 0.8;
    if (isLargeDevice) return base * 1.1;
    return base;
  };

  return {
    getSpacing,
    spacing: {
      xs: getSpacing(Layout.spacing.xs),
      sm: getSpacing(Layout.spacing.sm),
      md: getSpacing(Layout.spacing.md),
      lg: getSpacing(Layout.spacing.lg),
      xl: getSpacing(Layout.spacing.xl),
      xxl: getSpacing(Layout.spacing.xxl),
    },
  };
};

// Hook for responsive typography
export const useResponsiveTypography = () => {
  const { fontScale, isSmallDevice } = useResponsive();

  const getFontSize = (base: number): number => {
    let size = base;
    
    // Adjust for small devices
    if (isSmallDevice) {
      size = size * 0.9;
    }
    
    // Respect user's font scale setting
    return size * fontScale;
  };

  return {
    getFontSize,
    fontSize: {
      xs: getFontSize(Layout.typography.fontSize.xs),
      sm: getFontSize(Layout.typography.fontSize.sm),
      base: getFontSize(Layout.typography.fontSize.base),
      lg: getFontSize(Layout.typography.fontSize.lg),
      xl: getFontSize(Layout.typography.fontSize.xl),
      '2xl': getFontSize(Layout.typography.fontSize['2xl']),
      '3xl': getFontSize(Layout.typography.fontSize['3xl']),
      '4xl': getFontSize(Layout.typography.fontSize['4xl']),
      '5xl': getFontSize(Layout.typography.fontSize['5xl']),
    },
  };
};