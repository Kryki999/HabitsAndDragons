import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import PlayerLevelUpOverlay from "@/components/PlayerLevelUpOverlay";

/**
 * Queues full-screen celebrations: level-up overlay.
 * Daily login flow is handled separately by DailyFlowModal.
 * Lives under tabs so onboarding / auth never see it.
 */
export default function CelebrationOverlayHost() {
  const lastAcknowledgedPlayerLevel = useGameStore((s) => s.lastAcknowledgedPlayerLevel);
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

  const showLevelUp = playerLevel > lastAcknowledgedPlayerLevel;

  const [phase, setPhase] = useState<"idle" | "level">("idle");

  useEffect(() => {
    if (showLevelUp) setPhase("level");
    else setPhase("idle");
  }, [showLevelUp]);

  return (
    <PlayerLevelUpOverlay
      visible={phase === "level"}
      level={playerLevel}
      onDismiss={() => {
        acknowledgePlayerLevelUp();
      }}
    />
  );
}
