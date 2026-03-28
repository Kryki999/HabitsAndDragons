import type { StatType, TaskType, HabitDifficulty } from '@/types/game';
import type { OnboardingUserProfile } from '@/types/onboardingProfile';

/** Payload compatible with `useGameStore.getState().addHabit` (id assigned in store). */
export type StarterHabitDraft = {
  name: string;
  description: string;
  stat: StatType;
  taskType: TaskType;
  icon: string;
  difficulty: HabitDifficulty;
};

type PainTag =
  | 'procrastination'
  | 'bad_diet'
  | 'lack_of_sleep'
  | 'low_energy'
  | 'coffee'
  | 'screen_heavy'
  | 'stress'
  | 'sedentary'
  | 'no_planning'
  | 'focus_body'
  | 'focus_mind'
  | 'focus_work';

type PoolEntry = StarterHabitDraft & { tags: PainTag[] };

const HABIT_POOL: PoolEntry[] = [
  {
    name: 'Drink a glass of water',
    description: 'Rehydrate right after waking — one full glass before anything else.',
    stat: 'strength',
    taskType: 'daily',
    icon: '💧',
    difficulty: 'easy',
    tags: ['bad_diet', 'low_energy', 'coffee', 'focus_body'],
  },
  {
    name: 'Two-minute first step',
    description: 'Do the smallest possible start on one thing you avoid — timer for 2 minutes only.',
    stat: 'agility',
    taskType: 'daily',
    icon: '⏱️',
    difficulty: 'easy',
    tags: ['procrastination', 'stress', 'focus_work'],
  },
  {
    name: 'Phone-free first block',
    description: 'First 30 minutes after waking without scrolling — stretch, water, or daylight instead.',
    stat: 'intelligence',
    taskType: 'daily',
    icon: '📵',
    difficulty: 'medium',
    tags: ['screen_heavy', 'procrastination', 'focus_mind'],
  },
  {
    name: 'Walk for ten minutes',
    description: 'Leave the door — ten minutes of walking counts as a full win.',
    stat: 'agility',
    taskType: 'daily',
    icon: '🚶',
    difficulty: 'easy',
    tags: ['sedentary', 'low_energy', 'coffee', 'focus_body'],
  },
  {
    name: 'Same bedtime alarm',
    description: 'Set one non-negotiable wind-down alarm 45 minutes before sleep.',
    stat: 'strength',
    taskType: 'daily',
    icon: '🌙',
    difficulty: 'easy',
    tags: ['lack_of_sleep', 'stress', 'focus_mind'],
  },
  {
    name: 'One-color meal',
    description: 'Add one full serving of vegetables or fruit to any meal today.',
    stat: 'strength',
    taskType: 'daily',
    icon: '🥗',
    difficulty: 'easy',
    tags: ['bad_diet', 'focus_body'],
  },
  {
    name: 'Single-task quarter',
    description: 'Twenty-five minutes on one task — notifications off, one tab or one paper.',
    stat: 'intelligence',
    taskType: 'daily',
    icon: '🎯',
    difficulty: 'medium',
    tags: ['procrastination', 'screen_heavy', 'focus_work'],
  },
  {
    name: 'Three-breath reset',
    description: 'When tension spikes, pause for three slow breaths before you answer.',
    stat: 'intelligence',
    taskType: 'daily',
    icon: '🫁',
    difficulty: 'easy',
    tags: ['stress', 'focus_mind'],
  },
  {
    name: 'Tomorrow’s top three',
    description: 'Write exactly three outcomes for tomorrow — no more, no less.',
    stat: 'intelligence',
    taskType: 'daily',
    icon: '📝',
    difficulty: 'easy',
    tags: ['no_planning', 'procrastination', 'focus_work'],
  },
  {
    name: 'Desk reset five',
    description: 'Five minutes clearing your primary workspace — surface, chair, cables.',
    stat: 'agility',
    taskType: 'daily',
    icon: '🧹',
    difficulty: 'easy',
    tags: ['stress', 'focus_work', 'sedentary'],
  },
  {
    name: 'Protein-forward breakfast',
    description: 'Start the day with a deliberate protein choice — eggs, yogurt, or equivalent.',
    stat: 'strength',
    taskType: 'daily',
    icon: '🍳',
    difficulty: 'medium',
    tags: ['bad_diet', 'coffee', 'low_energy'],
  },
  {
    name: 'Stairs or stretch',
    description: 'Either one flight of stairs or a five-minute mobility flow.',
    stat: 'agility',
    taskType: 'daily',
    icon: '🪜',
    difficulty: 'easy',
    tags: ['sedentary', 'low_energy', 'focus_body'],
  },
];

