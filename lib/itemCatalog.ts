import { DUNGEONS } from "@/constants/dungeons";
import type { LootItemEntry } from "@/types/dungeonLoot";

let cache: Map<string, LootItemEntry> | null = null;

function buildItemByIdMap(): Map<string, LootItemEntry> {
  const m = new Map<string, LootItemEntry>();
  for (const dungeon of DUNGEONS) {
    for (const entry of dungeon.lootTable) {
      if (entry.kind === "item") {
        m.set(entry.id, entry);
      }
    }
  }
  return m;
}

/** Pełne dane przedmiotu po ID (wszystkie lochy). */
export function resolveLootItemById(itemId: string): LootItemEntry | null {
  if (!cache) {
    cache = buildItemByIdMap();
  }
  return cache.get(itemId) ?? null;
}

/** Reset (np. testy / hot reload). */
export function clearItemCatalogCache(): void {
  cache = null;
}
