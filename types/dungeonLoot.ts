export type LootRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Lucide-based keys resolved in UI. */
export type LootIconId =
  | "gem"
  | "crown"
  | "shield"
  | "sparkles"
  | "skull"
  | "flame"
  | "snowflake"
  | "key"
  | "scroll"
  | "star"
  | "coins"
  | "sword"
  | "orb"
  | "anchor"
  | "moon";

/** Slot loadoutu: strój / zbroja vs relikwia / broń / artefakt / akcesoria. */
export type ItemLoadoutSlot = "outfit" | "relic";

export interface LootItemEntry {
  id: string;
  kind: "item";
  name: string;
  rarity: LootRarity;
  description: string;
  icon: LootIconId;
  itemSlot: ItemLoadoutSlot;
}

export interface LootGoldEntry {
  id: string;
  kind: "gold";
  name: string;
  rarity: LootRarity;
  description: string;
  goldMin: number;
  goldMax: number;
}

export type DungeonLootEntry = LootItemEntry | LootGoldEntry;

/** Lower = more common (display / roll weight ordering). */
export const LOOT_RARITY_ORDER: Record<LootRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function sortDungeonLootByRarity(entries: readonly DungeonLootEntry[]): DungeonLootEntry[] {
  return [...entries].sort((a, b) => LOOT_RARITY_ORDER[a.rarity] - LOOT_RARITY_ORDER[b.rarity]);
}
