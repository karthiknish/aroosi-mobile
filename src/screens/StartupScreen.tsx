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

const { height, width } = Dimensions.get("window");

interface StartupScreenProps {
  onGetStarted: () => void;
}

export default function StartupScreen({ onGetStarted }: StartupScreenProps) {
  return (
    <ImageBackground
      source={{
        uri: "https://epicfilming.co.uk/wp-content/uploads/2023/10/Untitled-5-683x1024.jpg",
      }}
      style={styles.background}
      resizeMode="cover"
    >
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

const styles = StyleSheet.create({
  background: {
    flex: 1,
    height,
    width,
    justifyContent: "flex-end",
  },
  overlay: {
    width: "100%",
    paddingHorizontal: 32,
    paddingBottom: 64,
  },
  button: {
    backgroundColor: Colors.primary[500] || "#ff3366",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.text?.inverse || "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  topContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 64,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  heading: {
    color: Colors.text?.inverse || "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
