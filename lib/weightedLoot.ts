import type { DungeonLootEntry, LootGoldEntry, LootRarity } from "@/types/dungeonLoot";

/** Domyślne szanse rzadkości (suma = 1). Brakujące kategorie w lochu są pomijane, reszta normalizowana. */
export const DEFAULT_LOOT_RARITY_WEIGHT: Record<LootRarity, number> = {
  common: 0.5,
  uncommon: 0.3,
  rare: 0.14,
  epic: 0.05,
  legendary: 0.01,
};

const RARITY_ROLL_ORDER: LootRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function rollGoldAmount(entry: LootGoldEntry): number {
  const lo = Math.min(entry.goldMin, entry.goldMax);
  const hi = Math.max(entry.goldMin, entry.goldMax);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**
 * Losuje jeden wpis z tabeli lochu: najpierw rzadkość (wagi + normalizacja po dostępnych bucketach),
 * potem równy los w obrębie tej rzadkości.
 */
export function rollWeightedDungeonEntry(table: readonly DungeonLootEntry[]): DungeonLootEntry {
  if (table.length === 0) {
    throw new Error("weightedLoot: empty loot table");
  }
  if (table.length === 1) {
    return table[0];
  }

  const buckets = new Map<LootRarity, DungeonLootEntry[]>();
  for (const r of RARITY_ROLL_ORDER) {
    buckets.set(r, []);
  }
  for (const e of table) {
    const list = buckets.get(e.rarity);
    if (list) list.push(e);
  }

  const present = RARITY_ROLL_ORDER.filter((r) => (buckets.get(r)?.length ?? 0) > 0);
  let totalW = 0;
  for (const r of present) {
    totalW += DEFAULT_LOOT_RARITY_WEIGHT[r];
  }

  let u = Math.random() * totalW;
  for (const r of present) {
    const w = DEFAULT_LOOT_RARITY_WEIGHT[r];
    if (u < w) {
      return pickRandom(buckets.get(r)!);
    }
    u -= w;
  }

  return pickRandom(buckets.get(present[present.length - 1])!);
}
