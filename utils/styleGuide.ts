import { StyleSheet } from 'react-native';
import { Theme } from '../constants/Theme';
import { Layout } from '../constants';
import { useThemedStyles } from '../contexts/ThemeContext';

// Typography styles using the theme system
const createTypography = (theme: Theme) => StyleSheet.create({
  // Headings - Use Boldonse font
  h1: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["3xl"],
    lineHeight: Layout.typography.lineHeight.heading,
    color: theme.colors.text.primary,
  },
  h2: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    lineHeight: Layout.typography.lineHeight.heading,
    color: theme.colors.text.primary,
  },
  h3: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    lineHeight: Layout.typography.lineHeight.heading,
    color: theme.colors.text.primary,
  },
  h4: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.lg,
    lineHeight: Layout.typography.lineHeight.heading,
    color: theme.colors.text.primary,
  },

  // Body text - Use Nunito Sans
  bodyLarge: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.lg,
    lineHeight: Layout.typography.lineHeight.lg,
    color: theme.colors.text.primary,
  },
  body: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: theme.colors.text.primary,
  },
  bodyMedium: {
    fontFamily: Layout.typography.fontFamily.sansMedium,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: theme.colors.text.primary,
  },
  bodySemiBold: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: theme.colors.text.primary,
  },
  bodyBold: {
    fontFamily: Layout.typography.fontFamily.sansBold,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: theme.colors.text.primary,
  },

  // Small text
  caption: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: Layout.typography.lineHeight.sm,
    color: theme.colors.text.secondary,
  },
  captionMedium: {
    fontFamily: Layout.typography.fontFamily.sansMedium,
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: Layout.typography.lineHeight.sm,
    color: theme.colors.text.secondary,
  },
  small: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.xs,
    lineHeight: Layout.typography.lineHeight.xs,
    color: theme.colors.text.tertiary,
  },
});

// Common component styles using theme colors
const createComponents = (theme: Theme) => StyleSheet.create({
  // Cards
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    padding: Layout.spacing.lg,
    shadowColor: theme.colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.accent[500],
    padding: Layout.spacing.lg,
    shadowColor: theme.colors.accent[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: Layout.radius.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.secondary[500],
    borderRadius: Layout.radius.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    shadowColor: theme.colors.secondary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonAccent: {
    backgroundColor: theme.colors.accent[500],
    borderRadius: Layout.radius.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    shadowColor: theme.colors.accent[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Input fields
  input: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: Layout.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  inputFocused: {
    borderColor: theme.colors.border.focus,
    borderWidth: 2,
  },

  // Containers
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  section: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
});

// Button text styles
const createButtonText = (theme: Theme) => StyleSheet.create({
  primary: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    color: theme.colors.background.primary,
    textAlign: 'center',
  },
  secondary: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    color: theme.colors.background.primary,
    textAlign: 'center',
  },
  accent: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    color: theme.colors.background.primary,
    textAlign: 'center',
  },
});

// Hooks to consume themed styles in components
export const useTypography = () => useThemedStyles(createTypography);
export const useComponentStyles = () => useThemedStyles(createComponents);
export const useButtonTextStyles = () => useThemedStyles(createButtonText);

// Usage example:
// import { useTypography, useComponentStyles, useButtonTextStyles } from '../utils/styleGuide';
// 
// <Text style={typography.h1}>Heading with Boldonse</Text>
// <Text style={typography.body}>Body text with Nunito Sans</Text>
// <View style={components.card}>
//   <TouchableOpacity style={components.buttonPrimary}>
//     <Text style={buttonText.primary}>Button Text</Text>
//   </TouchableOpacity>
// </View>