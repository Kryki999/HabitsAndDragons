/**
 * Six-axis hero stats for the hex radar (front-end + mock until AI pipeline ships).
 * Values are unbounded floats; chart scale is always max(current values).
 */

export type HeroHexStatId =
  | "strength"
  | "agility"
  | "intelligence"
  | "vitality"
  | "spirit"
  | "discipline";

export type HeroHexStats = Record<HeroHexStatId, number>;

/** Mock profile with fractional values (Sprint 6). */
export const MOCK_HERO_HEX_STATS: HeroHexStats = {
  strength: 45.5,
  agility: 12.0,
  intelligence: 88.2,
  vitality: 33.7,
  spirit: 56.25,
  discipline: 19.8,
};

/** Clockwise from top vertex; must stay in sync with radar geometry. */
export const HERO_HEX_STAT_AXIS_ORDER: readonly HeroHexStatId[] = [
  "strength",
  "agility",
  "intelligence",
  "vitality",
  "spirit",
  "discipline",
] as const;

export const HERO_HEX_LABELS: Record<HeroHexStatId, string> = {
  strength: "Strength",
  agility: "Agility",
  intelligence: "Intelligence",
  vitality: "Vitality",
  spirit: "Spirit",
  discipline: "Discipline",
};

/** Outer edge of the grid = this value (largest stat at this moment). */
export function radarDynamicMax(values: HeroHexStats): number {
  const m = Math.max(
    values.strength,
    values.agility,
    values.intelligence,
    values.vitality,
    values.spirit,
    values.discipline,
  );
  return m > 0 ? m : 1;
}

export function formatStatValue(v: number): string {
  if (Number.isInteger(v)) return String(v);
  const t = v.toFixed(1);
  return t.endsWith(".0") ? String(Math.round(v)) : t;
}
