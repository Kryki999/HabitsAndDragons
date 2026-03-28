import type { ImageSourcePropType } from 'react-native';

/** Background milestones — highest threshold ≤ player level wins. */
const BASE_BACKGROUNDS: { minLevel: number; source: ImageSourcePropType }[] = [
  { minLevel: 1, source: require('@/assets/images/camp_lvl1.jpg') },
  { minLevel: 2, source: require('@/assets/images/camp_lvl2.png') },
  { minLevel: 3, source: require('@/assets/images/camp_lvl3.png') },
  { minLevel: 4, source: require('@/assets/images/camp_lvl4.jpg') },
  { minLevel: 5, source: require('@/assets/images/camp_lvl5.png') },
  { minLevel: 10, source: require('@/assets/images/camp_lvl10.jpg') },
  { minLevel: 15, source: require('@/assets/images/camp_lvl15.png') },
  { minLevel: 20, source: require('@/assets/images/camp_lvl20.png') },
  { minLevel: 25, source: require('@/assets/images/camp_lvl25.png') },
  { minLevel: 30, source: require('@/assets/images/camp_lvl30.jpg') },
  { minLevel: 35, source: require('@/assets/images/camp_lvl35.png') },
];

export function getBaseBackgroundForLevel(level: number): ImageSourcePropType {
  let picked = BASE_BACKGROUNDS[0].source;
  for (const row of BASE_BACKGROUNDS) {
    if (level >= row.minLevel) picked = row.source;
  }
  return picked;
}

export function getArmoryBackgroundForLevel(level: number): ImageSourcePropType {
  return level >= 5
    ? require('@/assets/images/armory2.png')
    : require('@/assets/images/armory1.png');
}

/** Stages shown in Kingdom Progression modal (visual unlocks + future tiers). */
export const KINGDOM_PROGRESSION_STAGES: {
  unlockLevel: number;
  previewSource: ImageSourcePropType | null;
}[] = [
  ...BASE_BACKGROUNDS.map((b) => ({ unlockLevel: b.minLevel, previewSource: b.source })),
  { unlockLevel: 40, previewSource: null },
  { unlockLevel: 45, previewSource: null },
  { unlockLevel: 50, previewSource: null },
];
