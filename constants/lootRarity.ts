import type { LootRarity } from "@/types/dungeonLoot";

/**
 * Globalna paleta rzadkości (złota zasada UI): ramki slotów przedmiotów w całej aplikacji.
 */
export const LOOT_RARITY_COLOR: Record<LootRarity, string> = {
  common: "#9ca3af",
  uncommon: "#3dd68c",
  rare: "#45d4e8",
  epic: "#9b6dff",
  legendary: "#ffc845",
};

export const LOOT_ITEM_SLOT_BORDER_WIDTH = 2;

export function lootRarityBorder(rarity: LootRarity, alphaHex = "dd"): string {
  return LOOT_RARITY_COLOR[rarity] + alphaHex;
}
