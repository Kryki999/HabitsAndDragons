import type { LootRarity } from "@/types/dungeonLoot";

/** Cena sprzedaży (złoty recykling) — jedna sztuka. */
export const SELL_PRICE_BY_RARITY: Record<LootRarity, number> = {
  common: 15,
  uncommon: 30,
  rare: 60,
  epic: 120,
  legendary: 300,
};

export function sellPriceForRarity(rarity: LootRarity): number {
  return SELL_PRICE_BY_RARITY[rarity];
}
