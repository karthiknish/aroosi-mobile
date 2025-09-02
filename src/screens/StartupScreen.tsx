import React from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  Image,
} from "react-native";
import { Colors } from "@constants/Colors";
import { rgbaHex } from "@utils/color";
import { Layout } from "@constants/Layout";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";

const { height, width } = Dimensions.get("window");

interface StartupScreenProps {
  onGetStarted: () => void;
}

export default function StartupScreen({ onGetStarted }: StartupScreenProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const styles = StyleSheet.create({
    background: {
      flex: 1,
      height,
      width,
      justifyContent: "flex-end",
    },
    darkOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: rgbaHex(Colors.neutral[900], 0.4),
    },
    overlay: {
      width: "100%",
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl * 2,
    },
    button: {
      backgroundColor: Colors.primary[500],
      paddingVertical: spacing.md,
      borderRadius: spacing.xs * 3,
      alignItems: "center",
    },
    buttonText: {
      color: Colors.text.inverse,
      fontSize: fontSize.lg,
      fontWeight: "600",
    },
    topContainer: {
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: spacing.xl * 2.5,
      flex: 1,
    },
    logo: {
      width: spacing.xl * 3.75, // 120px equivalent
      height: spacing.xl * 3.75, // 120px equivalent
      marginBottom: spacing.md,
      backgroundColor: Colors.background.primary,
    },
    heading: {
      fontFamily: Layout.typography.fontFamily.serif,
      color: Colors.text.inverse,
      fontSize: fontSize["2xl"],
      fontWeight: "800",
      textAlign: "center",
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md + spacing.xs,
      letterSpacing: 0.5,
    },
  });

  return (
    <ImageBackground
      source={{
        uri: "https://epicfilming.co.uk/wp-content/uploads/2023/10/Untitled-5-683x1024.jpg",
      }}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Dark overlay to make background image darker */}
      <View style={styles.darkOverlay} />

      {/* Top branding section */}
      <View style={styles.topContainer}>
        {/* App Logo */}
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Tagline */}
        <Text style={styles.heading}>Connect with Afghans Worldwide</Text>
      </View>

      <View style={styles.overlay}>
  <TouchableOpacity onPress={onGetStarted} style={styles.button}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}


