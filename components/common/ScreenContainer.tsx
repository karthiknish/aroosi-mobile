import React from "react";
import {
  SafeAreaView,
  ScrollView,
  ScrollViewProps,
  Dimensions,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Colors } from "@constants";
import { GradientBackground } from "@/components/ui/GradientComponents";

const { height } = Dimensions.get("window");

interface ScreenContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Style applied to the outer SafeAreaView */
  containerStyle?: ViewStyle | ViewStyle[];
  /** Style applied to the ScrollView content container */
  contentStyle?: ViewStyle | ViewStyle[];
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
  ...scrollViewProps
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, containerStyle] as any}>
      <GradientBackground
        colors={Colors.gradient.secondary as any}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentStyle] as any}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
});

export default ScreenContainer;
