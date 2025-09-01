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
import { Colors } from "@constants";

type ToastType = "success" | "error" | "info";

type ToastOptions = {
  type?: ToastType;
  durationMs?: number; // auto-hide after
};

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
  durationMs: number;
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

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, maxVisible = 1 }) => {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const idRef = useRef(1);

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const currentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = queue[0];

  const animateIn = useCallback(() => {
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
  }, [opacity, translateY]);

  const animateOut = useCallback((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
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
  }, [opacity, translateY]);

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

      setQueue((q) => {
        const next = [...q, { id, text, type, durationMs }];
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
          <View pointerEvents="box-none" style={styles.portalTop}>
            {current && (
              <Animated.View
                style={[
                  styles.toast,
                  stylesByType(current.type),
                  { opacity, transform: [{ translateY }] },
                ]}
              >
                <Text style={styles.toastText}>{current.text}</Text>
                <TouchableOpacity
                  onPress={hide}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.toastAction}>Dismiss</Text>
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toastText: {
    color: "white",
    flexShrink: 1,
    fontWeight: "600",
  },
  toastAction: {
    color: "white",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

function stylesByType(type: ToastType) {
  switch (type) {
    case "success":
      return { backgroundColor: Colors?.success?.[500] ?? "#16a34a" };
    case "error":
      return { backgroundColor: Colors?.error?.[500] ?? "#dc2626" };
    default:
      return { backgroundColor: Colors?.neutral?.[900] ?? "#111827" };
  }
}

export default ToastProvider;