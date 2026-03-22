import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, StatType, PlayerClass, GameState, GameActions, HabitDifficulty } from '@/types/game';
import { getLevelFromXP, getXPProgressInCurrentLevel } from '@/lib/playerLevel';
import {
  DIFFICULTY_BASE_REWARDS,
  DUNGEON_KEY_GOLD_PRICE,
  GOLD_CAP_STANDARD_TASKS_DAILY,
  GOLD_EPIC_QUEST_SAGE,
  GOLD_MORNING_STREAK,
  fatigueMultiplierForTaskIndex,
  rollDungeonKeyDrop,
} from '@/lib/economy';
import { TITLE_DEFINITIONS } from '@/constants/titles';

type GameStore = GameState & GameActions;

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y.toISOString().split('T')[0];
}

/** When calendar day changes, reset daily economy counters. */
function getEconomyPatchIfNewDay(state: GameState): Partial<GameState> | null {
  const today = getTodayString();
  if (state.lastEconomyResetDate === today) return null;
  return {
    tasksCompletedToday: 0,
    goldFromStandardTasksToday: 0,
    firstDungeonKeyDroppedToday: false,
    sageEpicQuestClaimedToday: false,
    habitCompletionLog: {},
    lastEconomyResetDate: today,
  };
}

function collectNewTitles(
  unlockedIds: string[],
  strengthXP: number,
  agilityXP: number,
  intelligenceXP: number,
): string[] {
  const have = new Set(unlockedIds);
  const out: string[] = [];
  const xpByStat: Record<StatType, number> = {
    strength: strengthXP,
    agility: agilityXP,
    intelligence: intelligenceXP,
  };
  for (const def of TITLE_DEFINITIONS) {
    if (have.has(def.id)) continue;
    if (getLevelFromXP(xpByStat[def.stat]) >= def.requiredStatLevel) {
      out.push(def.id);
    }
  }
  return out;
}

