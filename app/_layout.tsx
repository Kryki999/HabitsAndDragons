import "react-native-reanimated";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Colors from "@/constants/colors";
import DailyLoginSync from "@/components/DailyLoginSync";
import AuthGate from "@/components/AuthGate";
import CloudSync from "@/components/CloudSync";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthenticatedEffects() {
  const { session, isProfileReady } = useAuth();
  const segments = useSegments();
  const inAuth = String(segments[0] ?? "") === "(auth)";
  if (!session || !isProfileReady || inAuth) return null;
  return (
    <>
      <DailyLoginSync />
      <CloudSync />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AuthenticatedEffects />
          <StatusBar style="light" />
          <RootLayoutNav />
          <AuthGate />
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
