import * as Font from 'expo-font';
import {
  useFonts,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';

// Font loading configuration
export const loadFonts = async () => {
  try {
    await Font.loadAsync({
      // Nunito Sans fonts from Google Fonts (for body text)
      'NunitoSans-Regular': NunitoSans_400Regular,
      'NunitoSans-Medium': NunitoSans_500Medium,
      'NunitoSans-SemiBold': NunitoSans_600SemiBold,
      'NunitoSans-Bold': NunitoSans_700Bold,
      
      // Boldonse font from local file (for headings)
      'Boldonse-Regular': require('../assets/fonts/Boldonse-Regular.ttf'),
    });
    console.log('Fonts loaded successfully');
  } catch (error) {
    console.warn('Error loading fonts:', error);
    // Fallback to system fonts if custom fonts fail to load
  }
};

// Hook for loading fonts in components
export const useAppFonts = () => {
  const [fontsLoaded, error] = useFonts({
    "NunitoSans-Regular": NunitoSans_400Regular,
    "NunitoSans-Medium": NunitoSans_500Medium,
    "NunitoSans-SemiBold": NunitoSans_600SemiBold,
    "NunitoSans-Bold": NunitoSans_700Bold,
    "Boldonse-Regular": require("../assets/fonts/Boldonse-Regular.ttf"),
  });

  if (error) {
    console.error("Font loading error:", error);
  }

  if (fontsLoaded) {
    console.log("✅ All fonts loaded successfully, including Boldonse");
    console.log("🔍 Testing font availability...");

    // Test if fonts are actually loaded
    setTimeout(() => {
      try {
        const isBoldonseLoaded = Font.isLoaded("Boldonse");
        const isBoldonseRegularLoaded = Font.isLoaded("Boldonse-Regular");
        console.log("Boldonse loaded:", isBoldonseLoaded);
        console.log("Boldonse-Regular loaded:", isBoldonseRegularLoaded);
      } catch (e) {
        console.log("Error checking font status:", e);
      }
    }, 1000);
  }

  return fontsLoaded;
};

// Font family mappings with fallbacks
export const getFontFamily = (fontName: string): string => {
  const fontMap: { [key: string]: string } = {
    'NunitoSans-Regular': 'NunitoSans-Regular',
    'NunitoSans-Medium': 'NunitoSans-Medium', 
    'NunitoSans-SemiBold': 'NunitoSans-SemiBold',
    'NunitoSans-Bold': 'NunitoSans-Bold',
    'Boldonse-Regular': 'Boldonse-Regular',
  };

  return fontMap[fontName] || 'System';
};

// Check if fonts are loaded
export const areFontsLoaded = (): boolean => {
  try {
    return Font.isLoaded('NunitoSans-Regular') && Font.isLoaded('Boldonse-Regular');
  } catch {
    return false;
  }
};