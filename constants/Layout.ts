import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Layout = {
  window: {
    width,
    height,
  },
  
  // Device size breakpoints
  breakpoints: {
    xs: 320,  // iPhone SE
    sm: 375,  // iPhone 12 mini
    md: 390,  // iPhone 12/13/14
    lg: 414,  // iPhone 12/13/14 Plus
    xl: 428,  // iPhone 12/13/14 Pro Max
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
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
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
      sans: 'System', // Will use Nunito Sans when implemented
      serif: 'System', // Will use Boldonse when implemented
      mono: 'Courier New',
    },
    
    // Responsive font sizes
    fontSize: {
      xs: width < 375 ? 11 : 12,
      sm: width < 375 ? 13 : 14,
      base: width < 375 ? 15 : 16,
      lg: width < 375 ? 17 : 18,
      xl: width < 375 ? 19 : 20,
      '2xl': width < 375 ? 22 : 24,
      '3xl': width < 375 ? 28 : 30,
      '4xl': width < 375 ? 34 : 36,
      '5xl': width < 375 ? 44 : 48,
    },
    
    // Line heights (matching web app)
    lineHeight: {
      xs: width < 375 ? 15 : 16,
      sm: width < 375 ? 19 : 20,
      base: width < 375 ? 22 : 24,
      lg: width < 375 ? 26 : 28,
      xl: width < 375 ? 26 : 28,
      '2xl': width < 375 ? 30 : 32,
      '3xl': width < 375 ? 34 : 36,
      '4xl': width < 375 ? 38 : 40,
      '5xl': width < 375 ? 44 : 48,
      heading: 1.3, // Heading line height from web
    },
    
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
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