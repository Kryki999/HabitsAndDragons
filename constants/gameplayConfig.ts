import type { StatType } from '@/types/game';
import type { LootIconId, LootRarity } from '@/types/dungeonLoot';

export type DragonId = 'red' | 'ice' | 'golden';
export type GearItemId =
  | 'frost_crown'
  | 'golem_breaker'
  | 'vault_royal_ring'
  | 'ember_banner'
  | 'tidal_relic';
export type DungeonChallengeId =
  | 'frozen_catacombs_ice_golem'
  | 'ruby_vault_crimson_wyrm'
  | 'sunken_sanctum_abyss_guardian'
  | 'shadow_citadel_dread_knight';

export interface DragonConfig {
  id: DragonId;
  name: string;
  imageAsset?: unknown;
  lockedImageAsset?: unknown;
  unlockStreak: number;
  buffs: {
    goldMultiplier: number;
    keyDropChanceBonus: number;
    bossWinChanceBonus: number;
  };
}

export interface GearItemConfig {
  id: GearItemId;
  name: string;
  description: string;
  imageAsset?: unknown;
  icon: LootIconId;
  rarity: LootRarity;
  itemSlot: 'outfit' | 'relic';
  synergyBossId: string | null;
  synergyWinChanceBonus: number;
}

export interface DungeonChallengeConfig {
  id: DungeonChallengeId;
  dungeonName: string;
  bossId: string;
  bossName: string;
  bossImageAsset?: unknown;
  requiredPlayerLevel: number;
  bossLevel: number;
  baseWinChance: number;
  weaknessStat: StatType;
  lootTable: GearItemId[];
  failureConsolationGoldRange: [number, number];
  failureConsolationXp: number;
}

export const ELIXIR_OF_TIME_GOLD_COST = 350;
export const DRAGON_SWITCH_COOLDOWN_HOURS = 24;
export const BATTLE_SIMULATION_MS = 3000;

export const DRAGON_CONFIGS: Record<DragonId, DragonConfig> = {
  red: {
    id: 'red',
    name: 'Red Dragon',
    unlockStreak: 10,
    buffs: { goldMultiplier: 1.08, keyDropChanceBonus: 0.01, bossWinChanceBonus: 0.04 },
  },
  ice: {
    id: 'ice',
    name: 'Ice Wyvern',
    unlockStreak: 20,
    buffs: { goldMultiplier: 1.04, keyDropChanceBonus: 0.015, bossWinChanceBonus: 0.06 },
  },
  golden: {
    id: 'golden',
    name: 'Golden Dragon',
    unlockStreak: 30,
    buffs: { goldMultiplier: 1.15, keyDropChanceBonus: 0.02, bossWinChanceBonus: 0.08 },
  },
};

export const GEAR_ITEMS: Record<GearItemId, GearItemConfig> = {
  frost_crown: {
    id: 'frost_crown',
    name: 'Permafrost Crown',
    description: 'A cold regalia forged from ancient ice shards.',
    icon: 'crown',
    rarity: 'epic',
    itemSlot: 'outfit',
    synergyBossId: 'ice_golem',
    synergyWinChanceBonus: 0.14,
  },
  golem_breaker: {
    id: 'golem_breaker',
    name: 'Golem Breaker',
    description: 'Runic relic calibrated to shatter giant cores.',
    icon: 'sword',
    rarity: 'rare',
    itemSlot: 'relic',
    synergyBossId: 'ice_golem',
    synergyWinChanceBonus: 0.1,
  },
  vault_royal_ring: {
    id: 'vault_royal_ring',
    name: 'Royal Seal Ring',
    description: 'A kingly signet that commands fear in treasure halls.',
    icon: 'gem',
    rarity: 'legendary',
    itemSlot: 'relic',
    synergyBossId: 'crimson_wyrm',
    synergyWinChanceBonus: 0.16,
  },
  ember_banner: {
    id: 'ember_banner',
    name: 'Ember Banner',
    description: 'War banner that emboldens heroes against shadow knights.',
    icon: 'shield',
    rarity: 'rare',
    itemSlot: 'outfit',
    synergyBossId: 'dread_knight',
    synergyWinChanceBonus: 0.11,
  },
  tidal_relic: {
    id: 'tidal_relic',
    name: 'Tidal Relic',
    description: 'A relic resonating with abyssal tides.',
    icon: 'anchor',
    rarity: 'epic',
    itemSlot: 'relic',
    synergyBossId: 'abyss_guardian',
    synergyWinChanceBonus: 0.12,
  },
};

export const DUNGEON_CHALLENGES: Record<DungeonChallengeId, DungeonChallengeConfig> = {
  frozen_catacombs_ice_golem: {
    id: 'frozen_catacombs_ice_golem',
    dungeonName: 'Frozen Catacombs',
    bossId: 'ice_golem',
    bossName: 'Ice Golem',
    requiredPlayerLevel: 3,
    bossLevel: 4,
    baseWinChance: 0.45,
    weaknessStat: 'strength',
    lootTable: ['frost_crown', 'golem_breaker'],
    failureConsolationGoldRange: [8, 20],
    failureConsolationXp: 6,
  },
  ruby_vault_crimson_wyrm: {
    id: 'ruby_vault_crimson_wyrm',
    dungeonName: 'Ruby Vault',
    bossId: 'crimson_wyrm',
    bossName: 'Crimson Wyrm',
    requiredPlayerLevel: 6,
    bossLevel: 7,
    baseWinChance: 0.4,
    weaknessStat: 'agility',
    lootTable: ['vault_royal_ring'],
    failureConsolationGoldRange: [12, 24],
    failureConsolationXp: 8,
  },
  sunken_sanctum_abyss_guardian: {
    id: 'sunken_sanctum_abyss_guardian',
    dungeonName: 'Sunken Sanctum',
    bossId: 'abyss_guardian',
    bossName: 'Abyss Guardian',
    requiredPlayerLevel: 8,
    bossLevel: 9,
    baseWinChance: 0.38,
    weaknessStat: 'intelligence',
    lootTable: ['tidal_relic'],
    failureConsolationGoldRange: [14, 28],
    failureConsolationXp: 10,
  },
  shadow_citadel_dread_knight: {
    id: 'shadow_citadel_dread_knight',
    dungeonName: 'Shadow Citadel',
    bossId: 'dread_knight',
    bossName: 'Dread Knight',
    requiredPlayerLevel: 10,
    bossLevel: 12,
    baseWinChance: 0.35,
    weaknessStat: 'strength',
    lootTable: ['ember_banner'],
    failureConsolationGoldRange: [20, 36],
    failureConsolationXp: 12,
  },
};

