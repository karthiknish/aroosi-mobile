import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Import navigation and providers
import RootNavigator from "@/navigation/RootNavigator";
import EmailVerificationBanner from "./components/auth/EmailVerificationBanner";
import { NotificationProvider } from "@src/providers/NotificationProvider";
import { AuthProvider } from "./contexts";
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
  const navigationRef = useRef<NavigationContainerRef<any>>({} as any);

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

  return (
    <FontLoader>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
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
                        <SafeAreaView edges={["top"]}>
                          <EmailVerificationBanner />
                        </SafeAreaView>
                        <RootNavigator />
                      </NotificationProvider>
                    </NavigationContainer>
                  </ErrorBoundary>
                </LinearGradient>
              </SafeAreaProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
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
