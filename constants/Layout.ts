import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

// Enhanced responsive layout system
export const Layout = {
  window: {
    width,
    height,
  },

  // Device size breakpoints
  breakpoints: {
    xs: 320, // iPhone SE
    sm: 375, // iPhone 12 mini
    md: 390, // iPhone 12/13/14
    lg: 414, // iPhone 12/13/14 Plus
    xl: 428, // iPhone 12/13/14 Pro Max
    tablet: 768, // iPad
    desktop: 1024,
  },

  // Device type detection
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 414,
  isLargeDevice: width >= 414 && width < 768,
  isTablet: width >= 768,
  isPortrait: height > width,
  isLandscape: width > height,

  // Dynamic spacing based on device size
  getResponsiveSpacing: (base: number) => {
    if (width < 375) return base * 0.8;
    if (width >= 414) return base * 1.1;
    return base;
  },

  // Responsive font size utility
  getResponsiveFontSize: (base: number) => {
    if (width < 375) return base * 0.9; // iPhone SE
    if (width >= 428) return base * 1.05; // iPhone Pro Max
    return base;
  },

  // Responsive padding utility
  getResponsivePadding: (base: number) => {
    if (width < 375) return base * 0.75; // Smaller padding on small screens
    if (width >= 414) return base * 1.15; // Larger padding on big screens
    return base;
  },

  // Get responsive value based on screen size
  getResponsiveValue: <T>(
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
    if (width >= 768 && values.tablet) return values.tablet;
    if (width >= 428 && values.xl) return values.xl;
    if (width >= 414 && values.lg) return values.lg;
    if (width >= 390 && values.md) return values.md;
    if (width >= 375 && values.sm) return values.sm;
    if (width >= 320 && values.xs) return values.xs;
    return defaultValue;
  },

  // Enhanced responsive spacing
  spacing: {
    xs: (() => {
      if (width < 375) return 3;
      if (width >= 428) return 5;
      return 4;
    })(),
    sm: (() => {
      if (width < 375) return 6;
      if (width >= 428) return 10;
      return 8;
    })(),
    md: (() => {
      if (width < 375) return 12;
      if (width >= 428) return 18;
      return 16;
    })(),
    lg: (() => {
      if (width < 375) return 18;
      if (width >= 428) return 28;
      return 24;
    })(),
    xl: (() => {
      if (width < 375) return 24;
      if (width >= 428) return 36;
      return 32;
    })(),
    xxl: (() => {
      if (width < 375) return 36;
      if (width >= 428) return 56;
      return 48;
    })(),
  },

  // Border radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Typography - Responsive system matching web app
  typography: {
    // Font families (matching web app)
    fontFamily: {
      sans: "NunitoSans-Regular",
      sansMedium: "NunitoSans-Medium",
      sansSemiBold: "NunitoSans-SemiBold",
      sansBold: "NunitoSans-Bold",
      serif: "Boldonse-Regular",
      serifBold: "Boldonse-Regular",
      mono: "Courier New",
    },

    // Responsive font sizes
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
      "5xl": 48,
    },

    // Responsive line heights
    lineHeight: {
      xs: 16,
      sm: 20,
      base: 24,
      lg: 27,
      xl: 29,
      "2xl": 32,
      "3xl": 36,
      "4xl": 40,
      "5xl": 52,
      heading: 1.3,
    },

    fontWeight: {
      normal: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
    },
  },

  // Header heights
  header: {
    height: 64,
    heightWithSafeArea: 104,
  },

  // Tab bar
  tabBar: {
    height: 80,
  },

  // Safe areas (approximate)
  safeArea: {
    top: Platform.select({ ios: 44, android: 0, default: 0 }),
    bottom: Platform.select({ ios: 34, android: 0, default: 0 }),
  },

  // Card dimensions
  card: {
    minHeight: 400,
    aspectRatio: 3 / 4,
  },

  // Animation durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Z-index values
  zIndex: {
    modal: 1000,
    overlay: 900,
    dropdown: 800,
    header: 700,
    fab: 600,
  },

  // Enhanced responsive grid
  grid: {
    container: {
      paddingHorizontal: 16,
    },
    gutterWidth: 16,
    columns: 4,
  },

  // Component-specific responsive values
  components: {
    button: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 12,
      fontSize: 16,
    },
    input: {
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 12,
      fontSize: 16,
    },
    card: {
      padding: 16,
      borderRadius: 16,
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
    clamp: (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max),

    // Linear interpolation
    lerp: (start: number, end: number, factor: number) =>
      start + (end - start) * factor,

    // Normalize value between 0 and 1
    normalize: (value: number, min: number, max: number) =>
      (value - min) / (max - min),

    // Map value from one range to another
    mapRange: (
      value: number,
      inMin: number,
      inMax: number,
      outMin: number,
      outMax: number
    ) => ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin,

    // Get responsive value based on device type
    deviceBased: <T>(small: T, medium: T, large: T, tablet?: T): T => {
      if (Layout.isTablet && tablet !== undefined) return tablet;
      if (Layout.isSmallDevice) return small;
      if (Layout.isLargeDevice) return large;
      return medium;
    },
  },
};

export default Layout;