function profilePainTags(p: OnboardingUserProfile): PainTag[] {
  const tags: PainTag[] = [];

  switch (p.weakness) {
    case 'procrastination':
      tags.push('procrastination');
      break;
    case 'bad_diet':
      tags.push('bad_diet');
      break;
    case 'lack_of_sleep':
      tags.push('lack_of_sleep');
      break;
    default:
      break;
  }

  if (p.deepProfile) {
    switch (p.deepProfile.energy) {
      case 'low_energy':
        tags.push('low_energy');
        break;
      case 'coffee_dependent':
        tags.push('coffee');
        break;
      default:
        break;
    }
    switch (p.deepProfile.screen) {
      case 'average_screen':
      case 'doomscroll':
        tags.push('screen_heavy');
        break;
      default:
        break;
    }
    switch (p.deepProfile.stress) {
      case 'anxious':
      case 'overwhelmed':
        tags.push('stress');
        break;
      default:
        break;
    }
    if (p.deepProfile.physicality === 'sedentary') {
      tags.push('sedentary');
    }
    if (p.deepProfile.planning === 'no_planning') {
      tags.push('no_planning');
    }
  }

  switch (p.sageFocus) {
    case 'body':
      tags.push('focus_body');
      break;
    case 'mind':
      tags.push('focus_mind');
      break;
    case 'work':
      tags.push('focus_work');
      break;
    default:
      break;
  }

  return tags;
}

function scoreEntry(entry: PoolEntry, painTags: PainTag[]): number {
  let score = 0;
  for (const t of entry.tags) {
    if (painTags.includes(t)) score += 1;
  }
  return score;
}

function classBonus(stat: StatType, cls: OnboardingUserProfile['playerClass']): number {
  if (cls === 'warrior' && stat === 'strength') return 0.35;
  if (cls === 'hunter' && stat === 'agility') return 0.35;
  if (cls === 'mage' && stat === 'intelligence') return 0.35;
  if (cls === 'paladin') return 0.1;
  return 0;
}

function pickThree(pool: PoolEntry[], painTags: PainTag[], cls: OnboardingUserProfile['playerClass']): StarterHabitDraft[] {
  const scored = pool.map((entry) => ({
    entry,
    score: scoreEntry(entry, painTags) + classBonus(entry.stat, cls),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.name.localeCompare(b.entry.name);
  });

  const out: StarterHabitDraft[] = [];
  const usedNames = new Set<string>();

  for (const { entry } of scored) {
    if (out.length >= 3) break;
    if (usedNames.has(entry.name)) continue;
    usedNames.add(entry.name);
    const { tags: _t, ...draft } = entry;
    out.push(draft);
  }

  let scan = 0;
  while (out.length < 3 && scan < pool.length * 2) {
    const e = pool[scan % pool.length];
    scan += 1;
    if (usedNames.has(e.name)) continue;
    usedNames.add(e.name);
    const { tags: _t, ...draft } = e;
    out.push(draft);
  }

  return out;
}

export const OnboardingService = {
  /**
   * Cold start: three starter habits from a rule-based pool keyed to onboarding answers.
   */
  generateStarterHabits(userProfile: OnboardingUserProfile): StarterHabitDraft[] {
    const painTags = profilePainTags(userProfile);
    return pickThree(HABIT_POOL, painTags, userProfile.playerClass);
  },
};
