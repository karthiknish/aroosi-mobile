import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ClerkProvider } from '@clerk/clerk-expo';

// Import navigation and providers
import RootNavigator from "@/navigation/RootNavigator";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { ClerkAuthProvider } from "./contexts";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "@providers/ToastContext";
import { FontLoader } from "@components/FontLoader";
import { Colors } from "@constants/Colors";
import { photoService } from "./services/PhotoService";
import ErrorBoundary from "./providers/ErrorBoundary";

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  React.useEffect(() => {
    // Initialize offline queue for image uploads
    photoService.initializeOfflineQueue();

    // Add any other initialization logic here
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  // Clerk publishable key - you'll need to set this in your environment
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

  if (!publishableKey) {
    console.error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Configuration Error</Text>
        <Text style={styles.subtitle}>Missing Clerk publishable key</Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <FontLoader>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ClerkAuthProvider>
              <ToastProvider>
                <SafeAreaProvider>
                  <LinearGradient
                    colors={Colors.gradient.secondary as any}
                    style={{ flex: 1 }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ErrorBoundary>
                      <NavigationContainer ref={navigationRef}>
                        <NotificationProvider navigationRef={navigationRef}>
                          <StatusBar style="auto" />
                          <RootNavigator />
                        </NotificationProvider>
                      </NavigationContainer>
                    </ErrorBoundary>
                  </LinearGradient>
                </SafeAreaProvider>
              </ToastProvider>
            </ClerkAuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </FontLoader>
    </ClerkProvider>
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
