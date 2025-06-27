import { Colors, darkColors } from './Colors';
import { Layout } from './Layout';

export interface Theme {
  colors: typeof Colors;
  layout: typeof Layout;
  components: {
    button: {
      primary: object;
      secondary: object;
      accent: object;
      danger: object;
    };
    card: object;
    input: object;
    text: {
      heading: object;
      body: object;
      caption: object;
    };
  };
}

// Component styles matching web app design
const createComponentStyles = (colors: typeof Colors) => ({
  button: {
    primary: {
      backgroundColor: colors.primary[500],
      borderRadius: Layout.radius.sm,
      paddingVertical: Layout.getResponsiveSpacing(12),
      paddingHorizontal: Layout.getResponsiveSpacing(24),
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    secondary: {
      backgroundColor: colors.secondary[500],
      borderRadius: Layout.radius.sm,
      paddingVertical: Layout.getResponsiveSpacing(12),
      paddingHorizontal: Layout.getResponsiveSpacing(24),
      shadowColor: colors.secondary[500],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    accent: {
      backgroundColor: colors.accent[500],
      borderRadius: Layout.radius.sm,
      paddingVertical: Layout.getResponsiveSpacing(12),
      paddingHorizontal: Layout.getResponsiveSpacing(24),
      shadowColor: colors.accent[500],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    danger: {
      backgroundColor: colors.error[500],
      borderRadius: Layout.radius.sm,
      paddingVertical: Layout.getResponsiveSpacing(12),
      paddingHorizontal: Layout.getResponsiveSpacing(24),
      shadowColor: colors.error[500],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent[500], // Matching web app border style
    padding: Layout.getResponsiveSpacing(16),
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: Layout.radius.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingVertical: Layout.getResponsiveSpacing(12),
    paddingHorizontal: Layout.getResponsiveSpacing(16),
    fontSize: Layout.typography.fontSize.base,
    color: colors.text.primary,
    fontFamily: Layout.typography.fontFamily.sans,
  },
  
  text: {
    heading: {
      fontFamily: Layout.typography.fontFamily.serif, // Boldonse
      fontWeight: Layout.typography.fontWeight.bold,
      lineHeight: Layout.typography.lineHeight.heading,
      color: colors.text.primary,
    },
    headingLarge: {
      fontFamily: Layout.typography.fontFamily.serif, // Boldonse Regular
      fontSize: Layout.typography.fontSize['3xl'],
      lineHeight: Layout.typography.lineHeight.heading,
      color: colors.text.primary,
      fontWeight: Layout.typography.fontWeight.bold, // Use fontWeight for emphasis
    },
    headingMedium: {
      fontFamily: Layout.typography.fontFamily.serif, // Boldonse Regular
      fontSize: Layout.typography.fontSize['2xl'],
      lineHeight: Layout.typography.lineHeight.heading,
      color: colors.text.primary,
    },
    headingSmall: {
      fontFamily: Layout.typography.fontFamily.serif, // Boldonse Regular
      fontSize: Layout.typography.fontSize.xl,
      lineHeight: Layout.typography.lineHeight.heading,
      color: colors.text.primary,
    },
    body: {
      fontFamily: Layout.typography.fontFamily.sans, // Nunito Sans Regular
      fontSize: Layout.typography.fontSize.base,
      lineHeight: Layout.typography.lineHeight.base,
      color: colors.text.primary,
    },
    bodyMedium: {
      fontFamily: Layout.typography.fontFamily.sansMedium, // Nunito Sans Medium
      fontSize: Layout.typography.fontSize.base,
      lineHeight: Layout.typography.lineHeight.base,
      color: colors.text.primary,
    },
    bodySemiBold: {
      fontFamily: Layout.typography.fontFamily.sansSemiBold, // Nunito Sans SemiBold
      fontSize: Layout.typography.fontSize.base,
      lineHeight: Layout.typography.lineHeight.base,
      color: colors.text.primary,
    },
    bodyBold: {
      fontFamily: Layout.typography.fontFamily.sansBold, // Nunito Sans Bold
      fontSize: Layout.typography.fontSize.base,
      lineHeight: Layout.typography.lineHeight.base,
      color: colors.text.primary,
    },
    caption: {
      fontFamily: Layout.typography.fontFamily.sans,
      fontSize: Layout.typography.fontSize.sm,
      lineHeight: Layout.typography.lineHeight.sm,
      color: colors.text.secondary,
    },
    captionMedium: {
      fontFamily: Layout.typography.fontFamily.sansMedium,
      fontSize: Layout.typography.fontSize.sm,
      lineHeight: Layout.typography.lineHeight.sm,
      color: colors.text.secondary,
    },
  },
});

// Light theme
export const lightTheme: Theme = {
  colors: Colors,
  layout: Layout,
  components: createComponentStyles(Colors),
};

// Dark theme
export const darkTheme: Theme = {
  colors: darkColors,
  layout: Layout,
  components: createComponentStyles(darkColors),
};

// Theme utilities
export const createThemeAwareStyle = <T>(
  lightStyle: T,
  darkStyle: T,
  isDark: boolean = false
): T => {
  return isDark ? darkStyle : lightStyle;
};

// Responsive utilities
export const getResponsiveValue = <T>(
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
  const { width } = Layout.window;
  
  if (width >= Layout.breakpoints.tablet && values.tablet) return values.tablet;
  if (width >= Layout.breakpoints.xl && values.xl) return values.xl;
  if (width >= Layout.breakpoints.lg && values.lg) return values.lg;
  if (width >= Layout.breakpoints.md && values.md) return values.md;
  if (width >= Layout.breakpoints.sm && values.sm) return values.sm;
  if (width >= Layout.breakpoints.xs && values.xs) return values.xs;
  
  return defaultValue;
};

// Shadow utilities matching web app
export const createShadow = (
  color: string = Colors.text.primary,
  opacity: number = 0.1,
  radius: number = 4,
  elevation: number = 2
) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: elevation,
});

// Export default theme
export default lightTheme;