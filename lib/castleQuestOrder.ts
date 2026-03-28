import type { Habit } from '@/types/game';

/** Default: same order as habits appear in the persisted `habits` array. Custom: `orderIds` then any missing due ids. */
export function orderDueHabitsForCastle(
  dueHabits: Habit[],
  allHabits: Habit[],
  mode: 'default' | 'custom',
  orderIds: string[],
): Habit[] {
  if (mode === 'default') {
    const idx = new Map(allHabits.map((h, i) => [h.id, i]));
    return [...dueHabits].sort((a, b) => (idx.get(a.id) ?? 9999) - (idx.get(b.id) ?? 9999));
  }
  const map = new Map(dueHabits.map((h) => [h.id, h]));
  const seen = new Set<string>();
  const out: Habit[] = [];
  for (const id of orderIds) {
    const h = map.get(id);
    if (h) {
      out.push(h);
      seen.add(id);
    }
  }
  for (const h of dueHabits) {
    if (!seen.has(h.id)) out.push(h);
  }
  return out;
}
