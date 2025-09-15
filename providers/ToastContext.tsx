import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import * as Haptics from "expo-haptics";

// Keep track of recent toast messages to prevent duplicates (within a window)
const recentToasts = new Map<string, number>();

type ToastType = "success" | "error" | "info" | "warning" | "primary";

type ToastOptions = {
  type?: ToastType;
  durationMs?: number; // auto-hide after
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
  };
  position?: "top" | "bottom";
};

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
  durationMs: number;
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
  };
  position?: "top" | "bottom";
};

type ToastContextValue = {
  show: (text: string, type?: ToastType, durationMs?: number) => void;
  showWithOptions: (text: string, options?: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};

type ToastProviderProps = {
  children: React.ReactNode;
  maxVisible?: number;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxVisible = 1,
}) => {
  const { theme } = useTheme();
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const idRef = useRef(1);

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const currentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = queue[0];

  const animateIn = useCallback(() => {
    // Slide from top or bottom depending on toast position
    const from = current?.position === "bottom" ? 80 : -80;
    translateY.setValue(from);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, current?.position]);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      const to = current?.position === "bottom" ? 80 : -80;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: to,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && onDone) onDone();
      });
    },
    [opacity, translateY, current?.position]
  );

  const dequeueNext = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const hide = useCallback(() => {
    if (!current) return;
    if (currentTimer.current) {
      clearTimeout(currentTimer.current);
      currentTimer.current = null;
    }
    animateOut(() => {
      dequeueNext();
    });
  }, [animateOut, current, dequeueNext]);

  const scheduleAutoHide = useCallback(
    (durationMs: number) => {
      if (currentTimer.current) {
        clearTimeout(currentTimer.current);
      }
      currentTimer.current = setTimeout(() => {
        hide();
      }, durationMs);
    },
    [hide]
  );

  const showWithOptions = useCallback(
    (text: string, options?: ToastOptions) => {
      const id = idRef.current++;
      const type: ToastType = options?.type ?? "info";
      const durationMs = options?.durationMs ?? 2500;
      const action = options?.action;
      const position = options?.position ?? "top";

      // Normalize error messages to be human-friendly similar to web
      let normalizedText = text ?? "";
      if (type === "error") {
        const fallback = "Something went wrong. Please try again.";
        try {
          // Try to parse structured payload appended after ':: {...}'
          const raw = normalizedText.split("::").pop()?.trim();
          if (raw && raw.startsWith("{") && raw.endsWith("}")) {
            const parsed = JSON.parse(raw);
            if (
              parsed &&
              typeof parsed === "object" &&
              parsed.code === "ONBOARDING_INCOMPLETE"
            ) {
              normalizedText = "Please finish onboarding to continue.";
            }
          }
        } catch {}
        try {
          normalizedText = humanizeErrorMessage(normalizedText, fallback);
        } catch {}
        try {
          normalizedText = normalizedText
            .replace(/[\r\n]+/g, " ")
            .slice(0, 300);
        } catch {}
      }

      // Prevent duplicate toasts of the same message within a short window (3s)
      try {
        const key = `${type}|${(normalizedText || text).trim()}`;
        const now = Date.now();
        const last = recentToasts.get(key);
        if (last && now - last < 3000) return; // skip duplicate
        recentToasts.set(key, now);
        // Cleanup old entries (> 5s) occasionally
        for (const [k, t] of recentToasts.entries()) {
          if (now - t > 5000) recentToasts.delete(k);
        }
      } catch {}

      // Subtle haptics by type (non-blocking)
      try {
        if (type === "error") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (type === "success") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (type === "warning") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}

      setQueue((q) => {
        const next = [
          ...q,
          { id, text: normalizedText, type, durationMs, action, position },
        ];
        if (next.length > maxVisible) {
          return next.slice(next.length - maxVisible);
        }
        return next;
      });
    },
    [maxVisible]
  );

  const show = useCallback(
    (text: string, type: ToastType = "info", durationMs: number = 2500) => {
      showWithOptions(text, { type, durationMs });
    },
    [showWithOptions]
  );

  // When current changes, animate in and schedule hide
  React.useEffect(() => {
    if (!current) return;
    animateIn();
    scheduleAutoHide(current.durationMs);
    return () => {
      if (currentTimer.current) {
        clearTimeout(currentTimer.current);
        currentTimer.current = null;
      }
    };
  }, [current, animateIn, scheduleAutoHide]);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      showWithOptions,
      hide,
    }),
    [hide, show, showWithOptions]
  );

  // Bind global Toast singleton to provider methods for imperative usage
  React.useEffect(() => {
    Toast.show = (text, options) => showWithOptions(text, options);
    Toast.hide = hide;
    Toast.success = (message: string, durationMs = 4000) =>
      showWithOptions(message, { type: "success", durationMs });
    Toast.info = (message: string, durationMs = 4000) =>
      showWithOptions(message, { type: "info", durationMs });
    Toast.warning = (message: string, durationMs = 5000) =>
      showWithOptions(message, { type: "warning", durationMs });
    Toast.primary = (message: string, durationMs = 6000) =>
      showWithOptions(message, { type: "primary", durationMs });
    Toast.undo = (
      message: string,
      onUndo: () => void | Promise<void>,
      actionLabel = "Undo",
      durationMs = 6000
    ) =>
      showWithOptions(message, {
        type: "success",
        durationMs,
        action: { label: actionLabel, onPress: onUndo },
      });
    Toast.error = (
      error: unknown,
      fallback = "Something went wrong. Please try again.",
      durationMs = 5000
    ) => {
      let message: string | undefined;
      if (typeof error === "string" && error.trim()) message = error.trim();
      else if (error instanceof Error && error.message)
        message = error.message.trim();
      else if (
        error &&
        typeof error === "object" &&
        "error" in (error as any) &&
        typeof (error as any).error === "string"
      )
        message = (error as any).error.trim();
      if (!message || message.length === 0) message = fallback;
      try {
        const raw = message.split("::").pop()?.trim();
        if (raw && raw.startsWith("{") && raw.endsWith("}")) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed === "object" &&
            parsed.code === "ONBOARDING_INCOMPLETE"
          ) {
            message = "Please finish onboarding to continue.";
          }
        }
      } catch {}
      try {
        message = humanizeErrorMessage(message, fallback);
      } catch {}
      try {
        message = message.replace(/[\r\n]+/g, " ").slice(0, 300);
      } catch {}
      showWithOptions(message, { type: "error", durationMs });
      if (error) console.error("[ToastError]", error);
    };
  }, [hide, showWithOptions]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Portal (Top overlay) - use Modal so it appears above other Modals (e.g., BottomSheet) */}
      <Modal
        visible={!!current}
        transparent
        animationType="none"
        statusBarTranslucent
        // presentationStyle keeps iOS behavior consistent
        presentationStyle="overFullScreen"
      >
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={
              current?.position === "bottom"
                ? styles.portalBottom
                : styles.portalTop
            }
          >
            {current && (
              <Animated.View
                style={[
                  styles.toast,
                  stylesByType(current.type, theme),
                  {
                    opacity,
                    transform: [{ translateY }],
                    shadowColor: theme.colors.neutral[900],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toastText,
                    { color: theme.colors.text.inverse },
                  ]}
                >
                  {current.text}
                </Text>
                {current.action && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const r = current.action?.onPress?.();
                        if (r && typeof (r as any).then === "function") {
                          await (r as Promise<void>);
                        }
                      } catch (e) {
                        // swallow
                      } finally {
                        hide();
                      }
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={[
                        styles.toastAction,
                        { color: theme.colors.text.inverse },
                      ]}
                    >
                      {current.action.label}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={hide}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.toastAction,
                      { color: theme.colors.text.inverse },
                    ]}
                  >
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  portalTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    alignItems: "center",
  },
  portalBottom: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    paddingBottom: 24,
    alignItems: "center",
  },
  toast: {
    minWidth: 280,
    maxWidth: 360,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toastText: {
    flexShrink: 1,
    fontWeight: "600",
  },
  toastAction: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

function stylesByType(
  type: ToastType,
  theme: ReturnType<typeof useTheme>["theme"]
) {
  switch (type) {
    case "success":
      return { backgroundColor: theme.colors.success[500] };
    case "error":
      return { backgroundColor: theme.colors.error[500] };
    case "warning":
      return {
        backgroundColor:
          theme.colors.warning?.[600] ?? theme.colors.warning[500],
      };
    case "primary":
      return { backgroundColor: theme.colors.primary[600] };
    default:
      return { backgroundColor: theme.colors.neutral[900] };
  }
}

export default ToastProvider;

// Centralized, imperative Toast API (optional usage outside React components)
// Provider registers these handlers on mount. Calls before mount are no-ops.
type ToastAPI = {
  show: (text: string, options?: ToastOptions) => void;
  hide: () => void;
  // Convenience helpers matching web utilities
  success: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
  primary: (message: string, durationMs?: number) => void;
  error: (error: unknown, fallback?: string, durationMs?: number) => void;
  undo: (
    message: string,
    onUndo: () => void | Promise<void>,
    actionLabel?: string,
    durationMs?: number
  ) => void;
};

const noop = () => {};
const ToastImpl: ToastAPI = {
  show: noop,
  hide: noop,
  success: noop as any,
  info: noop as any,
  warning: noop as any,
  primary: noop as any,
  error: noop as any,
  undo: noop as any,
};

// Expose singleton
export const Toast = ToastImpl as Readonly<ToastAPI> & ToastAPI;

// Humanize common Firebase/auth and permission errors similar to web
function humanizeErrorMessage(raw: string, fallback: string) {
  const original = raw;
  let msg = raw;
  try {
    msg = msg.replace(/^Firebase:?( Error)? ?\(([^)]+)\)\.?/i, "$2");
    msg = msg.replace(/firebase/gi, "service");
    const mappings: { pattern: RegExp; friendly: string }[] = [
      { pattern: /auth\/(email-already-in-use|email-already-exists)/i, friendly: "An account with this email already exists." },
      { pattern: /auth\/invalid-email/i, friendly: "Invalid email address." },
      { pattern: /auth\/(invalid-password|weak-password)/i, friendly: "Password is too weak." },
      { pattern: /auth\/wrong-password/i, friendly: "Incorrect email or password." },
      { pattern: /auth\/(user-not-found|user-disabled)/i, friendly: "Account not found." },
      { pattern: /auth\/too-many-requests/i, friendly: "Too many attempts. Please try again later." },
      { pattern: /auth\/network-request-failed/i, friendly: "Network error. Check your connection." },
      { pattern: /auth\/popup-closed-by-user/i, friendly: "Sign-in was cancelled." },
      { pattern: /auth\/internal-error/i, friendly: "Unexpected error. Please try again." },
      { pattern: /auth\/id-token-expired/i, friendly: "Session expired. Please sign in again." },
      { pattern: /auth\/invalid-credential/i, friendly: "Invalid email or password." },
      { pattern: /permission-denied/i, friendly: "You don't have permission to do that." },
      { pattern: /missing or insufficient permissions/i, friendly: "You don't have permission to do that." },
    ];
    for (const { pattern, friendly } of mappings) {
      if (pattern.test(msg)) return friendly;
    }
    if (/^auth\//i.test(msg)) return fallback;
    if (original === msg && /auth\//i.test(original)) return fallback;
    return msg;
  } catch {
    return fallback;
  }
}

// End of binding logic