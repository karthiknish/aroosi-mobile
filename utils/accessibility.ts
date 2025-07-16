import { AccessibilityInfo, Platform } from "react-native";

// Accessibility roles that match web application
export const AccessibilityRoles = {
  BUTTON: "button" as const,
  LINK: "link" as const,
  TEXT: "text" as const,
  HEADING: "header" as const,
  IMAGE: "image" as const,
  LIST: "list" as const,
  LIST_ITEM: "listitem" as const,
  TAB: "tab" as const,
  TAB_LIST: "tablist" as const,
  SEARCH: "search" as const,
  FORM: "form" as const,
  ALERT: "alert" as const,
  MENU: "menu" as const,
  MENU_ITEM: "menuitem" as const,
  CHECKBOX: "checkbox" as const,
  RADIO: "radio" as const,
  SWITCH: "switch" as const,
  SLIDER: "slider" as const,
  PROGRESS: "progressbar" as const,
};

// Accessibility states
export interface AccessibilityState {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | "mixed";
  busy?: boolean;
  expanded?: boolean;
}

// Accessibility props helper
export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityRole?: keyof typeof AccessibilityRoles;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: Array<{
    name: string;
    label?: string;
  }>;
  onAccessibilityAction?: (event: {
    nativeEvent: { actionName: string };
  }) => void;
}

// Helper functions for creating accessible components
export function createAccessibleButton(
  label: string,
  hint?: string,
  disabled = false
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.BUTTON,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled },
  };
}

export function createAccessibleLink(
  label: string,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.LINK,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

export function createAccessibleHeading(
  text: string,
  level?: number
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.HEADING,
    accessibilityLabel: text,
    accessibilityValue: level ? { text: `Heading level ${level}` } : undefined,
  };
}

export function createAccessibleImage(
  alt: string,
  decorative = false
): AccessibilityProps {
  if (decorative) {
    return {
      accessible: false,
    };
  }

  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.IMAGE,
    accessibilityLabel: alt,
  };
}

export function createAccessibleTextInput(
  label: string,
  hint?: string,
  required = false,
  error?: string
): AccessibilityProps {
  const accessibilityLabel = required ? `${label}, required` : label;
  const accessibilityHint = error ? `${hint || ""} ${error}`.trim() : hint;

  return {
    accessible: true,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState: error ? { invalid: true } : undefined,
  };
}

export function createAccessibleCheckbox(
  label: string,
  checked: boolean,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.CHECKBOX,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { checked },
  };
}

export function createAccessibleSwitch(
  label: string,
  value: boolean,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.SWITCH,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { checked: value },
  };
}

export function createAccessibleSlider(
  label: string,
  value: number,
  min: number,
  max: number,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.SLIDER,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityValue: { min, max, now: value },
  };
}

export function createAccessibleProgress(
  label: string,
  value: number,
  max: number
): AccessibilityProps {
  const percentage = Math.round((value / max) * 100);

  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.PROGRESS,
    accessibilityLabel: `${label}, ${percentage}% complete`,
    accessibilityValue: { min: 0, max, now: value },
  };
}

export function createAccessibleAlert(
  message: string,
  type: "error" | "warning" | "info" | "success" = "info"
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.ALERT,
    accessibilityLabel: `${type}: ${message}`,
    accessibilityLiveRegion: "polite",
  };
}

// Screen reader utilities
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
}

export async function announceForAccessibility(message: string): Promise<void> {
  try {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(message);
    } else if (Platform.OS === "android") {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, {
        queue: false,
      });
    }
  } catch (error) {
    console.warn("Failed to announce for accessibility:", error);
  }
}

// Focus management
export function setAccessibilityFocus(ref: any): void {
  if (ref?.current && Platform.OS === "ios") {
    AccessibilityInfo.setAccessibilityFocus(ref.current);
  }
}

// Accessibility testing helpers
export function getAccessibilityTestProps(testID: string) {
  return {
    testID,
    accessibilityLabel: testID,
  };
}

// Form accessibility helpers
export function getFormFieldAccessibility(
  label: string,
  value?: string,
  error?: string,
  required = false
) {
  const accessibilityLabel = `${label}${required ? ", required" : ""}${
    value ? `, current value: ${value}` : ""
  }`;
  const accessibilityHint = error || `Enter ${label.toLowerCase()}`;

  return {
    accessible: true,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState: error ? { invalid: true } : undefined,
  };
}

// Navigation accessibility
export function getTabAccessibility(
  label: string,
  selected: boolean,
  index: number,
  total: number
) {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.TAB,
    accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
    accessibilityState: { selected },
  };
}

// List accessibility
export function getListItemAccessibility(
  label: string,
  index: number,
  total: number,
  hint?: string
) {
  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.LIST_ITEM,
    accessibilityLabel: `${label}, ${index + 1} of ${total}`,
    accessibilityHint: hint,
  };
}

// Profile card accessibility
export function getProfileCardAccessibility(
  name: string,
  age?: number,
  location?: string,
  hint = "Double tap to view profile"
) {
  const ageText = age ? `, ${age} years old` : "";
  const locationText = location ? `, from ${location}` : "";
  const label = `${name}${ageText}${locationText}`;

  return {
    accessible: true,
    accessibilityRole: AccessibilityRoles.BUTTON,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

// Message accessibility
export function getMessageAccessibility(
  senderName: string,
  message: string,
  timestamp: string,
  isOwn: boolean
) {
  const prefix = isOwn ? "You said" : `${senderName} said`;
  const label = `${prefix}: ${message}, sent ${timestamp}`;

  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: AccessibilityRoles.TEXT,
  };
}
