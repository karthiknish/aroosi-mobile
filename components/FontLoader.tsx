import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAppFonts } from "@utils/fonts";
import { useTheme } from "@contexts/ThemeContext";

interface FontLoaderProps {
  children: React.ReactNode;
}

export const FontLoader: React.FC<FontLoaderProps> = ({ children }) => {
  const fontsLoaded = useAppFonts();
  const { theme } = useTheme();

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background.primary,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return <>{children}</>;
};