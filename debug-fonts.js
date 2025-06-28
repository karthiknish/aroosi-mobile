// Debug script to check font loading
import * as Font from 'expo-font';

const testFontLoading = async () => {
  try {
    console.log('🔍 Testing font loading...');
    
    // Load the Boldonse font
    await Font.loadAsync({
      'Boldonse-Regular': require('./assets/fonts/Boldonse-Regular.ttf'),
    });
    
    console.log('✅ Boldonse font loaded successfully');
    
    // Check if font is loaded
    const isLoaded = Font.isLoaded('Boldonse-Regular');
    console.log('🔍 Font isLoaded check:', isLoaded);
    
    // Get all loaded fonts
    const loadedFonts = Font.getLoadedFonts();
    console.log('📋 All loaded fonts:', loadedFonts);
    
  } catch (error) {
    console.error('❌ Font loading error:', error);
  }
};

export default testFontLoading;