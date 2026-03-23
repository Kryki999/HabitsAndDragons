import type { StatType } from '@/types/game';

export interface EpicQuestDefinition {
  id: string;
  text: string;
  emoji: string;
  stat: StatType;
  lore: string;
}

export const EPIC_QUEST_DEFINITIONS: EpicQuestDefinition[] = [
  { id: 'eq_cold_shower', text: 'Take a 3-minute Cold Shower', emoji: '🧊', stat: 'strength', lore: 'Zimna woda poprawia czujność układu nerwowego i uczy panowania nad impulsem unikania dyskomfortu.' },
  { id: 'eq_write_fiction', text: 'Write 500 words of creative fiction', emoji: '✍️', stat: 'intelligence', lore: 'Krótka sesja twórcza wzmacnia płynność myślenia i pomaga mózgowi budować nowe skojarzenia.' },
  { id: 'eq_jumping_jacks', text: 'Do 50 jumping jacks right now', emoji: '🦘', stat: 'agility', lore: 'Dynamiczny ruch podnosi tętno i szybko aktywuje energię bez długiej rozgrzewki.' },
  { id: 'eq_meditate', text: 'Meditate in silence for 5 minutes', emoji: '🧘', stat: 'intelligence', lore: 'Nawet 5 minut ciszy obniża poziom napięcia i poprawia zdolność koncentracji.' },
  { id: 'eq_sprint', text: 'Sprint for 30 seconds at full speed', emoji: '⚡', stat: 'agility', lore: 'Krótkie sprinty rozwijają szybkość i uczą generować maksimum mocy w małym oknie czasu.' },
  { id: 'eq_plank', text: 'Hold a plank for 90 seconds', emoji: '💪', stat: 'strength', lore: 'Plank wzmacnia stabilizację tułowia, która przekłada się na lepszą postawę przez cały dzień.' },
  { id: 'eq_read', text: 'Read 20 pages of a book in one sitting', emoji: '📖', stat: 'intelligence', lore: 'Dłuższe czytanie bez przerw ćwiczy uwagę głęboką i pamięć roboczą.' },
  { id: 'eq_burpees', text: 'Do 30 burpees without stopping', emoji: '🔥', stat: 'strength', lore: 'Burpees łączą siłę i kondycję, dlatego są jednym z najlepszych testów determinacji.' },
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
