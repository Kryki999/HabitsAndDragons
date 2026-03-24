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

