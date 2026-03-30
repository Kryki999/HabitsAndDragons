import React, { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { useGameStore } from "@/store/gameStore";
import DailyRecapScreen from "@/components/DailyRecapScreen";
import StreakMilestoneScreen from "@/components/StreakMilestoneScreen";

type FlowScreen = "recap" | "streak";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0]!;
}

/**
 * Global orchestrator for the Daily Login Flow.
 *
 * Visibility rules:
 *  - Player must be fully onboarded.
 *  - Today's date ≠ lastDailyWelcomeDate  →  normal daily trigger.
 *  - forceDailyFlowPending === true        →  dev override (ignores date).
 *
 * Sequence: DailyRecapScreen → StreakMilestoneScreen → dismiss (tabs visible).
 */
export default function DailyFlowModal() {
  const onboardingComplete = useGameStore((s) => s.onboardingComplete);
  const lastDailyWelcomeDate = useGameStore((s) => s.lastDailyWelcomeDate);
  const forceDailyFlowPending = useGameStore((s) => s.forceDailyFlowPending);
  const completeDailyFlow = useGameStore((s) => s.completeDailyFlow);

  const shouldShow =
    onboardingComplete &&
    (lastDailyWelcomeDate !== getTodayString() || forceDailyFlowPending);

  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState<FlowScreen>("recap");

  // Crossfade opacity between screens
  const crossfadeOpacity = useSharedValue(1);

  // Reveal modal only after first render to avoid flash on cold start
  const hasChecked = useRef(false);
  useEffect(() => {
    if (!hasChecked.current) {
      hasChecked.current = true;
      if (shouldShow) setVisible(true);
    }
  }, []); // only once on mount

  // When shouldShow becomes true via dev button while modal is closed, open it
  useEffect(() => {
    if (shouldShow && !visible) {
      setScreen("recap");
      crossfadeOpacity.value = 1;
      setVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  // When modal closes (shouldShow flips false after completeDailyFlow), hide
  useEffect(() => {
    if (!shouldShow && visible) {
      setVisible(false);
      setScreen("recap");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  const crossfadeStyle = useAnimatedStyle(() => ({
    opacity: crossfadeOpacity.value,
    flex: 1,
  }));

  function transitionTo(nextScreen: FlowScreen) {
    crossfadeOpacity.value = withTiming(0, { duration: 280 }, () => {
      runOnJS(setScreen)(nextScreen);
      crossfadeOpacity.value = withTiming(1, { duration: 320 });
    });
  }

  function handleContinue() {
    transitionTo("streak");
  }

  function handleComplete() {
    // Fade out before dismissing
    crossfadeOpacity.value = withTiming(0, { duration: 350 }, () => {
      runOnJS(completeDailyFlow)();
    });
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {/* Prevent hardware-back dismiss */}}
    >
      <View style={styles.root}>
        <Animated.View style={crossfadeStyle}>
          {screen === "recap" ? (
            <DailyRecapScreen onContinue={handleContinue} />
          ) : (
            <StreakMilestoneScreen onComplete={handleComplete} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020109",
  },
});
