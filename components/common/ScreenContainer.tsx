import React, { useMemo, useState } from "react";
import {
  ScrollView,
  ScrollViewProps,
  Dimensions,
  StyleSheet,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "@constants";
import { GradientBackground } from "@/components/ui/GradientComponents";

const { height } = Dimensions.get("window");

interface ScreenContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Style applied to the outer SafeAreaView */
  containerStyle?: ViewStyle | ViewStyle[];
  /** Style applied to the ScrollView content container */
  contentStyle?: ViewStyle | ViewStyle[];
  /** Optional sticky footer rendered below the scrollable content */
  footer?: React.ReactNode;
  /** Extra bottom padding (e.g., tab bar height) added below safe-area + footer */
  extraContentBottomPadding?: number;
}

/**
 * ScreenContainer
 * ----------------
 * A reusable wrapper that provides:
 * • Safe area handling
 * • Vertical scrolling when content overflows
 * • Minimum content height equal to the screen height so short pages still fill the screen
 */
const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  containerStyle,
  contentStyle,
  showsVerticalScrollIndicator = false,
  footer,
  extraContentBottomPadding = 0,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();
  // Do not call bottom-tabs hook here (may be used outside tabs). Prop will be set by HOCs.
  const detectedTabBarHeight = 0;
  const [footerHeight, setFooterHeight] = useState(0);

  const contentPaddingBottom = useMemo(() => {
    // Reserve space for footer height + bottom inset + small gap
    const extraPad =
      typeof extraContentBottomPadding === "number"
        ? extraContentBottomPadding
        : detectedTabBarHeight;
    return (footer ? footerHeight : 0) + insets.bottom + extraPad + 8;
  }, [
    footer,
    footerHeight,
    insets.bottom,
    extraContentBottomPadding,
    detectedTabBarHeight,
  ]);

  return (
    <SafeAreaView
      style={[styles.safeArea, containerStyle] as any}
      // Handle top/left/right insets here; bottom inset will be applied to footer container
      edges={["top", "right", "left"]}
    >
      <GradientBackground
        colors={Colors.gradient.secondary as any}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            [
              styles.content,
              { paddingBottom: contentPaddingBottom },
              contentStyle,
            ] as any
          }
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>

        {footer ? (
          <SafeAreaView
            // Only apply bottom inset here so the footer hugs the safe edge
            edges={["bottom"]}
            style={
              [styles.footerOverlay, { paddingBottom: insets.bottom }] as any
            }
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          >
            {footer}
          </SafeAreaView>
        ) : null}
      </GradientBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Keep transparent so the app-level gradient paints behind the top inset
    backgroundColor: "transparent",
  },
  gradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    minHeight: height,
  },
  footerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Let the provided footer style dictate visuals; this just positions it
  },
});

export default ScreenContainer;
