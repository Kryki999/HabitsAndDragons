import type { StatType } from '@/types/game';

export interface EpicQuestDefinition {
  id: string;
  text: string;
  emoji: string;
  stat: StatType;
}

export const EPIC_QUEST_DEFINITIONS: EpicQuestDefinition[] = [
  { id: 'eq_cold_shower', text: 'Take a 3-minute Cold Shower', emoji: '🧊', stat: 'strength' },
  { id: 'eq_write_fiction', text: 'Write 500 words of creative fiction', emoji: '✍️', stat: 'intelligence' },
  { id: 'eq_jumping_jacks', text: 'Do 50 jumping jacks right now', emoji: '🦘', stat: 'agility' },
  { id: 'eq_meditate', text: 'Meditate in silence for 5 minutes', emoji: '🧘', stat: 'intelligence' },
  { id: 'eq_sprint', text: 'Sprint for 30 seconds at full speed', emoji: '⚡', stat: 'agility' },
  { id: 'eq_plank', text: 'Hold a plank for 90 seconds', emoji: '💪', stat: 'strength' },
  { id: 'eq_read', text: 'Read 20 pages of a book in one sitting', emoji: '📖', stat: 'intelligence' },
  { id: 'eq_burpees', text: 'Do 30 burpees without stopping', emoji: '🔥', stat: 'strength' },
];

export function getEpicQuestById(id: string | null | undefined): EpicQuestDefinition | undefined {
  if (!id) return undefined;
  return EPIC_QUEST_DEFINITIONS.find((q) => q.id === id);
}

export function pickRandomEpicQuestId(): string {
  const i = Math.floor(Math.random() * EPIC_QUEST_DEFINITIONS.length);
  return EPIC_QUEST_DEFINITIONS[i]!.id;
}

/** Three distinct quests for reroll pick — excludes current quest so choices feel fresh. */
export function pickThreeDistinctEpicQuestIds(currentQuestId: string | null): string[] {
  const pool = EPIC_QUEST_DEFINITIONS.filter((q) => q.id !== currentQuestId).map((q) => q.id);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  if (shuffled.length >= 3) return shuffled.slice(0, 3);
  return [...EPIC_QUEST_DEFINITIONS].sort(() => Math.random() - 0.5).slice(0, 3).map((q) => q.id);
}
