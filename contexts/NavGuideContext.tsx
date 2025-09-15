import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "@contexts/ThemeContext";

type TargetLayout = { x: number; y: number; width: number; height: number };
type Targets = Record<string, TargetLayout>;

interface NavGuideContextValue {
  registerTarget: (name: string, layout: TargetLayout) => void;
  registerTabBar: (layout: TargetLayout) => void;
}

const NavGuideContext = createContext<NavGuideContextValue | undefined>(undefined);

const STORAGE_KEY = "hasSeenNavGuide_v1";

interface StepDef {
  key: string;
  title: string;
  description: string;
}

const STEPS: StepDef[] = [
  {
    key: "matchesTab",
    title: "Matches",
    description: "View your matches, interests, and quick picks here.",
  },
  {
    key: "searchButton",
    title: "Search",
    description: "Tap the big 'A' button anytime to explore and search profiles.",
  },
];

export const NavGuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [targets, setTargets] = useState<Targets>({});
  const [tabBarLayout, setTabBarLayout] = useState<TargetLayout | null>(null);
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        setHasSeen(v === "1");
      } catch {
        setHasSeen(false);
      }
    })();
  }, []);

  const registerTarget = useCallback((name: string, layout: TargetLayout) => {
    setTargets((prev) => {
      if (!prev[name] || JSON.stringify(prev[name]) !== JSON.stringify(layout)) {
        return { ...prev, [name]: layout };
      }
      return prev;
    });
  }, []);

  const registerTabBar = useCallback((layout: TargetLayout) => {
    setTabBarLayout(layout);
  }, []);

  useEffect(() => {
    if (hasSeen === false && !show) {
      const allAvailable = STEPS.every((s) => targets[s.key]);
      if (allAvailable) setShow(true);
    }
  }, [hasSeen, targets, show]);

  const finish = async () => {
    setShow(false);
    setStep(0);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const current = STEPS[step];
  const currentTarget = current ? targets[current.key] : undefined;

  return (
    <NavGuideContext.Provider value={{ registerTarget, registerTabBar }}>
      {children}
      {show && currentTarget && tabBarLayout && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
            <View
              style={[
                styles.highlight,
                {
                  left: currentTarget.x + currentTarget.width / 2 - 36,
                  top: tabBarLayout.y + currentTarget.y - 8,
                  borderColor: theme.colors.primary[300],
                  backgroundColor: theme.colors.primary[500] + "22",
                },
              ]}
            />
            <View
              style={[
                styles.tooltip,
                {
                  backgroundColor: theme.colors.background.primary,
                  borderColor: theme.colors.border.primary,
                  left: 20,
                  right: 20,
                  bottom: (tabBarLayout.height || 70) + 100,
                },
              ]}
            >
              <Text style={[styles.tooltipTitle, { color: theme.colors.text.primary }]}>{current.title}</Text>
              <Text style={[styles.tooltipDesc, { color: theme.colors.text.secondary }]}>{current.description}</Text>
              <View style={styles.tooltipButtons}>
                <Pressable
                  onPress={finish}
                  style={[styles.secondaryBtn, { borderColor: theme.colors.border.primary }]}
                >
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Skip</Text>
                </Pressable>
                <Pressable
                  onPress={next}
                  style={[styles.primaryBtn, { backgroundColor: theme.colors.primary[500] }]}
                >
                  <Text style={{ color: theme.colors.text.inverse, fontWeight: "600" }}>
                    {step < STEPS.length - 1 ? "Next" : "Got it"}
                  </Text>
                </Pressable>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: theme.colors.text.tertiary,
                  textAlign: "center",
                }}
              >
                {step + 1} / {STEPS.length}
              </Text>
            </View>
          </View>
        </View>
      )}
    </NavGuideContext.Provider>
  );
};

export function useNavGuide() {
  const ctx = useContext(NavGuideContext);
  if (!ctx) throw new Error("useNavGuide must be used within NavGuideProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  highlight: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  tooltip: {
    position: "absolute",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  tooltipDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  tooltipButtons: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
    justifyContent: "flex-end",
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
