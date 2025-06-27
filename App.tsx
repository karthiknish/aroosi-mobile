import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { ClerkProvider } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'react-native-secure-store';

// Import navigation and providers
import RootNavigator from './src/navigation/RootNavigator';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { FontLoader } from './components/FontLoader';
import { Colors } from './constants/Colors';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error saving token:', err);
    }
  },
};

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  React.useEffect(() => {
    // Add any initialization logic here
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <FontLoader>
      <ClerkProvider
        publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        tokenCache={tokenCache}
      >
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer ref={navigationRef}>
              <NotificationProvider navigationRef={navigationRef}>
                <StatusBar style="auto" />
                <RootNavigator />
              </NotificationProvider>
            </NavigationContainer>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </FontLoader>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
