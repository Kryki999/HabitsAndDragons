export interface CastleTier {
  minLevel: number;
  name: string;
  emoji: string;
  desc: string;
}

export const CASTLE_TIERS: CastleTier[] = [
  { minLevel: 1, name: 'Humble Camp', emoji: '🏕️', desc: 'Your journey begins with simple discipline.' },
  { minLevel: 3, name: 'Wooden Watchtower', emoji: '🪵', desc: 'Your first defenses rise.' },
  { minLevel: 5, name: 'Fortified Bastion', emoji: '🏯', desc: 'The walls stand stronger each day.' },
  { minLevel: 8, name: 'Grand Castle', emoji: '⚔️', desc: 'Your kingdom gains true momentum.' },
  { minLevel: 12, name: 'Dragon Fortress', emoji: '🐉', desc: 'Legends are forged in your halls.' },
];

export function getCastleTier(level: number): CastleTier {
  let tier = CASTLE_TIERS[0];
  for (const t of CASTLE_TIERS) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}
