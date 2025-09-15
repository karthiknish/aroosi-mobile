import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  UIManager,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Import navigation and providers
import RootNavigator from "@/navigation/RootNavigator";
import EmailVerificationBanner from "./components/auth/EmailVerificationBanner";
import { NotificationProvider } from "@src/providers/NotificationProvider";
import { AuthProvider } from "./contexts";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "@providers/ToastContext";
import { FontLoader } from "@components/FontLoader";
import { useTheme } from "@contexts/ThemeContext";
import { photoService } from "./services/PhotoService";
import ErrorBoundary from "./providers/ErrorBoundary";
import { initSentry, Sentry } from "./utils/sentry";
import useConnectivityToasts from "./hooks/useConnectivityToasts";
import useOTAUpdates from "./hooks/useOTAUpdates";

// Initialize React Query client with global error handling
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      try {
        const { normalizeError, showErrorToast } = require("@/utils/toast");
        const n = normalizeError(error);
        if (n.isAuth) return;
        showErrorToast(n.message);
      } catch (e) {
        console.error("Query error:", error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      try {
        const { normalizeError, showErrorToast } = require("@/utils/toast");
        const n = normalizeError(error);
        if (n.isAuth) return;
        showErrorToast(n.message);
      } catch (e) {
        console.error("Mutation error:", error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Backoff retries for transient issues only
        const message = (error as any)?.message || "";
        const status = (error as any)?.status;
        const isNetwork =
          /network|timeout/i.test(message) ||
          (error as any)?.code === "NETWORK_ERROR";
        const isServer = typeof status === "number" && status >= 500;
        const isRateLimit = status === 429;
        return failureCount < 2 && (isNetwork || isServer || isRateLimit);
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: {},
  },
});

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>({} as any);

  React.useEffect(() => {
    // Initialize offline queue for image uploads
    photoService.initializeOfflineQueue();

    // Add any other initialization logic here
    try {
      initSentry();
    } catch {}
    // Enable LayoutAnimation on Android
    try {
      if (
        Platform.OS === "android" &&
        UIManager.setLayoutAnimationEnabledExperimental
      ) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    } catch {}
    setIsReady(true);
  }, []);

  // Global UX hooks
  useConnectivityToasts();
  useOTAUpdates();

  return (
    <FontLoader>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                  {isReady ? (
                    <ThemedShell navigationRef={navigationRef} />
                  ) : (
                    <View style={styles.container}>
                      <LoaderSpinner />
                    </View>
                  )}
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </FontLoader>
  );
}

const LoaderSpinner = () => {
  const { theme } = useTheme();
  return <ActivityIndicator size="large" color={theme.colors.primary[500]} />;
};

const ThemedShell = ({
  navigationRef,
}: {
  navigationRef: React.MutableRefObject<NavigationContainerRef<any>>;
}) => {
  const { theme } = useTheme();
  const routeNameRef = useRef<string | undefined>(undefined);
  return (
    <LinearGradient
      colors={theme.colors.gradient.secondary as any}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ErrorBoundary>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            try {
              routeNameRef.current =
                navigationRef.current?.getCurrentRoute?.()?.name;
            } catch {}
          }}
          onStateChange={() => {
            try {
              const previous = routeNameRef.current;
              const current = navigationRef.current?.getCurrentRoute?.()?.name;
              if (current && previous !== current) {
                Sentry.addBreadcrumb({
                  category: "navigation",
                  type: "navigation",
                  level: "info",
                  message: `Navigated to ${current}`,
                  data: { from: previous, to: current },
                });
              }
              routeNameRef.current = current;
            } catch {}
          }}
        >
          <NotificationProvider navigationRef={navigationRef}>
            <StatusBar style="auto" />
            <EmailVerificationBanner />
            <RootNavigator />
          </NotificationProvider>
        </NavigationContainer>
      </ErrorBoundary>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: undefined as any,
  },
  subtitle: {
    fontSize: 16,
    color: undefined as any,
    textAlign: "center",
  },
});
