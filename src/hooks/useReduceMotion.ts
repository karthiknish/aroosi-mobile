import { useEffect, useMemo, useState, useCallback } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "settings.reduceMotionUserPref";

export function useReduceMotion() {
  const [osReduceMotion, setOsReduceMotion] = useState<boolean>(false);
  const [userPref, setUserPref] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // iOS supports; Android often returns false
        const enabled = await (AccessibilityInfo as any).isReduceMotionEnabled?.();
        if (mounted && typeof enabled === "boolean") setOsReduceMotion(enabled);
      } catch {
        if (mounted) setOsReduceMotion(false);
      }
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (raw === "true" || raw === "false"))
          setUserPref(raw === "true");
      } catch {}
    })();

    const sub = (AccessibilityInfo as any).addEventListener?.(
      "reduceMotionChanged",
      (enabled: boolean) => setOsReduceMotion(!!enabled)
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const setUserPreference = useCallback(async (value: boolean | null) => {
    setUserPref(value);
    try {
      if (value === null) await AsyncStorage.removeItem(STORAGE_KEY);
      else await AsyncStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }, []);

  const reduceMotion = useMemo(
    () => (userPref === null ? osReduceMotion : userPref),
    [osReduceMotion, userPref]
  );

  return { reduceMotion, userPref, setUserPreference, osReduceMotion } as const;
}
