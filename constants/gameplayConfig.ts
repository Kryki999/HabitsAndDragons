import type { ImageSourcePropType } from 'react-native';
import type { StatType } from '@/types/game';
import type { LootIconId, LootRarity } from '@/types/dungeonLoot';

export type DragonId = 'ember_whelp' | 'glacial_drake' | 'sylvan_dreadnought';

export type GearItemId =
  | 'brigand_coin_purse' | 'thief_bandana' | 'rusted_dagger' | 'stolen_signet' | 'brigand_cloak'
  | 'forest_treasure' | 'basilisk_scale' | 'serpent_guard' | 'toxic_eye' | 'emerald_pendant'
  | 'grave_robber_stash' | 'grave_robes' | 'rusted_broadsword' | 'knight_helm' | 'shield_damned' | 'shadow_ring' | 'twilight_blade'
  | 'frozen_coins' | 'ice_shard' | 'frost_crystal' | 'northern_armor' | 'glacial_shield' | 'frost_staff' | 'crown_winter'
  | 'sunken_treasure' | 'river_tunic' | 'magic_shell' | 'goblin_tooth' | 'current_cloak' | 'rusted_trident' | 'turtle_shield' | 'ocean_drop' | 'tide_crown'
  | 'orcish_rags' | 'bone_necklace' | 'shaman_staff' | 'ritual_mask' | 'void_crystal' | 'voidwalker_mantle' | 'staff_ancients'
  | 'bark_armor' | 'branch_club' | 'runic_leaf' | 'rooted_boots' | 'forest_aegis' | 'heart_forest' | 'ancient_runeclub'
  | 'desert_wraps' | 'scarab_ring' | 'sandstorm_cloak' | 'golden_crook' | 'pharaoh_flail' | 'eye_of_horus' | 'sungod_crown' | 'hieroglyph_tome'
  | 'apprentice_robes' | 'dreamcatcher' | 'cloud_ring' | 'astral_mantle' | 'staff_nightmares' | 'devourer_hood' | 'rainbow_orb' | 'tome_illusions' | 'scepter_cosmos';

export type DungeonChallengeId =
  | 'cursed_brigand'
  | 'venomous_basilisk'
  | 'rusted_revenant'
  | 'frostbound_golem'
  | 'tidecaller_goblin'
  | 'zygfryda_shaman'
  | 'runewood_ent'
  | 'osiris_lord'
  | 'ananiel_devourer';

