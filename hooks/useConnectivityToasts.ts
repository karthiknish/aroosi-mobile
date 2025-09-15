import { useEffect, useRef } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";

// Lazy import to avoid circular deps at module init time
function showToast(message: string, type: "success" | "error" | "info" | "warning" = "info") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Toast } = require("@/providers/ToastContext");
    if (type === "success") Toast.success(message, 2500);
    else if (type === "error") Toast.error(message);
    else if (type === "warning") Toast.warning(message, 3500);
    else Toast.info(message, 2500);
  } catch {}
}

export default function useConnectivityToasts() {
  const lastState = useRef<Pick<NetInfoState, "isConnected" | "isInternetReachable">>({
    isConnected: undefined as any,
    isInternetReachable: undefined as any,
  });

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const wasConnected = !!lastState.current.isConnected && lastState.current.isInternetReachable !== false;
      const isConnected = !!state.isConnected && state.isInternetReachable !== false;

      if (wasConnected !== isConnected) {
        try {
          if (isConnected) {
            showToast("Back online", "success");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } else {
            showToast("You are offline", "warning");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
        } catch {}
      }

      lastState.current = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      };
    });

    return () => sub && sub();
  }, []);
}
