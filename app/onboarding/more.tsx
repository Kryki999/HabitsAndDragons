import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

/** Legacy route: deep profiling now lives in the main Sage wizard (Ask More). */
export default function OnboardingMoreRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding" as any);
  }, [router]);

  return (
    <LinearGradient colors={["#0a0810", "#140a1c", "#0d0a14"]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.dark.gold} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
