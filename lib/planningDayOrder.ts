import type { Habit } from "@/types/game";

export function applyPlanningOrderForDate(
  dateKey: string,
  list: Habit[],
  orderMap: Record<string, string[]>,
): Habit[] {
  const order = orderMap[dateKey];
  const map = new Map(list.map((h) => [h.id, h]));
  if (!order?.length) return list;
  const seen = new Set<string>();
  const out: Habit[] = [];
  for (const id of order) {
    const h = map.get(id);
    if (h) {
      out.push(h);
      seen.add(id);
    }
  }
  for (const h of list) {
    if (!seen.has(h.id)) out.push(h);
  }
  return out;
}
