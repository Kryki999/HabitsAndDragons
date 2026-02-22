export type StatType = 'strength' | 'agility' | 'intelligence';

export type TimeOfDay = 'morning' | 'day' | 'evening';

export type PlayerClass = 'warrior' | 'hunter' | 'mage';

export interface Habit {
  id: string;
  name: string;
  description: string;
  stat: StatType;
  timeOfDay: TimeOfDay;
  completedToday: boolean;
  icon: string;
}

export interface GameState {
  gold: number;
  streak: number;
  strengthXP: number;
  agilityXP: number;
  intelligenceXP: number;
  habits: Habit[];
  lastCompletionDate: string | null;
  allCompletedToday: boolean;
  playerClass: PlayerClass | null;
}

export interface GameActions {
  completeHabit: (habitId: string) => void;
  uncompleteHabit: (habitId: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'completedToday'>) => void;
  removeHabit: (habitId: string) => void;
  getPlayerLevel: () => number;
  getTotalXP: () => number;
  getXPForNextLevel: () => number;
  getCurrentLevelXP: () => number;
  getStatLevel: (stat: StatType) => number;
  resetDailyHabits: () => void;
  setPlayerClass: (playerClass: PlayerClass) => void;
  addGold: (amount: number) => void;
  addXP: (stat: StatType, amount: number) => void;
}

export interface SuggestedHabit {
  name: string;
  description: string;
  rpgDescription: string;
  stat: StatType;
  timeOfDay: TimeOfDay;
  icon: string;
}