/**
 * Global level curve (sum of XP across STR+AGI+INT): power law tuned so that
 * ~1750 XP reaches level 10, ~90000 XP reaches level 100.
 */
const LEVEL_POWER = Math.log(90000 / 1750) / Math.log(11);
const LEVEL_K = 1750 / Math.pow(9, LEVEL_POWER);

export const PLAYER_MAX_LEVEL = 100;

/** Minimum total XP required to display the given level (level 1 starts at 0). */
export function minTotalXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_K * Math.pow(level - 1, LEVEL_POWER);
}

/** Overall or per-stat level from XP in that pool. */
export function getLevelFromXP(totalXP: number): number {
  if (totalXP < 0) return 1;
  let low = 1;
  let high = PLAYER_MAX_LEVEL;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (minTotalXPForLevel(mid) <= totalXP) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** XP progress within the current level toward the next (same curve for global and per-stat). */
export function getXPProgressInCurrentLevel(totalXP: number): {
  current: number;
  needed: number;
  level: number;
} {
  const level = getLevelFromXP(totalXP);
  if (level >= PLAYER_MAX_LEVEL) {
    return { current: 0, needed: 0, level: PLAYER_MAX_LEVEL };
  }
  const floor = minTotalXPForLevel(level);
  const next = minTotalXPForLevel(level + 1);
  return {
    current: totalXP - floor,
    needed: next - floor,
    level,
  };
}
