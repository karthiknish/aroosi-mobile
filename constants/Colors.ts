export const Colors = {
  // Primary brand colors - Soft Pink (from web app)
  primary: {
    50: "#fdf2f8",
    100: "#fce7f3",
    200: "#fbcfe8",
    300: "#f9a8d4",
    400: "#f472b6",
    500: "#EC4899", // Main brand color from web
    600: "#db2777",
    700: "#BE185D", // Primary dark from web
    800: "#9d174d",
    900: "#831843",
  },

  // Secondary brand colors - Dusty Blue (from web app)
  secondary: {
    50: "#f0f7fa",
    100: "#daebf2",
    200: "#b8d7e6",
    300: "#A2C4DB", // Secondary light from web
    400: "#7ba8c7",
    500: "#5F92AC", // Secondary from web
    600: "#4a7a95",
    700: "#3E647A", // Secondary dark from web
    800: "#355364",
    900: "#2d4553",
  },

  // Accent colors - Muted Gold/Warm Sand (from web app)
  accent: {
    50: "#faf8f4",
    100: "#f4efe3",
    200: "#EDD6A4", // Accent light from web
    300: "#e1c485",
    400: "#d8b570",
    500: "#D6B27C", // Accent from web
    600: "#c49f68",
    700: "#B28E5F", // Accent dark from web
    800: "#997851",
    900: "#7f6343",
  },

  // Success colors - Gentle Green (from web app)
  success: {
    50: "#f1f8f2",
    100: "#ddeee0",
    200: "#bedbc5",
    300: "#92c299",
    400: "#7BA17D", // Success from web
    500: "#5a8960",
    600: "#46704c",
    700: "#3a5b40",
    800: "#304935",
    900: "#273c2c",
  },

  // Warning colors
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },

  // Error colors - Subtle Terracotta Red (from web app)
  error: {
    50: "#fdf2f2",
    100: "#fde8e8",
    200: "#fbd5d5",
    300: "#f8b4b4",
    400: "#f48888",
    500: "#B45E5E", // Danger from web
    600: "#a54545",
    700: "#8b3a3a",
    800: "#723232",
    900: "#5f2c2c",
  },

  // Background colors - Clean Soft Off-white (from web app)
  background: {
    primary: "#FFFFFF", // Base light from web
    secondary: "#F9F7F5", // Base from web
    tertiary: "#E7E3DF", // Base dark from web
  },

  // Text colors - Muted Charcoal (from web app)
  text: {
    primary: "#4A4A4A", // Neutral from web
    secondary: "#7A7A7A", // Neutral light from web
    tertiary: "#9ca3af",
    inverse: "#ffffff",
  },

  // Border colors
  border: {
    primary: "#e5e7eb",
    secondary: "#d1d5db",
    focus: "#EC4899", // Primary color
  },

  // Gradient colors
  gradient: {
    primary: ["#EC4899", "#BE185D"], // Primary gradient
    secondary: ["#fce7f3", "#fdf2f8"], // Lighter pink gradient
    accent: ["#D6B27C", "#B28E5F"], // Warm gold gradient
  },

  // Neutral/Gray colors
  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Gray colors (alias for neutral)
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Info colors
  info: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },

  // Clerk Auth colors (matching web app)
  clerk: {
    primary: "#BFA67A",
    danger: "#d90012",
  },
};

export const darkColors = {
  // Primary brand colors (same)
  primary: Colors.primary,
  
  // Secondary brand colors (same)
  secondary: Colors.secondary,
  
  // Accent colors (same)
  accent: Colors.accent,
  
  // Dark neutral colors
  neutral: {
    50: '#111827',
    100: '#1f2937',
    200: '#374151',
    300: '#4b5563',
    400: '#6b7280',
    500: '#9ca3af',
    600: '#d1d5db',
    700: '#e5e7eb',
    800: '#f3f4f6',
    900: '#f9fafb',
  },
  
  // Gray colors (alias for neutral in dark mode)
  gray: {
    50: '#111827',
    100: '#1f2937',
    200: '#374151',
    300: '#4b5563',
    400: '#6b7280',
    500: '#9ca3af',
    600: '#d1d5db',
    700: '#e5e7eb',
    800: '#f3f4f6',
    900: '#f9fafb',
  },
  
  // Info colors (same)
  info: Colors.info,
  
  // Success, warning, error (same)
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  
  // Dark background colors
  background: {
    primary: '#111827',
    secondary: '#1f2937',
    tertiary: '#374151',
  },
  
  // Dark text colors
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    tertiary: '#9ca3af',
    inverse: '#111827',
  },
  
  // Dark border colors
  border: {
    primary: '#374151',
    secondary: '#4b5563',
    focus: '#f04438',
  },
  
  // Gradient colors (same)
  gradient: Colors.gradient,
  
  // Clerk Auth colors (same)
  clerk: Colors.clerk,
};