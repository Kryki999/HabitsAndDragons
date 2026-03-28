import { DUNGEON_CHALLENGES, DRAGON_CONFIGS, GEAR_ITEMS, type DungeonChallengeId, type GearItemId } from '@/constants/gameplayConfig';
import type { GameState, StatType } from '@/types/game';
import { getLevelFromXP } from '@/lib/playerLevel';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bestStat(state: GameState): StatType {
  const pairs: Array<[StatType, number]> = [
    ['strength', state.strengthXP],
    ['agility', state.agilityXP],
    ['intelligence', state.intelligenceXP],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  return pairs[0]![0];
}

function equippedGearIds(state: GameState): GearItemId[] {
  const out: GearItemId[] = [];
  if (state.equippedOutfitId && state.equippedOutfitId in GEAR_ITEMS) out.push(state.equippedOutfitId as GearItemId);
  if (state.equippedRelicId && state.equippedRelicId in GEAR_ITEMS) out.push(state.equippedRelicId as GearItemId);
  return out;
}

export function getActiveDragonBuffs(state: GameState) {
  const id = state.activeDragonId as keyof typeof DRAGON_CONFIGS | null;
  if (!id || !(id in DRAGON_CONFIGS)) {
    return { goldMultiplier: 1, keyDropChanceBonus: 0, bossWinChanceBonus: 0 };
  }
  return DRAGON_CONFIGS[id].buffs;
}

export function computeDungeonWinChance(state: GameState, challengeId: DungeonChallengeId): number {
  const c = DUNGEON_CHALLENGES[challengeId];
  const playerLevel = getLevelFromXP(state.strengthXP + state.agilityXP + state.intelligenceXP);
  const levelDelta = playerLevel - c.bossLevel;
  const levelBonus = levelDelta * 0.02;
  const statBonus = bestStat(state) === c.weaknessStat ? 0.08 : 0;
  const dragonBonus = getActiveDragonBuffs(state).bossWinChanceBonus;
  const synergyBonus = equippedGearIds(state).reduce((acc, id) => {
    const g = GEAR_ITEMS[id];
    return g.synergyBossId === c.bossId ? acc + g.synergyWinChanceBonus : acc;
  }, 0);
  return clamp01(c.baseWinChance + levelBonus + statBonus + dragonBonus + synergyBonus);
}

/** Rozbicie do UI (tooltip) — te same składniki co `computeDungeonWinChance`. */
export function computeDungeonWinChanceBreakdown(
  state: GameState,
  challengeId: DungeonChallengeId,
): { finalPct: number; alertMessage: string } {
  const c = DUNGEON_CHALLENGES[challengeId];
  const playerLevel = getLevelFromXP(state.strengthXP + state.agilityXP + state.intelligenceXP);
  const levelDelta = playerLevel - c.bossLevel;
  const levelBonus = levelDelta * 0.02;
  const statBonus = bestStat(state) === c.weaknessStat ? 0.08 : 0;
  const dragonBonus = getActiveDragonBuffs(state).bossWinChanceBonus;
  const synergyLines: string[] = [];
  let synergyBonus = 0;
  for (const id of equippedGearIds(state)) {
    const g = GEAR_ITEMS[id];
    if (g.synergyBossId === c.bossId) {
      synergyBonus += g.synergyWinChanceBonus;
      synergyLines.push(`  • ${g.name}: +${Math.round(g.synergyWinChanceBonus * 100)}%`);
    }
  }
  const sumBeforeClamp = c.baseWinChance + levelBonus + statBonus + dragonBonus + synergyBonus;
  const final = clamp01(sumBeforeClamp);
  const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;
  const lines = [
    `Base Chance: ${Math.round(c.baseWinChance * 100)}%`,
    `Level Difference (${levelDelta >= 0 ? "+" : ""}${levelDelta}): ${pct(levelBonus)}`,
    `Stat Weakness Match: ${statBonus > 0 ? "+8%" : "+0%"}`,
    `Dragon Buff: ${pct(dragonBonus)}`,
    synergyBonus > 0
      ? `Gear Synergy (total ${pct(synergyBonus)}):\n${synergyLines.join("\n")}`
      : `Gear Synergy: +0%`,
  ];
  if (Math.abs(sumBeforeClamp - final) > 1e-6) {
    lines.push(`Capped total: ${Math.round(sumBeforeClamp * 100)}% → ${Math.round(final * 100)}%`);
  }
  return {
    finalPct: Math.round(final * 100),
    alertMessage: lines.join("\n"),
  };
}

export function rollDungeonBattleResult(state: GameState, challengeId: DungeonChallengeId) {
  const c = DUNGEON_CHALLENGES[challengeId];
  const chance = computeDungeonWinChance(state, challengeId);
  const won = Math.random() < chance;
  if (!won) {
    return {
      won: false as const,
      chance,
      reward: {
        type: 'gold' as const,
        amount: randomInt(c.failureConsolationGoldRange[0], c.failureConsolationGoldRange[1]),
        xp: c.failureConsolationXp,
      },
    };
  }
  const pick = c.lootTable[Math.floor(Math.random() * c.lootTable.length)]!;
  return {
    won: true as const,
    chance,
    reward: {
      type: 'item' as const,
      itemId: pick,
    },
  };
}

