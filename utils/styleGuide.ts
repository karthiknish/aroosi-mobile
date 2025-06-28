import { StyleSheet } from 'react-native';
import { lightTheme } from '../constants/Theme';
import { Colors, Layout } from '../constants';

// Typography styles using the theme system
export const typography = StyleSheet.create({
  // Headings - Use Boldonse font
  h1: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["3xl"],
    lineHeight: Layout.typography.lineHeight.heading,
    color: Colors.text.primary,
  },
  h2: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    lineHeight: Layout.typography.lineHeight.heading,
    color: Colors.text.primary,
  },
  h3: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    lineHeight: Layout.typography.lineHeight.heading,
    color: Colors.text.primary,
  },
  h4: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.lg,
    lineHeight: Layout.typography.lineHeight.heading,
    color: Colors.text.primary,
  },

  // Body text - Use Nunito Sans
  bodyLarge: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.lg,
    lineHeight: Layout.typography.lineHeight.lg,
    color: Colors.text.primary,
  },
  body: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: Colors.text.primary,
  },
  bodyMedium: {
    fontFamily: Layout.typography.fontFamily.sansMedium,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: Colors.text.primary,
  },
  bodySemiBold: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: Colors.text.primary,
  },
  bodyBold: {
    fontFamily: Layout.typography.fontFamily.sansBold,
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
    color: Colors.text.primary,
  },

  // Small text
  caption: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: Layout.typography.lineHeight.sm,
    color: Colors.text.secondary,
  },
  captionMedium: {
    fontFamily: Layout.typography.fontFamily.sansMedium,
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: Layout.typography.lineHeight.sm,
    color: Colors.text.secondary,
  },
  small: {
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.xs,
    lineHeight: Layout.typography.lineHeight.xs,
    color: Colors.text.tertiary,
  },
});

// Common component styles using theme colors
export const components = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    padding: Layout.spacing.lg,
    shadowColor: Colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.accent[500],
    padding: Layout.spacing.lg,
    shadowColor: Colors.accent[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary[500],
    borderRadius: Layout.radius.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    shadowColor: Colors.secondary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonAccent: {
    backgroundColor: Colors.accent[500],
    borderRadius: Layout.radius.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    shadowColor: Colors.accent[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Input fields
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    fontFamily: Layout.typography.fontFamily.sans,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  inputFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 2,
  },

  // Containers
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  section: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
});

// Button text styles
export const buttonText = StyleSheet.create({
  primary: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    textAlign: 'center',
  },
  secondary: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    textAlign: 'center',
  },
  accent: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    textAlign: 'center',
  },
});

// Usage example:
// import { typography, components, buttonText } from '../utils/styleGuide';
// 
// <Text style={typography.h1}>Heading with Boldonse</Text>
// <Text style={typography.body}>Body text with Nunito Sans</Text>
// <View style={components.card}>
//   <TouchableOpacity style={components.buttonPrimary}>
//     <Text style={buttonText.primary}>Button Text</Text>
//   </TouchableOpacity>
// </View>