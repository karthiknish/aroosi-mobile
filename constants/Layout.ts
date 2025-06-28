import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

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
  },

  // Device type detection
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 414,
  isLargeDevice: width >= 414 && width < 768,
  isTablet: width >= 768,

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

  // Responsive spacing
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
      sans: "NunitoSans-Regular", // Nunito Sans for body text
      sansMedium: "NunitoSans-Medium",
      sansSemiBold: "NunitoSans-SemiBold",
      sansBold: "NunitoSans-Bold",
      serif: "Boldonse-Regular", // Always use Boldonse-Regular for headings
      serifBold: "Boldonse-Regular", // Always use Boldonse-Regular for bold headings
      mono: "Courier New",
    },

    // Responsive font sizes with better scaling
    fontSize: {
      xs: (() => {
        if (width < 375) return 11;
        if (width >= 428) return 13;
        return 12;
      })(),
      sm: (() => {
        if (width < 375) return 13;
        if (width >= 428) return 15;
        return 14;
      })(),
      base: (() => {
        if (width < 375) return 15;
        if (width >= 428) return 17;
        return 16;
      })(),
      lg: (() => {
        if (width < 375) return 17;
        if (width >= 428) return 19;
        return 18;
      })(),
      xl: (() => {
        if (width < 375) return 19;
        if (width >= 428) return 21;
        return 20;
      })(),
      "2xl": (() => {
        if (width < 375) return 22;
        if (width >= 428) return 26;
        return 24;
      })(),
      "3xl": (() => {
        if (width < 375) return 28;
        if (width >= 428) return 32;
        return 30;
      })(),
      "4xl": (() => {
        if (width < 375) return 34;
        if (width >= 428) return 38;
        return 36;
      })(),
      "5xl": (() => {
        if (width < 375) return 44;
        if (width >= 428) return 52;
        return 48;
      })(),
    },

    // Responsive line heights
    lineHeight: {
      xs: (() => {
        if (width < 375) return 15;
        if (width >= 428) return 17;
        return 16;
      })(),
      sm: (() => {
        if (width < 375) return 19;
        if (width >= 428) return 21;
        return 20;
      })(),
      base: (() => {
        if (width < 375) return 22;
        if (width >= 428) return 26;
        return 24;
      })(),
      lg: (() => {
        if (width < 375) return 25;
        if (width >= 428) return 29;
        return 27;
      })(),
      xl: (() => {
        if (width < 375) return 27;
        if (width >= 428) return 31;
        return 29;
      })(),
      "2xl": (() => {
        if (width < 375) return 30;
        if (width >= 428) return 34;
        return 32;
      })(),
      "3xl": (() => {
        if (width < 375) return 34;
        if (width >= 428) return 38;
        return 36;
      })(),
      "4xl": (() => {
        if (width < 375) return 38;
        if (width >= 428) return 42;
        return 40;
      })(),
      "5xl": (() => {
        if (width < 375) return 48;
        if (width >= 428) return 56;
        return 52;
      })(),
      heading: 1.3, // Heading line height from web
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
    heightWithSafeArea: 104, // Approximate with status bar
  },

  // Tab bar
  tabBar: {
    height: 80,
  },

  // Safe areas (approximate)
  safeArea: {
    top: 44,
    bottom: 34,
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
};

export default Layout;