function resolveDifficulty(habit: Habit): HabitDifficulty {
  return habit.difficulty ?? 'medium';
}

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
      dungeonKeys: 0,
      tasksCompletedToday: 0,
      goldFromStandardTasksToday: 0,
      lastEconomyResetDate: null,
      firstDungeonKeyDroppedToday: false,
      sageEpicQuestClaimedToday: false,
      lastMorningGoldClaimDate: null,
      unlockedTitleIds: [],
      habitCompletionLog: {},
      ownedItemIds: [],

      completeHabit: (habitId: string) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          const habit = base.habits.find(h => h.id === habitId);
          if (!habit || habit.completedToday) return base;

          const rewards = DIFFICULTY_BASE_REWARDS[resolveDifficulty(habit)];
          const newTaskIndex = base.tasksCompletedToday + 1;
          const fatigueMul = fatigueMultiplierForTaskIndex(newTaskIndex);
          const xpGranted = Math.floor(rewards.xp * fatigueMul);

          const capLeft = Math.max(0, GOLD_CAP_STANDARD_TASKS_DAILY - base.goldFromStandardTasksToday);
          const goldGranted = Math.min(rewards.gold, capLeft);

          let keyDropped = false;
          if (rollDungeonKeyDrop(base.firstDungeonKeyDroppedToday)) {
            keyDropped = true;
          }

          const xpKey = `${habit.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
          const newStatXp = base[xpKey] + xpGranted;

          const strengthXP = habit.stat === 'strength' ? newStatXp : base.strengthXP;
          const agilityXP = habit.stat === 'agility' ? newStatXp : base.agilityXP;
          const intelligenceXP = habit.stat === 'intelligence' ? newStatXp : base.intelligenceXP;

          const updatedHabits = base.habits.map(h =>
            h.id === habitId ? { ...h, completedToday: true } : h
          );
          const allDone = updatedHabits.every(h => h.completedToday);
          const today = getTodayString();
          const isNewStreakDay = base.lastCompletionDate !== today;

          let newStreak = base.streak;
          if (allDone && isNewStreakDay) {
            newStreak = base.streak + 1;
          }

          const newTitles = collectNewTitles(base.unlockedTitleIds, strengthXP, agilityXP, intelligenceXP);

          console.log(
            `[GameStore] complete ${habit.name} [${resolveDifficulty(habit)}] task#${newTaskIndex} fatigue=${fatigueMul} +${xpGranted} ${habit.stat}XP +${goldGranted}g key=${keyDropped}`,
          );

          return {
            ...base,
            habits: updatedHabits,
            [xpKey]: newStatXp,
            gold: base.gold + goldGranted,
            streak: newStreak,
            allCompletedToday: allDone,
            lastCompletionDate: allDone ? today : base.lastCompletionDate,
            tasksCompletedToday: newTaskIndex,
            goldFromStandardTasksToday: base.goldFromStandardTasksToday + goldGranted,
            firstDungeonKeyDroppedToday: base.firstDungeonKeyDroppedToday || keyDropped,
            dungeonKeys: keyDropped ? base.dungeonKeys + 1 : base.dungeonKeys,
            habitCompletionLog: {
              ...base.habitCompletionLog,
              [habitId]: { taskDayIndex: newTaskIndex, xpGranted, goldGranted, keyDropped },
            },
            unlockedTitleIds: [...base.unlockedTitleIds, ...newTitles],
          };
        });
      },

      uncompleteHabit: (habitId: string) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          const habit = base.habits.find(h => h.id === habitId);
          if (!habit || !habit.completedToday) return base;

          const ledger = base.habitCompletionLog[habitId];
          const updatedHabits = base.habits.map(h =>
            h.id === habitId ? { ...h, completedToday: false } : h
          );

          const nextLog = { ...base.habitCompletionLog };
          delete nextLog[habitId];

          if (!ledger) {
            return {
              ...base,
              habits: updatedHabits,
              allCompletedToday: false,
              habitCompletionLog: nextLog,
            };
          }

          const xpKey = `${habit.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
          const firstDungeonKeyDroppedToday = Object.values(nextLog).some(l => l.keyDropped);

          return {
            ...base,
            habits: updatedHabits,
            allCompletedToday: false,
            [xpKey]: base[xpKey] - ledger.xpGranted,
            gold: base.gold - ledger.goldGranted,
            dungeonKeys: ledger.keyDropped ? Math.max(0, base.dungeonKeys - 1) : base.dungeonKeys,
            tasksCompletedToday: Math.max(0, base.tasksCompletedToday - 1),
            goldFromStandardTasksToday: Math.max(0, base.goldFromStandardTasksToday - ledger.goldGranted),
            firstDungeonKeyDroppedToday,
            habitCompletionLog: nextLog,
          };
        });
      },

      addHabit: (habit) => {
        const newHabit: Habit = {
          ...habit,
          difficulty: habit.difficulty ?? 'medium',
          id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          completedToday: false,
        };
        console.log(`[GameStore] Adding habit: ${newHabit.name} (${newHabit.stat}, ${newHabit.difficulty})`);
        set((s) => ({ habits: [...s.habits, newHabit] }));
      },

      removeHabit: (habitId: string) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          const habit = base.habits.find(h => h.id === habitId);
          if (!habit) return base;

          if (habit.completedToday && base.habitCompletionLog[habitId]) {
            const ledger = base.habitCompletionLog[habitId];
            const xpKey = `${habit.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
            const nextLog = { ...base.habitCompletionLog };
            delete nextLog[habitId];
            const firstDungeonKeyDroppedToday = Object.values(nextLog).some(l => l.keyDropped);
            return {
              ...base,
              habits: base.habits.filter(h => h.id !== habitId),
              allCompletedToday: false,
              [xpKey]: base[xpKey] - ledger.xpGranted,
              gold: base.gold - ledger.goldGranted,
              dungeonKeys: ledger.keyDropped ? Math.max(0, base.dungeonKeys - 1) : base.dungeonKeys,
              tasksCompletedToday: Math.max(0, base.tasksCompletedToday - 1),
              goldFromStandardTasksToday: Math.max(0, base.goldFromStandardTasksToday - ledger.goldGranted),
              firstDungeonKeyDroppedToday,
              habitCompletionLog: nextLog,
            };
          }

          const nextLog = { ...base.habitCompletionLog };
          delete nextLog[habitId];
          return {
            ...base,
            habits: base.habits.filter(h => h.id !== habitId),
            habitCompletionLog: nextLog,
          };
        });
      },

      getPlayerLevel: () => {
        const { strengthXP, agilityXP, intelligenceXP } = get();
        return getLevelFromXP(strengthXP + agilityXP + intelligenceXP);
      },

      getTotalXP: () => {
        const { strengthXP, agilityXP, intelligenceXP } = get();
        return strengthXP + agilityXP + intelligenceXP;
      },

      getXPForNextLevel: () => {
        const total = get().getTotalXP();
        const { needed } = getXPProgressInCurrentLevel(total);
        return needed;
      },

      getCurrentLevelXP: () => {
        const total = get().getTotalXP();
        const { current } = getXPProgressInCurrentLevel(total);
        return current;
      },

      getStatLevel: (stat: StatType) => {
        const xpKey = `${stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
        return getLevelFromXP(get()[xpKey]);
      },

      setPlayerClass: (playerClass: PlayerClass) => {
        console.log(`[GameStore] Setting player class: ${playerClass}`);
        set({ playerClass });
      },

      addGold: (amount: number) => {
        console.log(`[GameStore] Adding ${amount} gold (unrestricted)`);
        set((s) => ({ gold: s.gold + amount }));
      },

      addXP: (stat: StatType, amount: number) => {
        const xpKey = `${stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
        set((state) => {
          const newXp = state[xpKey] + amount;
          const strengthXP = stat === 'strength' ? newXp : state.strengthXP;
          const agilityXP = stat === 'agility' ? newXp : state.agilityXP;
          const intelligenceXP = stat === 'intelligence' ? newXp : state.intelligenceXP;
          const newTitles = collectNewTitles(state.unlockedTitleIds, strengthXP, agilityXP, intelligenceXP);
          return {
            [xpKey]: newXp,
            unlockedTitleIds: [...state.unlockedTitleIds, ...newTitles],
          };
        });
      },

      purchaseDungeonKeyWithGold: () => {
        const state = get();
        if (state.gold < DUNGEON_KEY_GOLD_PRICE) return false;
        set({
          gold: state.gold - DUNGEON_KEY_GOLD_PRICE,
          dungeonKeys: state.dungeonKeys + 1,
        });
        console.log(`[GameStore] Bought dungeon key for ${DUNGEON_KEY_GOLD_PRICE} gold`);
        return true;
      },

      consumeDungeonKeyForRun: () => {
        const state = get();
        if (state.dungeonKeys <= 0) return false;
        set({ dungeonKeys: state.dungeonKeys - 1 });
        console.log('[GameStore] Consumed 1 dungeon key (dungeon run)');
        return true;
      },

      addInventoryItemId: (itemId: string) => {
        set((state) => {
          const ownedItemIds = state.ownedItemIds ?? [];
          if (ownedItemIds.includes(itemId)) return state;
          console.log(`[GameStore] Inventory +1: ${itemId}`);
          return { ownedItemIds: [...ownedItemIds, itemId] };
        });
      },

      addDungeonChestGold: (amount: number) => {
        if (amount <= 0) return;
        console.log(`[GameStore] Dungeon chest gold +${amount} (no daily habit cap)`);
        set((s) => ({ gold: s.gold + amount }));
      },

      claimSageEpicQuestReward: (stat: StatType, xpBonus = 20) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          if (base.sageEpicQuestClaimedToday) return base;
          const xpKey = `${stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
          const newXp = base[xpKey] + xpBonus;
          const strengthXP = stat === 'strength' ? newXp : base.strengthXP;
          const agilityXP = stat === 'agility' ? newXp : base.agilityXP;
          const intelligenceXP = stat === 'intelligence' ? newXp : base.intelligenceXP;
          const newTitles = collectNewTitles(base.unlockedTitleIds, strengthXP, agilityXP, intelligenceXP);
          console.log(`[GameStore] Sage Epic Quest +${GOLD_EPIC_QUEST_SAGE} gold (extra pool), +${xpBonus} ${stat} XP`);
          return {
            ...base,
            gold: base.gold + GOLD_EPIC_QUEST_SAGE,
            sageEpicQuestClaimedToday: true,
            [xpKey]: newXp,
            unlockedTitleIds: [...base.unlockedTitleIds, ...newTitles],
          };
        });
      },

      processDailyLogin: () => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          let next = { ...state, ...econ };
          const today = getTodayString();
          const yesterdayStr = getYesterdayString();

          if (next.lastMorningGoldClaimDate !== today && next.lastCompletionDate === yesterdayStr) {
            next = {
              ...next,
              gold: next.gold + GOLD_MORNING_STREAK,
              lastMorningGoldClaimDate: today,
            };
            console.log(`[GameStore] Morning streak bonus +${GOLD_MORNING_STREAK} gold`);
          }
          return next;
        });
      },

      resetDailyHabits: () => {
        const today = getTodayString();
        const state = get();

        if (state.lastCompletionDate === today) return;

        const yesterdayStr = getYesterdayString();

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
        dungeonKeys: state.dungeonKeys,
        tasksCompletedToday: state.tasksCompletedToday,
        goldFromStandardTasksToday: state.goldFromStandardTasksToday,
        lastEconomyResetDate: state.lastEconomyResetDate,
        firstDungeonKeyDroppedToday: state.firstDungeonKeyDroppedToday,
        sageEpicQuestClaimedToday: state.sageEpicQuestClaimedToday,
        lastMorningGoldClaimDate: state.lastMorningGoldClaimDate,
        unlockedTitleIds: state.unlockedTitleIds,
        habitCompletionLog: state.habitCompletionLog,
        ownedItemIds: state.ownedItemIds,
      }),
    },
  ),
);
