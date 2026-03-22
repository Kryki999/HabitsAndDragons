import * as Haptics from "expo-haptics";
import { useGameStore } from "@/store/gameStore";

export { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";

function hapticsOn(): boolean {
  return useGameStore.getState().hapticsEnabled !== false;
}

/** Respects Settings → Haptics toggle. */
export async function impactAsync(style: Haptics.ImpactFeedbackStyle): Promise<void> {
  if (!hapticsOn()) return;
  await Haptics.impactAsync(style);
}

export async function selectionAsync(): Promise<void> {
  if (!hapticsOn()) return;
  await Haptics.selectionAsync();
}

export async function notificationAsync(
  type: Haptics.NotificationFeedbackType,
): Promise<void> {
  if (!hapticsOn()) return;
  await Haptics.notificationAsync(type);
}
