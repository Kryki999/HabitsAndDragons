import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import DragonStreakWelcomeOverlay from "@/components/DragonStreakWelcomeOverlay";
import PlayerLevelUpOverlay from "@/components/PlayerLevelUpOverlay";

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Queues full-screen celebrations: daily dragon welcome first, then pending level-up.
 * Lives under tabs so onboarding / auth never see it.
 */
export default function CelebrationOverlayHost() {
  const lastDailyWelcomeDate = useGameStore((s) => s.lastDailyWelcomeDate);
  const appLoginStreak = useGameStore((s) => s.appLoginStreak);
  const lastAcknowledgedPlayerLevel = useGameStore((s) => s.lastAcknowledgedPlayerLevel);
  const dismissDailyWelcome = useGameStore((s) => s.dismissDailyWelcome);
  const acknowledgePlayerLevelUp = useGameStore((s) => s.acknowledgePlayerLevelUp);
  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);

  const playerLevel = getPlayerLevel();

  useEffect(() => {
    const s = useGameStore.getState();
    const lv = s.getPlayerLevel();
    if (s.lastAcknowledgedPlayerLevel > lv) {
      useGameStore.setState({ lastAcknowledgedPlayerLevel: lv });
    }
  }, [playerLevel]);

  const showDaily = lastDailyWelcomeDate !== todayKey();
  const showLevelUp = playerLevel > lastAcknowledgedPlayerLevel;

  const [phase, setPhase] = useState<"idle" | "daily" | "level">("idle");

  useEffect(() => {
    if (showDaily) setPhase("daily");
    else if (showLevelUp) setPhase("level");
    else setPhase("idle");
  }, [showDaily, showLevelUp]);

  return (
    <>
      <DragonStreakWelcomeOverlay
        visible={phase === "daily"}
        loginStreak={appLoginStreak}
        onDismiss={() => {
          dismissDailyWelcome();
        }}
      />
      <PlayerLevelUpOverlay
        visible={phase === "level"}
        level={playerLevel}
        onDismiss={() => {
          acknowledgePlayerLevelUp();
        }}
      />
    </>
  );
}
