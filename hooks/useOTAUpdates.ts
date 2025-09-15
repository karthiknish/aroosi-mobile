import { useEffect } from "react";
import * as Updates from "expo-updates";

function showUpdateToast(message: string, onRestart?: () => void) {
  try {
    // Lazy require to avoid cycles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Toast } = require("@/providers/ToastContext");
    Toast.show(message, {
      type: "primary",
      durationMs: 8000,
      action: onRestart
        ? {
            label: "Restart",
            onPress: onRestart,
          }
        : undefined,
      position: "bottom",
    });
  } catch {}
}

export default function useOTAUpdates() {
  useEffect(() => {
    let canceled = false;
    async function checkUpdates() {
      try {
        if (__DEV__) return; // skip in dev
        const result = await Updates.checkForUpdateAsync();
        if (canceled) return;
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (canceled) return;
          showUpdateToast("A new update is ready.", async () => {
            try {
              await Updates.reloadAsync();
            } catch {}
          });
        }
      } catch (e) {
        // silent
      }
    }

    checkUpdates();

    return () => {
      canceled = true;
    };
  }, []);
}