export interface DragonConfig {
  id: DragonId;
  name: string;
  subtitle: string;
  accentColor: string;
  imageAsset: ImageSourcePropType;
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

/**
 * Spritesheet on dungeon card.
 * `fullCard`: no static `bossImageAsset` underlay — sheet fills the card (test / full-frame art).
 */
export type BossSpriteSheetConfig = {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  frameCount: number;
  fps?: number;
  fullCard?: boolean;
};

export interface DungeonChallengeConfig {
  id: DungeonChallengeId;
  dungeonName: string;
  bossId: string;
  bossName: string;
  accentColor: string;
  bossImageAsset: ImageSourcePropType;
  bossSpriteSheet?: BossSpriteSheetConfig;
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
  ember_whelp: {
    id: 'ember_whelp',
    name: 'Ember Whelp',
    subtitle: 'The First Spark',
    accentColor: '#ff6b35',
    imageAsset: require('@/assets/images/dragon_ember_whelp.png'),
    unlockStreak: 10,
    buffs: { goldMultiplier: 1.05, keyDropChanceBonus: 0.01, bossWinChanceBonus: 0.03 },
  },
  glacial_drake: {
    id: 'glacial_drake',
    name: 'Glacial Drake',
    subtitle: 'Sentinel of the Frost',
    accentColor: '#45d4e8',
    imageAsset: require('@/assets/images/dragon_glacial_drake.png'),
    unlockStreak: 25,
    buffs: { goldMultiplier: 1.10, keyDropChanceBonus: 0.02, bossWinChanceBonus: 0.06 },
  },
  sylvan_dreadnought: {
    id: 'sylvan_dreadnought',
    name: 'Sylvan Dreadnought',
    subtitle: 'Guardian of the Grove',
    accentColor: '#2ecc71',
    imageAsset: require('@/assets/images/dragon_sylvan_dreadnought.png'),
    unlockStreak: 40,
    buffs: { goldMultiplier: 1.15, keyDropChanceBonus: 0.03, bossWinChanceBonus: 0.10 },
  },
};

export const GEAR_ITEMS: Record<GearItemId, GearItemConfig> = {
  // --- Boss 1: Cursed Brigand ---
  brigand_coin_purse: { id: 'brigand_coin_purse', name: 'Stolen Coin Purse', description: 'Heavy. Can be sold for good gold.', icon: 'coins', rarity: 'common', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  thief_bandana: { id: 'thief_bandana', name: 'Thief\'s Bandana', description: 'Smells like cheap ale and regret.', icon: 'star', rarity: 'common', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  rusted_dagger: { id: 'rusted_dagger', name: 'Rusted Dagger', description: 'Barely sharp enough to cut bread.', icon: 'sword', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  stolen_signet: { id: 'stolen_signet', name: 'Stolen Signet', description: 'Belonged to a minor noble.', icon: 'gem', rarity: 'rare', itemSlot: 'relic', synergyBossId: 'venomous_basilisk', synergyWinChanceBonus: 0.05 },
  brigand_cloak: { id: 'brigand_cloak', name: 'Brigand\'s Cloak', description: 'Good for hiding in the shadows.', icon: 'shield', rarity: 'epic', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 2: Venomous Basilisk ---
  forest_treasure: { id: 'forest_treasure', name: 'Nest Hoard', description: 'Bones and coins mixed together. Sell it.', icon: 'coins', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  basilisk_scale: { id: 'basilisk_scale', name: 'Shed Scale', description: 'Hard as rock.', icon: 'shield', rarity: 'common', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  serpent_guard: { id: 'serpent_guard', name: 'Serpent Guard', description: 'Tough, green leather armor.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: 'rusted_revenant', synergyWinChanceBonus: 0.08 },
  toxic_eye: { id: 'toxic_eye', name: 'Toxic Eye', description: 'It seems to follow your movements.', icon: 'orb', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  emerald_pendant: { id: 'emerald_pendant', name: 'Emerald Pendant', description: 'Glows with a sickening green light.', icon: 'gem', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 3: Rusted Revenant ---
  grave_robber_stash: { id: 'grave_robber_stash', name: 'Grave Pouch', description: 'Buried with the dead. Worth some gold.', icon: 'coins', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  grave_robes: { id: 'grave_robes', name: 'Grave Robes', description: 'Dusty and full of moth holes.', icon: 'star', rarity: 'common', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  rusted_broadsword: { id: 'rusted_broadsword', name: 'Rusted Broadsword', description: 'Heavy, slow, but hits hard.', icon: 'sword', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: 'frostbound_golem', synergyWinChanceBonus: 0.10 },
  knight_helm: { id: 'knight_helm', name: 'Fallen Knight Helm', description: 'Offers decent protection.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  shield_damned: { id: 'shield_damned', name: 'Shield of the Damned', description: 'Has a screaming skull etched into it.', icon: 'skull', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  shadow_ring: { id: 'shadow_ring', name: 'Shadow Ring', description: 'Cold to the touch.', icon: 'gem', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  twilight_blade: { id: 'twilight_blade', name: 'Twilight Blade', description: 'A sword forged in pure darkness.', icon: 'sword', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 4: Frostbound Golem ---
  frozen_coins: { id: 'frozen_coins', name: 'Frozen Coins', description: 'Melt them to sell them.', icon: 'coins', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  ice_shard: { id: 'ice_shard', name: 'Ice Shard', description: 'A piece of the golem.', icon: 'snowflake', rarity: 'common', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  frost_crystal: { id: 'frost_crystal', name: 'Frost Crystal', description: 'Never melts.', icon: 'gem', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: 'tidecaller_goblin', synergyWinChanceBonus: 0.12 },
  northern_armor: { id: 'northern_armor', name: 'Northern Armor', description: 'Thick furs and ice plates.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  glacial_shield: { id: 'glacial_shield', name: 'Glacial Shield', description: 'Can freeze attackers on impact.', icon: 'shield', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  frost_staff: { id: 'frost_staff', name: 'Frost Staff', description: 'Channels winter storms.', icon: 'sword', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  crown_winter: { id: 'crown_winter', name: 'Crown of Winter', description: 'Worn by the forgotten Ice King.', icon: 'crown', rarity: 'legendary', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 5: Tidecaller Goblin ---
  sunken_treasure: { id: 'sunken_treasure', name: 'Sunken Treasure', description: 'Dripping wet gold.', icon: 'coins', rarity: 'rare', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  river_tunic: { id: 'river_tunic', name: 'River Tunic', description: 'Constantly wet.', icon: 'star', rarity: 'common', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  magic_shell: { id: 'magic_shell', name: 'Magic Shell', description: 'You can hear the ocean.', icon: 'orb', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  goblin_tooth: { id: 'goblin_tooth', name: 'Golden Goblin Tooth', description: 'A strange trophy.', icon: 'gem', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  current_cloak: { id: 'current_cloak', name: 'Current Cloak', description: 'Helps you swim faster.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: 'zygfryda_shaman', synergyWinChanceBonus: 0.10 },
  rusted_trident: { id: 'rusted_trident', name: 'Rusted Trident', description: 'A weapon of the deep.', icon: 'anchor', rarity: 'rare', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  turtle_shield: { id: 'turtle_shield', name: 'Turtle Shell', description: 'Incredibly durable.', icon: 'shield', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  ocean_drop: { id: 'ocean_drop', name: 'Ocean\'s Drop', description: 'A perfect sphere of blue water.', icon: 'orb', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  tide_crown: { id: 'tide_crown', name: 'Crown of the Tides', description: 'Controls the flow of rivers.', icon: 'crown', rarity: 'legendary', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 6: Zygfryda, Void Shaman ---
  orcish_rags: { id: 'orcish_rags', name: 'Orcish Rags', description: 'Smells terrible.', icon: 'star', rarity: 'common', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  bone_necklace: { id: 'bone_necklace', name: 'Bone Necklace', description: 'Rattles when you walk.', icon: 'skull', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  shaman_staff: { id: 'shaman_staff', name: 'Shaman\'s Staff', description: 'Used for dark rituals.', icon: 'sword', rarity: 'rare', itemSlot: 'relic', synergyBossId: 'runewood_ent', synergyWinChanceBonus: 0.12 },
  ritual_mask: { id: 'ritual_mask', name: 'Ritual Mask', description: 'Hides your face in shadows.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  void_crystal: { id: 'void_crystal', name: 'Void Crystal', description: 'Pulsates with purple energy.', icon: 'gem', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  voidwalker_mantle: { id: 'voidwalker_mantle', name: 'Voidwalker Mantle', description: 'Absorbs surrounding light.', icon: 'moon', rarity: 'epic', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  staff_ancients: { id: 'staff_ancients', name: 'Staff of Ancients', description: 'A masterpiece of dark magic.', icon: 'sparkles', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 7: Ancient Runewood Ent ---
  bark_armor: { id: 'bark_armor', name: 'Bark Armor', description: 'Stiff, but protective.', icon: 'shield', rarity: 'uncommon', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  branch_club: { id: 'branch_club', name: 'Branch Club', description: 'A heavy piece of wood.', icon: 'sword', rarity: 'uncommon', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  runic_leaf: { id: 'runic_leaf', name: 'Runic Leaf', description: 'Contains druidic secrets.', icon: 'scroll', rarity: 'rare', itemSlot: 'relic', synergyBossId: 'osiris_lord', synergyWinChanceBonus: 0.15 },
  rooted_boots: { id: 'rooted_boots', name: 'Rooted Boots', description: 'You stand your ground easily.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  forest_aegis: { id: 'forest_aegis', name: 'Forest Aegis', description: 'A shield made of living vines.', icon: 'shield', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  heart_forest: { id: 'heart_forest', name: 'Heart of the Forest', description: 'The core of the Ancient Ent.', icon: 'orb', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  ancient_runeclub: { id: 'ancient_runeclub', name: 'Ancient Runeclub', description: 'Glows with immense nature magic.', icon: 'sparkles', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 8: Osiris, Hieroglyph Lord ---
  desert_wraps: { id: 'desert_wraps', name: 'Desert Wraps', description: 'Keeps the sand out.', icon: 'star', rarity: 'uncommon', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  scarab_ring: { id: 'scarab_ring', name: 'Scarab Ring', description: 'A symbol of the old kingdom.', icon: 'gem', rarity: 'rare', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  sandstorm_cloak: { id: 'sandstorm_cloak', name: 'Sandstorm Cloak', description: 'Flows like desert wind.', icon: 'shield', rarity: 'rare', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  golden_crook: { id: 'golden_crook', name: 'Golden Crook', description: 'A tool of pharaohs.', icon: 'key', rarity: 'epic', itemSlot: 'relic', synergyBossId: 'ananiel_devourer', synergyWinChanceBonus: 0.18 },
  pharaoh_flail: { id: 'pharaoh_flail', name: 'Pharaoh\'s Flail', description: 'A weapon of pharaohs.', icon: 'sword', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  eye_of_horus: { id: 'eye_of_horus', name: 'Eye of Horus', description: 'Sees through all illusions.', icon: 'orb', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  sungod_crown: { id: 'sungod_crown', name: 'Sun God\'s Crown', description: 'Radiates brilliant light.', icon: 'crown', rarity: 'legendary', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  hieroglyph_tome: { id: 'hieroglyph_tome', name: 'Hieroglyph Tome', description: 'Contains forbidden sand magic.', icon: 'scroll', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },

  // --- Boss 9: Ananiel, Dream Devourer ---
  apprentice_robes: { id: 'apprentice_robes', name: 'Apprentice Robes', description: 'Infused with star magic.', icon: 'star', rarity: 'rare', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  dreamcatcher: { id: 'dreamcatcher', name: 'Dreamcatcher', description: 'Traps bad omens.', icon: 'shield', rarity: 'rare', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  cloud_ring: { id: 'cloud_ring', name: 'Cloud Ring', description: 'Light as air.', icon: 'gem', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  astral_mantle: { id: 'astral_mantle', name: 'Astral Mantle', description: 'Woven from the night sky.', icon: 'moon', rarity: 'epic', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  staff_nightmares: { id: 'staff_nightmares', name: 'Staff of Nightmares', description: 'Feeds on fear.', icon: 'sword', rarity: 'epic', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  devourer_hood: { id: 'devourer_hood', name: 'Devourer\'s Hood', description: 'Hides your face in a galaxy.', icon: 'crown', rarity: 'legendary', itemSlot: 'outfit', synergyBossId: null, synergyWinChanceBonus: 0 },
  rainbow_orb: { id: 'rainbow_orb', name: 'Rainbow Orb', description: 'Contains stolen dreams.', icon: 'orb', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  tome_illusions: { id: 'tome_illusions', name: 'Tome of Illusions', description: 'Bends reality itself.', icon: 'scroll', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
  scepter_cosmos: { id: 'scepter_cosmos', name: 'Scepter of the Cosmos', description: 'Channels the void between stars.', icon: 'sparkles', rarity: 'legendary', itemSlot: 'relic', synergyBossId: null, synergyWinChanceBonus: 0 },
};

export const DUNGEON_CHALLENGES: Record<DungeonChallengeId, DungeonChallengeConfig> = {
  cursed_brigand: {
    id: 'cursed_brigand',
    dungeonName: "Brigand's Haunt",
    bossId: 'cursed_brigand',
    bossName: 'Cursed Brigand',
    accentColor: '#c45c3e',
    bossImageAsset: require('@/assets/images/boss_cursed_brigand.png'),
    requiredPlayerLevel: 1,
    bossLevel: 3,
    baseWinChance: 0.42,
    weaknessStat: 'agility',
    lootTable: ['brigand_coin_purse', 'thief_bandana', 'rusted_dagger', 'stolen_signet', 'brigand_cloak'],
    failureConsolationGoldRange: [8, 22],
    failureConsolationXp: 12,
  },
  venomous_basilisk: {
    id: 'venomous_basilisk',
    dungeonName: 'Basilisk Den',
    bossId: 'venomous_basilisk',
    bossName: 'Venomous Basilisk',
    accentColor: '#2ecc71',
    bossImageAsset: require('@/assets/images/boss_venomous_basilisk.png'),
    requiredPlayerLevel: 5,
    bossLevel: 6,
    baseWinChance: 0.4,
    weaknessStat: 'intelligence',
    lootTable: ['forest_treasure', 'basilisk_scale', 'serpent_guard', 'toxic_eye', 'emerald_pendant'],
    failureConsolationGoldRange: [12, 28],
    failureConsolationXp: 16,
  },
  rusted_revenant: {
    id: 'rusted_revenant',
    dungeonName: 'Mournfield Crypt',
    bossId: 'rusted_revenant',
    bossName: 'Rusted Revenant',
    accentColor: '#8b7bb8',
    bossImageAsset: require('@/assets/images/boss_rusted_revenant.png'),
    requiredPlayerLevel: 8,
    bossLevel: 9,
    baseWinChance: 0.38,
    weaknessStat: 'strength',
    lootTable: ['grave_robber_stash', 'grave_robes', 'rusted_broadsword', 'knight_helm', 'shield_damned', 'shadow_ring', 'twilight_blade'],
    failureConsolationGoldRange: [14, 32],
    failureConsolationXp: 18,
  },
  frostbound_golem: {
    id: 'frostbound_golem',
    dungeonName: 'Frostbound Depths',
    bossId: 'frostbound_golem',
    bossName: 'Frostbound Golem',
    accentColor: '#45d4e8',
    bossImageAsset: require('@/assets/images/boss_frostbound_golem.png'),
    requiredPlayerLevel: 12,
    bossLevel: 12,
    baseWinChance: 0.36,
    weaknessStat: 'strength',
    lootTable: ['frozen_coins', 'ice_shard', 'frost_crystal', 'northern_armor', 'glacial_shield', 'frost_staff', 'crown_winter'],
    failureConsolationGoldRange: [16, 38],
    failureConsolationXp: 22,
  },
  tidecaller_goblin: {
    id: 'tidecaller_goblin',
    dungeonName: 'Sunken Gutters',
    bossId: 'tidecaller_goblin',
    bossName: 'Tidecaller Goblin',
    accentColor: '#3498db',
    bossImageAsset: require('@/assets/images/boss_tidecaller_goblin.png'),
    bossSpriteSheet: {
      source: require('@/assets/images/boss_tidecaller_goblin-spritesheet.png'),
      columns: 5,
      rows: 5,
      frameCount: 25,
      fps: 14,
      fullCard: true,
    },
    requiredPlayerLevel: 15,
    bossLevel: 14,
    baseWinChance: 0.35,
    weaknessStat: 'agility',
    lootTable: ['sunken_treasure', 'river_tunic', 'magic_shell', 'goblin_tooth', 'current_cloak', 'rusted_trident', 'turtle_shield', 'ocean_drop', 'tide_crown'],
    failureConsolationGoldRange: [18, 42],
    failureConsolationXp: 24,
  },
  zygfryda_shaman: {
    id: 'zygfryda_shaman',
    dungeonName: 'Void Ritual Grounds',
    bossId: 'zygfryda_shaman',
    bossName: 'Zygfryda, Void Shaman',
    accentColor: '#9b59b6',
    bossImageAsset: require('@/assets/images/boss_zygfryda.png'),
    requiredPlayerLevel: 18,
    bossLevel: 16,
    baseWinChance: 0.34,
    weaknessStat: 'intelligence',
    lootTable: ['orcish_rags', 'bone_necklace', 'shaman_staff', 'ritual_mask', 'void_crystal', 'voidwalker_mantle', 'staff_ancients'],
    failureConsolationGoldRange: [20, 46],
    failureConsolationXp: 26,
  },
  runewood_ent: {
    id: 'runewood_ent',
    dungeonName: 'Runewood Heart',
    bossId: 'runewood_ent',
    bossName: 'Ancient Runewood Ent',
    accentColor: '#27ae60',
    bossImageAsset: require('@/assets/images/boss_runewood_ent.png'),
    requiredPlayerLevel: 22,
    bossLevel: 18,
    baseWinChance: 0.33,
    weaknessStat: 'strength',
    lootTable: ['bark_armor', 'branch_club', 'runic_leaf', 'rooted_boots', 'forest_aegis', 'heart_forest', 'ancient_runeclub'],
    failureConsolationGoldRange: [22, 50],
    failureConsolationXp: 28,
  },
  osiris_lord: {
    id: 'osiris_lord',
    dungeonName: 'Sandsea Tomb',
    bossId: 'osiris_lord',
    bossName: 'Osiris, Hieroglyph Lord',
    accentColor: '#f1c40f',
    bossImageAsset: require('@/assets/images/boss_osiris.png'),
    requiredPlayerLevel: 26,
    bossLevel: 22,
    baseWinChance: 0.32,
    weaknessStat: 'intelligence',
    lootTable: ['desert_wraps', 'scarab_ring', 'sandstorm_cloak', 'golden_crook', 'pharaoh_flail', 'eye_of_horus', 'sungod_crown', 'hieroglyph_tome'],
    failureConsolationGoldRange: [24, 54],
    failureConsolationXp: 30,
  },
  ananiel_devourer: {
    id: 'ananiel_devourer',
    dungeonName: 'Dream Devourer Spire',
    bossId: 'ananiel_devourer',
    bossName: 'Ananiel, Dream Devourer',
    accentColor: '#e8daef',
    bossImageAsset: require('@/assets/images/boss_ananiel.png'),
    requiredPlayerLevel: 30,
    bossLevel: 26,
    baseWinChance: 0.3,
    weaknessStat: 'agility',
    lootTable: ['apprentice_robes', 'dreamcatcher', 'cloud_ring', 'astral_mantle', 'staff_nightmares', 'devourer_hood', 'rainbow_orb', 'tome_illusions', 'scepter_cosmos'],
    failureConsolationGoldRange: [26, 60],
    failureConsolationXp: 32,
  },
};