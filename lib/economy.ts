import type { HabitDifficulty } from '@/types/game';

export const DIFFICULTY_BASE_REWARDS: Record<HabitDifficulty, { xp: number; gold: number }> = {
  easy: { xp: 15, gold: 5 },
  medium: { xp: 25, gold: 10 },
  hard: { xp: 40, gold: 20 },
};

export const GOLD_CAP_STANDARD_TASKS_DAILY = 100;
export const GOLD_EPIC_QUEST_SAGE = 50;
export const GOLD_MORNING_STREAK = 20;
export const DAILY_GOLD_THEORETICAL_MAX =
  GOLD_CAP_STANDARD_TASKS_DAILY + GOLD_EPIC_QUEST_SAGE + GOLD_MORNING_STREAK;

export const KEY_FIRST_DROP_RATE = 0.05;
export const KEY_SUBSEQUENT_DROP_RATE = 0.01;

/** Gold sink: buy one dungeon key in the D&D tab. */
export const DUNGEON_KEY_GOLD_PRICE = 150;

/** Task index for the day after this completion (1-based). */
export function fatigueMultiplierForTaskIndex(taskIndexAfterComplete: number): number {
  if (taskIndexAfterComplete <= 19) return 1;
  if (taskIndexAfterComplete <= 30) return 0.5;
  return 0.1;
}

export function rollDungeonKeyDrop(alreadyFoundKeyToday: boolean): boolean {
  const p = alreadyFoundKeyToday ? KEY_SUBSEQUENT_DROP_RATE : KEY_FIRST_DROP_RATE;
  return Math.random() < p;
}
