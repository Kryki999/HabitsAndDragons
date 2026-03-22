import type { StatType } from '@/types/game';

export interface TitleDefinition {
  id: string;
  name: string;
  description: string;
  stat: StatType;
  requiredStatLevel: number;
}

/** Unlocks when the given stat reaches the milestone level (per-stat level uses the same curve as global). */
export const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: 'str_10', name: 'Squire of Iron', description: 'Reached Strength level 10.', stat: 'strength', requiredStatLevel: 10 },
  { id: 'str_25', name: 'Knight of the Anvil', description: 'Reached Strength level 25.', stat: 'strength', requiredStatLevel: 25 },
  { id: 'str_50', name: 'Champion of Ruin', description: 'Reached Strength level 50.', stat: 'strength', requiredStatLevel: 50 },
  { id: 'str_100', name: 'Titan Unbound', description: 'Reached Strength level 100.', stat: 'strength', requiredStatLevel: 100 },
  { id: 'agi_10', name: 'Windwalker Initiate', description: 'Reached Agility level 10.', stat: 'agility', requiredStatLevel: 10 },
  { id: 'agi_25', name: 'Shadowstride', description: 'Reached Agility level 25.', stat: 'agility', requiredStatLevel: 25 },
  { id: 'agi_50', name: 'Tempest Runner', description: 'Reached Agility level 50.', stat: 'agility', requiredStatLevel: 50 },
  { id: 'agi_100', name: 'Mirage Sovereign', description: 'Reached Agility level 100.', stat: 'agility', requiredStatLevel: 100 },
  { id: 'int_10', name: 'Lore Novice', description: 'Reached Intelligence level 10.', stat: 'intelligence', requiredStatLevel: 10 },
  { id: 'int_25', name: 'Arcane Scholar', description: 'Reached Intelligence level 25.', stat: 'intelligence', requiredStatLevel: 25 },
  { id: 'int_50', name: 'Archmage Ascendant', description: 'Reached Intelligence level 50.', stat: 'intelligence', requiredStatLevel: 50 },
  { id: 'int_100', name: 'Oracle of Ages', description: 'Reached Intelligence level 100.', stat: 'intelligence', requiredStatLevel: 100 },
];
