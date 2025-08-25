import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Canonical base dimensions (align with useResponsive)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Responsive scaling functions (aligned to src/hooks/useResponsive.ts)
export const responsive = {
  // Width-based scaling
  width: (size: number) => (screenWidth / BASE_WIDTH) * size,

  // Height-based scaling
  height: (size: number) => (screenHeight / BASE_HEIGHT) * size,

  // Font scaling with platform adjustment
  font: (size: number) => {
    const scale = screenWidth / BASE_WIDTH;
    const newSize = size * scale;
    if (Platform.OS === "ios") {
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  },

  // Padding/Margin scaling with clamp like the hook
  spacing: (size: number) => {
    const s = Math.min(screenWidth / BASE_WIDTH, 1.2);
    return Math.round(size * s);
  },

  // Border radius scaling
  radius: (size: number) => Math.round((screenWidth / BASE_WIDTH) * size),

  // Icon size scaling with mild cap similar to hook
  icon: (size: number) => {
    const s = Math.min(screenWidth / BASE_WIDTH, 1.1);
    return Math.round(size * s);
  },

  // Button size scaling (kept but based on canonical width)
  button: {
    small: Math.round((screenWidth / BASE_WIDTH) * 32),
    medium: Math.round((screenWidth / BASE_WIDTH) * 44),
    large: Math.round((screenWidth / BASE_WIDTH) * 56),
  },

  // Input field scaling (canonical base)
  input: {
    height: Math.round((screenWidth / BASE_WIDTH) * 48),
    borderRadius: Math.round((screenWidth / BASE_WIDTH) * 8),
  },
};

// Breakpoint system
export const breakpoints = {
  xs: 0,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1440,
};

// Device detection
export const device = {
  isSmall: screenWidth < breakpoints.sm,
  isMedium: screenWidth >= breakpoints.sm && screenWidth < breakpoints.md,
  isLarge: screenWidth >= breakpoints.md && screenWidth < breakpoints.lg,
  isTablet: screenWidth >= breakpoints.md,
  isPhone: screenWidth < breakpoints.md,
  isPortrait: screenHeight > screenWidth,
  isLandscape: screenWidth > screenHeight,
};

// Safe area insets
export const safeArea = {
  top: Platform.OS === "ios" ? 44 : 0,
  bottom: Platform.OS === "ios" ? 34 : 0,
  left: 0,
  right: 0,
};

// Grid system
export const grid = {
  container: {
    paddingHorizontal: responsive.spacing(16),
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  col: (size: number) => ({
    width: `${(size / 12) * 100}%`,
  }),
};

// Typography scale
export const typography = {
  h1: responsive.font(32),
  h2: responsive.font(28),
  h3: responsive.font(24),
  h4: responsive.font(20),
  h5: responsive.font(18),
  h6: responsive.font(16),
  body1: responsive.font(16),
  body2: responsive.font(14),
  caption: responsive.font(12),
  small: responsive.font(10),
};

// Shadow styles
export const shadows = {
  small: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  large: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
};

// Color palette
export const colors = {
  primary: "#BFA67A",
  secondary: "#8B7355",
  accent: "#EC4899",
  background: "#F9F7F5",
  surface: "#FFFFFF",
  text: {
    primary: "#1F2937",
    secondary: "#6B7280",
    disabled: "#9CA3AF",
    inverse: "#FFFFFF",
  },
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
  border: "#E5E7EB",
  divider: "#F3F4F6",
};

// Animation durations
export const animations = {
  fast: 150,
  medium: 250,
  slow: 350,
};

// Export all responsive utilities
export default {
  responsive,
  breakpoints,
  device,
  safeArea,
  grid,
  typography,
  shadows,
  colors,
  animations,
};
