import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useGameStore } from "@/store/gameStore";

export default function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isAuthLoading, isProfileReady } = useAuth();
  const playerClass = useGameStore((s) => s.playerClass);

  const topSegment = String(segments[0] ?? "");
  const inAuth = topSegment === "(auth)";
  const inOnboarding = topSegment === "onboarding";

  useEffect(() => {
    if (isAuthLoading || (session && !isProfileReady)) return;

    if (!session && !inAuth) {
      router.replace("/(auth)/welcome" as any);
      return;
    }

    if (session && !playerClass && !inOnboarding) {
      router.replace("/onboarding/class" as any);
      return;
    }

    if (session && inAuth) {
      router.replace((playerClass ? "/(tabs)" : "/onboarding/class") as any);
      return;
    }

    if (session && playerClass && inOnboarding) {
      router.replace("/(tabs)" as any);
    }
  }, [isAuthLoading, isProfileReady, session, playerClass, inAuth, inOnboarding, router]);

  if (isAuthLoading || (session && !isProfileReady)) {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator color={Colors.dark.gold} size="large" />
        <Text style={styles.text}>Przywołuję kroniki bohatera...</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d0a14ee",
    gap: 10,
  },
  text: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
});

