import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, StatType, PlayerClass, GameState, GameActions } from '@/types/game';

const XP_PER_COMPLETION = 25;
const GOLD_PER_COMPLETION = 10;
const STREAK_BONUS_GOLD = 50;
const BASE_XP_PER_LEVEL = 100;
const XP_GROWTH_FACTOR = 1.4;

function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpNeeded = BASE_XP_PER_LEVEL;
  let accumulated = 0;
  while (accumulated + xpNeeded <= totalXP) {
    accumulated += xpNeeded;
    level++;
    xpNeeded = Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_GROWTH_FACTOR, level - 1));
  }
  return level;
}

function xpForLevel(level: number): number {
  return Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_GROWTH_FACTOR, level - 1));
}

function xpAccumulatedAtLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_GROWTH_FACTOR, i - 1));
  }
  return total;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gold: 0,
      streak: 0,
      strengthXP: 0,
      agilityXP: 0,
      intelligenceXP: 0,
      habits: [],
      lastCompletionDate: null,
      allCompletedToday: false,
      playerClass: null,

      completeHabit: (habitId: string) => {
        const state = get();
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit || habit.completedToday) return;

        const xpKey = `${habit.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
        const updatedHabits = state.habits.map(h =>
          h.id === habitId ? { ...h, completedToday: true } : h
        );

        const allDone = updatedHabits.every(h => h.completedToday);
        const today = getTodayString();
        const isNewStreakDay = state.lastCompletionDate !== today;

        let newStreak = state.streak;
        let bonusGold = 0;
        if (allDone && isNewStreakDay) {
          newStreak = state.streak + 1;
          bonusGold = STREAK_BONUS_GOLD;
        }

        console.log(`[GameStore] Completing habit: ${habit.name}, +${XP_PER_COMPLETION} ${habit.stat}XP, +${GOLD_PER_COMPLETION + bonusGold} gold`);

        set({
          habits: updatedHabits,
          [xpKey]: state[xpKey] + XP_PER_COMPLETION,
          gold: state.gold + GOLD_PER_COMPLETION + bonusGold,
          streak: newStreak,
          allCompletedToday: allDone,
          lastCompletionDate: allDone ? today : state.lastCompletionDate,
        });
      },

      uncompleteHabit: (habitId: string) => {
        const state = get();
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit || !habit.completedToday) return;

        const updatedHabits = state.habits.map(h =>
          h.id === habitId ? { ...h, completedToday: false } : h
        );

        set({
          habits: updatedHabits,
          allCompletedToday: false,
        });
      },

      addHabit: (habit) => {
        const newHabit: Habit = {
          ...habit,
          id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          completedToday: false,
        };
        console.log(`[GameStore] Adding habit: ${newHabit.name} (${newHabit.stat})`);
        set((state) => ({ habits: [...state.habits, newHabit] }));
      },

      removeHabit: (habitId: string) => {
        console.log(`[GameStore] Removing habit: ${habitId}`);
        set((state) => ({
          habits: state.habits.filter(h => h.id !== habitId),
        }));
      },

      getPlayerLevel: () => {
        const { strengthXP, agilityXP, intelligenceXP } = get();
        return calculateLevel(strengthXP + agilityXP + intelligenceXP);
      },

      getTotalXP: () => {
        const { strengthXP, agilityXP, intelligenceXP } = get();
        return strengthXP + agilityXP + intelligenceXP;
      },

      getXPForNextLevel: () => {
        const level = get().getPlayerLevel();
        return xpForLevel(level);
      },

      getCurrentLevelXP: () => {
        const totalXP = get().getTotalXP();
        const level = get().getPlayerLevel();
        return totalXP - xpAccumulatedAtLevel(level);
      },

      getStatLevel: (stat: StatType) => {
        const state = get();
        const xpKey = `${stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
        return calculateLevel(state[xpKey]);
      },

      setPlayerClass: (playerClass: PlayerClass) => {
        console.log(`[GameStore] Setting player class: ${playerClass}`);
        set({ playerClass });
      },

      addGold: (amount: number) => {
        console.log(`[GameStore] Adding ${amount} gold`);
        set((state) => ({ gold: state.gold + amount }));
      },

      addXP: (stat: StatType, amount: number) => {
        const xpKey = `${stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
        console.log(`[GameStore] Adding ${amount} ${stat}XP`);
        set((state) => ({ [xpKey]: state[xpKey] + amount }));
      },

      resetDailyHabits: () => {
        const today = getTodayString();
        const state = get();

        if (state.lastCompletionDate === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = state.streak;
        if (state.lastCompletionDate !== yesterdayStr && state.lastCompletionDate !== today) {
          newStreak = 0;
        }

        console.log(`[GameStore] Resetting daily habits. Streak: ${newStreak}`);
        set({
          habits: state.habits.map(h => ({ ...h, completedToday: false })),
          allCompletedToday: false,
          streak: newStreak,
        });
      },
    }),
    {
      name: 'habits-dragons-game',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        gold: state.gold,
        streak: state.streak,
        strengthXP: state.strengthXP,
        agilityXP: state.agilityXP,
        intelligenceXP: state.intelligenceXP,
        habits: state.habits,
        lastCompletionDate: state.lastCompletionDate,
        allCompletedToday: state.allCompletedToday,
        playerClass: state.playerClass,
      }),
    }
  )
);
