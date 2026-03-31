import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useGameStore } from "@/store/gameStore";

export default function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isAuthLoading, isProfileReady } = useAuth();
  const onboardingComplete = useGameStore((s) => s.onboardingComplete);

  const topSegment = String(segments[0] ?? "");
  const inAuth = topSegment === "(auth)";
  const inOnboarding = topSegment === "onboarding";
  const targetAfterAuth = onboardingComplete ? "/(tabs)" : "/onboarding";

  useEffect(() => {
    if (isAuthLoading) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // As soon as a valid auth session exists, leave the auth route immediately.
    if (session && inAuth) {
      timeoutId = setTimeout(() => router.replace(targetAfterAuth as any), 0);
      return () => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      };
    }

    // Outside /(auth), hold protected routes until profile bootstrap settles.
    if (session && !isProfileReady) return;

    if (!session && !inAuth) {
      timeoutId = setTimeout(() => router.replace("/(auth)/welcome" as any), 0);
    } else if (session && !onboardingComplete && !inOnboarding && !inAuth) {
      timeoutId = setTimeout(() => router.replace("/onboarding" as any), 0);
    } else if (session && onboardingComplete && inOnboarding) {
      timeoutId = setTimeout(() => router.replace("/(tabs)" as any), 0);
    }

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [isAuthLoading, isProfileReady, session, onboardingComplete, inAuth, inOnboarding, router, targetAfterAuth]);

  return null;
}

