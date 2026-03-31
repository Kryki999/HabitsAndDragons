import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Habit,
  StatType,
  PlayerClass,
  GameState,
  GameActions,
  HabitDifficulty,
  SageChatMessage,
  type HeroGender,
  type OnboardingWeakness,
  type OnboardingCommitment,
  type OnboardingDeepProfile,
  type SageLifeFocus,
} from '@/types/game';
import { getLevelFromXP, getXPProgressInCurrentLevel } from '@/lib/playerLevel';
import {
  DIFFICULTY_BASE_REWARDS,
  DUNGEON_KEY_GOLD_PRICE,
  GOLD_CAP_STANDARD_TASKS_DAILY,
  GOLD_EPIC_QUEST_SAGE,
  GOLD_MORNING_STREAK,
  GOLD_SAGE_EPIC_REROLL,
  fatigueMultiplierForTaskIndex,
  rollDungeonKeyDrop,
} from '@/lib/economy';
import { pickRandomEpicQuestId, pickThreeDistinctEpicQuestIds } from '@/constants/epicQuests';
import { TITLE_DEFINITIONS } from '@/constants/titles';
import { resolveLootItemById } from '@/lib/itemCatalog';
import { sellPriceForRarity } from '@/lib/inventoryEconomy';
import {
  BATTLE_SIMULATION_MS,
  DRAGON_CONFIGS,
  DRAGON_SWITCH_COOLDOWN_HOURS,
  ELIXIR_OF_TIME_GOLD_COST,
  type DragonId,
  type DungeonChallengeId,
} from '@/constants/gameplayConfig';
import { getActiveDragonBuffs, rollDungeonBattleResult } from '@/lib/gameEngine';

type GameStore = GameState & GameActions;

const SAGE_CHAT_WELCOME: SageChatMessage = {
  id: 'welcome',
  role: 'sage',
  text:
    'Witaj, wędrowcze. Gwiazdy szepczą o twojej drodze — napisz, czego szukasz w kręgu nawyków, a wskażę igłę w mgle.',
  createdAt: '',
};

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
    // completedHabitNamesByDate is a PERMANENT history — never reset on day change
    lastEconomyResetDate: today,
    sageEpicQuestDate: today,
    sageEpicQuestId: pickRandomEpicQuestId(),
    sageEpicRerollsUsedToday: 0,
    sageEpicRerollPendingIds: null,
  };
}

function collectNewTitles(
  unlockedIds: string[],
  strengthXP: number,
  agilityXP: number,
  intelligenceXP: number,
  completedStrengthQuests: number,
  completedAgilityQuests: number,
  completedIntelligenceQuests: number,
): string[] {
  const have = new Set(unlockedIds);
  const out: string[] = [];
  const xpByStat: Record<StatType, number> = {
    strength: strengthXP,
    agility: agilityXP,
    intelligence: intelligenceXP,
  };
  const completedByStat: Record<StatType, number> = {
    strength: completedStrengthQuests,
    agility: completedAgilityQuests,
    intelligence: completedIntelligenceQuests,
  };
  for (const def of TITLE_DEFINITIONS) {
    if (have.has(def.id)) continue;
    const meetsLevel = def.requiredStatLevel ? getLevelFromXP(xpByStat[def.stat]) >= def.requiredStatLevel : true;
    const meetsCompleted = def.requiredCompletedQuests ? completedByStat[def.stat] >= def.requiredCompletedQuests : true;
    if (meetsLevel && meetsCompleted) {
      out.push(def.id);
    }
  }
  return out;
}

function resolveDifficulty(habit: Habit): HabitDifficulty {
  return habit.difficulty ?? 'medium';
}

function ensureHabitDefaults(habit: Habit): Habit {
  const taskType = habit.taskType ?? 'daily';
  return {
    ...habit,
    taskType,
    scheduledDate: habit.scheduledDate ?? null,
    isActive: habit.isActive ?? true,
    currentStreak: taskType === 'daily' ? (habit.currentStreak ?? 0) : undefined,
    longestStreak: taskType === 'daily' ? (habit.longestStreak ?? 0) : undefined,
    totalCompletions: taskType === 'daily' ? (habit.totalCompletions ?? 0) : undefined,
    completionDates: taskType === 'daily' ? (habit.completionDates ?? []) : undefined,
    isFrozen: habit.isFrozen ?? false,
    frozenAtDate: habit.frozenAtDate ?? null,
  };
}

function patchActivityForDay(
  activityByDate: GameState['activityByDate'],
  date: string,
  deltaCompletions: number,
  deltaXp: number,
): GameState['activityByDate'] {
  const prev = activityByDate[date] ?? { completions: 0, xpFromHabits: 0 };
  const completions = Math.max(0, prev.completions + deltaCompletions);
  const xpFromHabits = Math.max(0, prev.xpFromHabits + deltaXp);
  if (completions === 0 && xpFromHabits === 0) {
    const next = { ...activityByDate };
    delete next[date];
    return next;
  }
  return { ...activityByDate, [date]: { completions, xpFromHabits } };
}

function appendCompletedHabitNameForDay(
  logByDate: Record<string, string[]>,
  date: string,
  habitName: string,
): Record<string, string[]> {
  const prev = logByDate[date] ?? [];
  return { ...logByDate, [date]: [...prev, habitName] };
}

function removeCompletedHabitNameForDay(
  logByDate: Record<string, string[]>,
  date: string,
  habitName: string,
): Record<string, string[]> {
  const prev = logByDate[date] ?? [];
  if (prev.length === 0) return logByDate;
  const idx = prev.lastIndexOf(habitName);
  if (idx < 0) return logByDate;
  const nextDay = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
  if (nextDay.length === 0) {
    const next = { ...logByDate };
    delete next[date];
    return next;
  }
  return { ...logByDate, [date]: nextDay };
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
      heroDisplayName: null,
      heroGender: null,
      onboardingWeakness: null,
      onboardingCommitment: null,
      onboardingEnergyBaseline: null,
      onboardingScreenDistraction: null,
      onboardingStressResponse: null,
      onboardingPhysicality: null,
      onboardingPlanningStyle: null,
      onboardingComplete: false,
      dungeonKeys: 0,
      tasksCompletedToday: 0,
      goldFromStandardTasksToday: 0,
      lastEconomyResetDate: null,
      firstDungeonKeyDroppedToday: false,
      sageEpicQuestClaimedToday: false,
      sageEpicQuestId: null,
      sageEpicQuestDate: null,
      sageEpicRerollsUsedToday: 0,
      sageEpicRerollPendingIds: null,
      lastMorningGoldClaimDate: null,
      unlockedTitleIds: [],
      habitCompletionLog: {},
      completedStrengthQuests: 0,
      completedAgilityQuests: 0,
      completedIntelligenceQuests: 0,
      completedHabitNamesByDate: {},
      ownedItemIds: [],
      equippedOutfitId: null,
      equippedRelicId: null,
      activeDragonId: null,
      dragonSwitchCooldownUntil: null,
      consumables: { elixirOfTime: 0 },
      activityByDate: {},
      hapticsEnabled: true,
      sageFocus: 'body',
      sageChatMessages: [SAGE_CHAT_WELCOME],
      planningDayOrderByDate: {},
      castleQuestSortMode: 'default',
      castleQuestOrderIds: [],
      appLoginStreak: 1,
      lastAppOpenDate: null,
      lastDailyWelcomeDate: null,
      lastAcknowledgedPlayerLevel: 1,
      reflectionSavedDateKeys: {},
      heroShopPurchaseEver: false,
      heroDailyQuestClaimsDate: null,
      heroDailyQuestClaimedIds: [],
      heroEpicMilestoneClaimedIds: [],
      forceDailyFlowPending: false,

      recordHeroReflectionSaved: (dateKey: string) => {
        if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
        set((s) => ({
          reflectionSavedDateKeys: { ...s.reflectionSavedDateKeys, [dateKey]: true },
        }));
      },

      claimHeroDailyQuest: (questId, goldReward, xpReward) => {
        const today = getTodayString();
        let claimed = false;
        set((state) => {
          const priorIds = state.heroDailyQuestClaimsDate === today ? state.heroDailyQuestClaimedIds : [];
          if (priorIds.includes(questId)) return state;
          claimed = true;
          let gold = state.gold + goldReward;
          let strengthXP = state.strengthXP;
          let agilityXP = state.agilityXP;
          let intelligenceXP = state.intelligenceXP;
          if (xpReward) {
            const xpKey = `${xpReward.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
            const newXp = state[xpKey] + xpReward.amount;
            strengthXP = xpReward.stat === 'strength' ? newXp : state.strengthXP;
            agilityXP = xpReward.stat === 'agility' ? newXp : state.agilityXP;
            intelligenceXP = xpReward.stat === 'intelligence' ? newXp : state.intelligenceXP;
          }
          const newTitles = collectNewTitles(
            state.unlockedTitleIds,
            strengthXP,
            agilityXP,
            intelligenceXP,
            state.completedStrengthQuests,
            state.completedAgilityQuests,
            state.completedIntelligenceQuests,
          );
          return {
            ...state,
            gold,
            strengthXP,
            agilityXP,
            intelligenceXP,
            unlockedTitleIds: [...state.unlockedTitleIds, ...newTitles],
            heroDailyQuestClaimsDate: today,
            heroDailyQuestClaimedIds: [...priorIds, questId],
          };
        });
        return claimed;
      },

      claimHeroEpicMilestone: (questId, goldReward, xpReward) => {
        let claimed = false;
        set((state) => {
          if (state.heroEpicMilestoneClaimedIds.includes(questId)) return state;
          claimed = true;
          let gold = state.gold + goldReward;
          let strengthXP = state.strengthXP;
          let agilityXP = state.agilityXP;
          let intelligenceXP = state.intelligenceXP;
          if (xpReward) {
            const xpKey = `${xpReward.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
            const newXp = state[xpKey] + xpReward.amount;
            strengthXP = xpReward.stat === 'strength' ? newXp : state.strengthXP;
            agilityXP = xpReward.stat === 'agility' ? newXp : state.agilityXP;
            intelligenceXP = xpReward.stat === 'intelligence' ? newXp : state.intelligenceXP;
          }
          const newTitles = collectNewTitles(
            state.unlockedTitleIds,
            strengthXP,
            agilityXP,
            intelligenceXP,
            state.completedStrengthQuests,
            state.completedAgilityQuests,
            state.completedIntelligenceQuests,
          );
          return {
            ...state,
            gold,
            strengthXP,
            agilityXP,
            intelligenceXP,
            unlockedTitleIds: [...state.unlockedTitleIds, ...newTitles],
            heroEpicMilestoneClaimedIds: [...state.heroEpicMilestoneClaimedIds, questId],
          };
        });
        return claimed;
      },

      dismissDailyWelcome: () =>
        set({ lastDailyWelcomeDate: getTodayString() }),

      triggerForceDailyFlow: () =>
        set({ forceDailyFlowPending: true }),

      resetDailyFlowStatus: () =>
        set({ lastDailyWelcomeDate: null, lastAppOpenDate: null }),

      completeDailyFlow: () =>
        set({ lastDailyWelcomeDate: getTodayString(), forceDailyFlowPending: false }),

      acknowledgePlayerLevelUp: () =>
        set({ lastAcknowledgedPlayerLevel: get().getPlayerLevel() }),

      setPlanningDayOrderForDate: (dateKey, orderedHabitIds) => {
        set((s) => ({
          planningDayOrderByDate: { ...s.planningDayOrderByDate, [dateKey]: orderedHabitIds },
        }));
      },

      setCastleQuestSortMode: (mode) => {
        set((s) => {
          if (mode === 'custom') {
            const activeIds = s.habits.filter((h) => h.isActive).map((h) => h.id);
            const prev = s.castleQuestOrderIds.filter((id) => activeIds.includes(id));
            const missing = activeIds.filter((id) => !prev.includes(id));
            return {
              castleQuestSortMode: mode,
              castleQuestOrderIds: [...prev, ...missing],
            };
          }
          return { castleQuestSortMode: mode };
        });
      },

      setCastleQuestOrderIds: (orderedHabitIds) => set({ castleQuestOrderIds: orderedHabitIds }),

      appendSageChatMessage: ({ role, text }) => {
        const msg: SageChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          role,
          text,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ sageChatMessages: [...s.sageChatMessages, msg] }));
      },

      setSageFocus: (sageFocus) => set({ sageFocus }),
      completeRealmOnboarding: (payload: {
        playerClass: PlayerClass;
        heroDisplayName: string;
        heroGender: HeroGender;
        sageFocus: SageLifeFocus;
        weakness: OnboardingWeakness;
        commitment: OnboardingCommitment;
        deepProfile: OnboardingDeepProfile | null;
      }) =>
        set({
          playerClass: payload.playerClass,
          heroDisplayName: payload.heroDisplayName.trim().slice(0, 32) || null,
          heroGender: payload.heroGender,
          sageFocus: payload.sageFocus,
          onboardingWeakness: payload.weakness,
          onboardingCommitment: payload.commitment,
          onboardingEnergyBaseline: payload.deepProfile?.energy ?? null,
          onboardingScreenDistraction: payload.deepProfile?.screen ?? null,
          onboardingStressResponse: payload.deepProfile?.stress ?? null,
          onboardingPhysicality: payload.deepProfile?.physicality ?? null,
          onboardingPlanningStyle: payload.deepProfile?.planning ?? null,
          onboardingComplete: true,
        }),
      devResetOnboarding: () =>
        set({
          onboardingComplete: false,
          playerClass: null,
          heroDisplayName: null,
          heroGender: null,
          onboardingWeakness: null,
          onboardingCommitment: null,
          onboardingEnergyBaseline: null,
          onboardingScreenDistraction: null,
          onboardingStressResponse: null,
          onboardingPhysicality: null,
          onboardingPlanningStyle: null,
          sageFocus: 'body',
        }),
      hydrateFromCloud: (snapshot) =>
        set((state) => {
          const merged = {
            ...state,
            ...snapshot,
            sageChatMessages:
              Array.isArray(snapshot.sageChatMessages) && snapshot.sageChatMessages.length > 0
                ? snapshot.sageChatMessages
                : state.sageChatMessages,
            sageFocus: snapshot.sageFocus ?? state.sageFocus,
            planningDayOrderByDate:
              snapshot.planningDayOrderByDate && typeof snapshot.planningDayOrderByDate === "object"
                ? { ...state.planningDayOrderByDate, ...snapshot.planningDayOrderByDate }
                : state.planningDayOrderByDate,
            castleQuestSortMode: snapshot.castleQuestSortMode ?? state.castleQuestSortMode,
            castleQuestOrderIds: Array.isArray(snapshot.castleQuestOrderIds)
              ? snapshot.castleQuestOrderIds
              : state.castleQuestOrderIds,
            onboardingComplete:
              snapshot.playerClass != null
                ? true
                : snapshot.onboardingComplete ?? state.onboardingComplete,
            reflectionSavedDateKeys:
              snapshot.reflectionSavedDateKeys && typeof snapshot.reflectionSavedDateKeys === "object"
                ? { ...state.reflectionSavedDateKeys, ...snapshot.reflectionSavedDateKeys }
                : state.reflectionSavedDateKeys,
            heroShopPurchaseEver: snapshot.heroShopPurchaseEver ?? state.heroShopPurchaseEver,
            heroDailyQuestClaimsDate:
              snapshot.heroDailyQuestClaimsDate ?? state.heroDailyQuestClaimsDate,
            heroDailyQuestClaimedIds: Array.isArray(snapshot.heroDailyQuestClaimedIds)
              ? snapshot.heroDailyQuestClaimedIds
              : state.heroDailyQuestClaimedIds,
            heroEpicMilestoneClaimedIds: Array.isArray(snapshot.heroEpicMilestoneClaimedIds)
              ? snapshot.heroEpicMilestoneClaimedIds
              : state.heroEpicMilestoneClaimedIds,
          };
          return merged;
        }),

      completeHabit: (habitId: string) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          const habit = base.habits.find(h => h.id === habitId && h.isActive);
          if (!habit || habit.completedToday || habit.isFrozen) return base;

          const rewards = DIFFICULTY_BASE_REWARDS[resolveDifficulty(habit)];
          const dragonBuffs = getActiveDragonBuffs(base);
          const newTaskIndex = base.tasksCompletedToday + 1;
          const fatigueMul = fatigueMultiplierForTaskIndex(newTaskIndex);
          const xpGranted = Math.floor(rewards.xp * fatigueMul);

          const capLeft = Math.max(0, GOLD_CAP_STANDARD_TASKS_DAILY - base.goldFromStandardTasksToday);
          const boostedGold = Math.floor(rewards.gold * dragonBuffs.goldMultiplier);
          const goldGranted = Math.min(boostedGold, capLeft);

          let keyDropped = false;
          if (rollDungeonKeyDrop(base.firstDungeonKeyDroppedToday) || Math.random() < dragonBuffs.keyDropChanceBonus) {
            keyDropped = true;
          }

          const xpKey = `${habit.stat}XP` as 'strengthXP' | 'agilityXP' | 'intelligenceXP';
          const newStatXp = base[xpKey] + xpGranted;

          const strengthXP = habit.stat === 'strength' ? newStatXp : base.strengthXP;
          const agilityXP = habit.stat === 'agility' ? newStatXp : base.agilityXP;
          const intelligenceXP = habit.stat === 'intelligence' ? newStatXp : base.intelligenceXP;
          const completedStrengthQuests = base.completedStrengthQuests + (habit.stat === 'strength' ? 1 : 0);
          const completedAgilityQuests = base.completedAgilityQuests + (habit.stat === 'agility' ? 1 : 0);
          const completedIntelligenceQuests = base.completedIntelligenceQuests + (habit.stat === 'intelligence' ? 1 : 0);

          const today = getTodayString();
          // Planned tasks from the future shouldn't be completable "today".
          if (habit.scheduledDate && habit.scheduledDate > today) return base;
          const updatedHabits = base.habits.map((h) => {
            if (h.id !== habitId) return h;
            const next = { ...h, completedToday: true };
            if (h.taskType === 'daily') {
              const completionDates = [...(h.completionDates ?? [])];
              if (!completionDates.includes(today)) completionDates.push(today);
              const currentStreak = (h.currentStreak ?? 0) + 1;
              return {
                ...next,
                completionDates,
                currentStreak,
                longestStreak: Math.max(h.longestStreak ?? 0, currentStreak),
                totalCompletions: (h.totalCompletions ?? 0) + 1,
              };
            }
            return next;
          });
          const allDone = updatedHabits.filter((h) => h.isActive).every((h) => h.completedToday);
          const isNewStreakDay = base.lastCompletionDate !== today;

          let newStreak = base.streak;
          if (allDone && isNewStreakDay) {
            newStreak = base.streak + 1;
          }

          const newTitles = collectNewTitles(
            base.unlockedTitleIds,
            strengthXP,
            agilityXP,
            intelligenceXP,
            completedStrengthQuests,
            completedAgilityQuests,
            completedIntelligenceQuests,
          );

          console.log(
            `[GameStore] complete ${habit.name} [${resolveDifficulty(habit)}] task#${newTaskIndex} fatigue=${fatigueMul} +${xpGranted} ${habit.stat}XP +${goldGranted}g key=${keyDropped}`,
          );

          const activityByDate = patchActivityForDay(base.activityByDate ?? {}, today, 1, xpGranted);
          const completedHabitNamesByDate = appendCompletedHabitNameForDay(
            base.completedHabitNamesByDate ?? {},
            today,
            habit.name,
          );

          return {
            ...base,
            // One-off quests stay active (and visible as completed) until the daily reset,
            // same UX as daily habits. resetDailyHabits clears completedToday + isActive for them.
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
            completedStrengthQuests,
            completedAgilityQuests,
            completedIntelligenceQuests,
            unlockedTitleIds: [...base.unlockedTitleIds, ...newTitles],
            activityByDate,
            completedHabitNamesByDate,
          };
        });
      },

      uncompleteHabit: (habitId: string) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          const habit = base.habits.find(h => h.id === habitId && h.isActive);
          if (!habit || !habit.completedToday) return base;

          const ledger = base.habitCompletionLog[habitId];
          const updatedHabits = base.habits.map((h) => {
            if (h.id !== habitId) return h;
            if (h.taskType !== 'daily') return { ...h, completedToday: false };
            const today = getTodayString();
            const completionDates = (h.completionDates ?? []).filter((d) => d !== today);
            return {
              ...h,
              completedToday: false,
              currentStreak: Math.max(0, (h.currentStreak ?? 0) - 1),
              completionDates,
              totalCompletions: Math.max(0, (h.totalCompletions ?? 0) - 1),
            };
          });

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
          const today = getTodayString();
          const activityByDate = patchActivityForDay(base.activityByDate ?? {}, today, -1, -ledger.xpGranted);
          const completedHabitNamesByDate = removeCompletedHabitNameForDay(
            base.completedHabitNamesByDate ?? {},
            today,
            habit.name,
          );

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
            activityByDate,
            completedHabitNamesByDate,
          };
        });
      },

      addHabit: (habit) => {
        const newHabit: Habit = {
          ...habit,
          taskType: habit.taskType ?? 'daily',
          scheduledDate: habit.scheduledDate ?? null,
          isActive: true,
          currentStreak: (habit.taskType ?? 'daily') === 'daily' ? 0 : undefined,
          longestStreak: (habit.taskType ?? 'daily') === 'daily' ? 0 : undefined,
          totalCompletions: (habit.taskType ?? 'daily') === 'daily' ? 0 : undefined,
          completionDates: (habit.taskType ?? 'daily') === 'daily' ? [] : undefined,
          difficulty: habit.difficulty ?? 'medium',
          ...(habit.oracleStatWeights ? { oracleStatWeights: habit.oracleStatWeights } : {}),
          id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          completedToday: false,
        };
        console.log(`[GameStore] Adding habit: ${newHabit.name} (${newHabit.stat}, ${newHabit.difficulty})`);
        set((s) => ({
          habits: [...s.habits, newHabit],
          castleQuestOrderIds: [...s.castleQuestOrderIds, newHabit.id],
        }));
      },

      setHabitScheduledDate: (habitId: string, scheduledDate: string | null) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          return {
            ...base,
            habits: base.habits.map((h) => (h.id === habitId ? { ...h, scheduledDate } : h)),
          };
        });
      },

      removeHabit: (habitId: string) => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          const base = { ...state, ...econ };
          const habit = base.habits.find(h => h.id === habitId);
          if (!habit) return base;

          const nextLog = { ...base.habitCompletionLog };
          delete nextLog[habitId];
          const remainingHabits = base.habits.map((h) => (h.id === habitId ? { ...h, isActive: false } : h));
          return {
            ...base,
            habits: remainingHabits,
            allCompletedToday:
              remainingHabits.filter((h) => h.isActive).length > 0 &&
              remainingHabits.filter((h) => h.isActive).every((h) => h.completedToday),
            habitCompletionLog: nextLog,
            castleQuestOrderIds: base.castleQuestOrderIds.filter((id) => id !== habitId),
          };
        });
      },

      updateHabit: (habitId, patch) => {
        set((state) => ({
          habits: state.habits.map((h) => {
            if (h.id !== habitId) return h;
            return {
              ...h,
              name: patch.name != null ? patch.name.trim() || h.name : h.name,
              description:
                patch.description != null ? patch.description.trim() || h.description : h.description,
              icon: patch.icon != null ? patch.icon : h.icon,
              taskType: patch.taskType ?? h.taskType,
            };
          }),
        }));
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
          const newTitles = collectNewTitles(
            state.unlockedTitleIds,
            strengthXP,
            agilityXP,
            intelligenceXP,
            state.completedStrengthQuests,
            state.completedAgilityQuests,
            state.completedIntelligenceQuests,
          );
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
          heroShopPurchaseEver: true,
        });
        console.log(`[GameStore] Bought dungeon key for ${DUNGEON_KEY_GOLD_PRICE} gold`);
        return true;
      },

      purchaseElixirOfTime: () => {
        const state = get();
        if (state.gold < ELIXIR_OF_TIME_GOLD_COST) return false;
        set({
          gold: state.gold - ELIXIR_OF_TIME_GOLD_COST,
          consumables: {
            ...state.consumables,
            elixirOfTime: (state.consumables?.elixirOfTime ?? 0) + 1,
          },
          heroShopPurchaseEver: true,
        });
        return true;
      },

      useElixirOfTimeOnHabit: (habitId: string) => {
        const state = get();
        const count = state.consumables?.elixirOfTime ?? 0;
        if (count <= 0) return false;
        const habit = state.habits.find((h) => h.id === habitId && h.taskType === 'daily' && h.isActive);
        if (!habit || habit.completedToday || habit.isFrozen) return false;
        const today = getTodayString();
        set({
          habits: state.habits.map((h) =>
            h.id === habitId ? { ...h, isFrozen: true, frozenAtDate: today } : h,
          ),
          consumables: {
            ...state.consumables,
            elixirOfTime: count - 1,
          },
        });
        return true;
      },

      setActiveDragon: (dragonId: string) => {
        const state = get();
        const cfg = DRAGON_CONFIGS[dragonId as DragonId];
        if (!cfg) return { ok: false, reason: 'unknown_dragon' };
        if (state.streak < cfg.unlockStreak) return { ok: false, reason: 'locked' };
        if (state.activeDragonId === dragonId) return { ok: false, reason: 'already_active' };
        const now = Date.now();
        const lockUntil = state.dragonSwitchCooldownUntil ? Date.parse(state.dragonSwitchCooldownUntil) : 0;
        if (lockUntil && now < lockUntil) return { ok: false, reason: 'cooldown' };
        const next = new Date(now + DRAGON_SWITCH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
        set({ activeDragonId: dragonId as DragonId, dragonSwitchCooldownUntil: next });
        return { ok: true };
      },

      resolveDungeonBattle: async (challengeId: string) => {
        const before = get();
        if (before.dungeonKeys <= 0) return { ok: false, reason: 'no_keys' };
        const consumed = get().consumeDungeonKeyForRun();
        if (!consumed) return { ok: false, reason: 'no_keys' };
        await new Promise((r) => setTimeout(r, BATTLE_SIMULATION_MS));
        const result = rollDungeonBattleResult(get(), challengeId as DungeonChallengeId);
        if (result.won) {
          get().addInventoryItemId(result.reward.itemId);
          return { ok: true, won: true, chance: result.chance, reward: { type: 'item', itemId: result.reward.itemId } };
        }
        get().addDungeonChestGold(result.reward.amount);
        get().addXP('strength', result.reward.xp);
        return { ok: true, won: false, chance: result.chance, reward: { type: 'gold', amount: result.reward.amount } };
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
          console.log(`[GameStore] Inventory +1 (stack): ${itemId}`);
          return { ownedItemIds: [...ownedItemIds, itemId] };
        });
      },

      sellInventoryItemAtIndex: (index: number) => {
        set((state) => {
          const owned = [...(state.ownedItemIds ?? [])];
          if (index < 0 || index >= owned.length) return state;
          const itemId = owned[index]!;
          const entry = resolveLootItemById(itemId);
          owned.splice(index, 1);
          const price = entry ? sellPriceForRarity(entry.rarity) : 0;
          let equippedOutfitId = state.equippedOutfitId ?? null;
          let equippedRelicId = state.equippedRelicId ?? null;
          if (equippedOutfitId === itemId) equippedOutfitId = null;
          if (equippedRelicId === itemId) equippedRelicId = null;
          console.log(`[GameStore] Sold inventory[${index}] ${itemId} for ${price}g`);
          return {
            ownedItemIds: owned,
            gold: state.gold + price,
            equippedOutfitId,
            equippedRelicId,
          };
        });
      },

      equipItemById: (itemId: string) => {
        const entry = resolveLootItemById(itemId);
        if (!entry) return;
        if (entry.itemSlot === 'outfit') {
          set({ equippedOutfitId: itemId });
        } else {
          set({ equippedRelicId: itemId });
        }
        console.log(`[GameStore] Equipped ${entry.itemSlot}: ${itemId}`);
      },

      unequipLoadoutSlot: (slot: 'outfit' | 'relic') => {
        if (slot === 'outfit') set({ equippedOutfitId: null });
        else set({ equippedRelicId: null });
        console.log(`[GameStore] Unequipped ${slot}`);
      },

      addDungeonChestGold: (amount: number) => {
        if (amount <= 0) return;
        console.log(`[GameStore] Dungeon chest gold +${amount} (no daily habit cap)`);
        set((s) => ({ gold: s.gold + amount }));
      },

      ensureSageEpicState: () => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state);
          if (econ) return { ...state, ...econ };
          const today = getTodayString();
          if (state.sageEpicQuestId && state.sageEpicQuestDate === today) return state;
          return {
            ...state,
            sageEpicQuestDate: today,
            sageEpicQuestId: pickRandomEpicQuestId(),
            sageEpicRerollsUsedToday: 0,
            sageEpicRerollPendingIds: null,
          };
        });
      },

      paySageEpicReroll: () => {
        const state = get();
        const econ = getEconomyPatchIfNewDay(state) ?? {};
        let base: GameState = { ...state, ...econ };
        const today = getTodayString();
        if (!base.sageEpicQuestId || base.sageEpicQuestDate !== today) {
          base = {
            ...base,
            sageEpicQuestDate: today,
            sageEpicQuestId: pickRandomEpicQuestId(),
            sageEpicRerollsUsedToday: 0,
            sageEpicRerollPendingIds: null,
          };
        }
        if (base.sageEpicQuestClaimedToday) return false;
        if (base.sageEpicRerollsUsedToday >= 1) return false;
        if (base.gold < GOLD_SAGE_EPIC_REROLL) return false;
        if (base.sageEpicRerollPendingIds && base.sageEpicRerollPendingIds.length > 0) return false;

        const three = pickThreeDistinctEpicQuestIds(base.sageEpicQuestId);
        set({
          ...base,
          gold: base.gold - GOLD_SAGE_EPIC_REROLL,
          sageEpicRerollsUsedToday: 1,
          sageEpicRerollPendingIds: three,
        });
        console.log(`[GameStore] Sage epic reroll -${GOLD_SAGE_EPIC_REROLL}g, choices: ${three.join(',')}`);
        return true;
      },

      selectSageEpicQuest: (questId: string) => {
        set((state) => {
          const pending = state.sageEpicRerollPendingIds;
          if (!pending?.includes(questId)) return state;
          return { ...state, sageEpicQuestId: questId, sageEpicRerollPendingIds: null };
        });
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
          const newTitles = collectNewTitles(
            base.unlockedTitleIds,
            strengthXP,
            agilityXP,
            intelligenceXP,
            base.completedStrengthQuests,
            base.completedAgilityQuests,
            base.completedIntelligenceQuests,
          );
          console.log(`[GameStore] Sage Epic Quest +${GOLD_EPIC_QUEST_SAGE} gold (extra pool), +${xpBonus} ${stat} XP`);
          const today = getTodayString();
          const activityByDate = patchActivityForDay(base.activityByDate ?? {}, today, 1, xpBonus);
          return {
            ...base,
            gold: base.gold + GOLD_EPIC_QUEST_SAGE,
            sageEpicQuestClaimedToday: true,
            [xpKey]: newXp,
            unlockedTitleIds: [...base.unlockedTitleIds, ...newTitles],
            activityByDate,
          };
        });
      },

      setHapticsEnabled: (enabled: boolean) => {
        set({ hapticsEnabled: enabled });
      },

      processDailyLogin: () => {
        set((state) => {
          const econ = getEconomyPatchIfNewDay(state) ?? {};
          let next = { ...state, ...econ };
          const today = getTodayString();
          const yesterdayStr = getYesterdayString();

          let appLoginStreak = next.appLoginStreak ?? 1;
          let lastAppOpenDate = next.lastAppOpenDate;
          if (lastAppOpenDate !== today) {
            if (lastAppOpenDate === yesterdayStr) {
              appLoginStreak = Math.max(1, (next.appLoginStreak ?? 1) + 1);
            } else if (lastAppOpenDate == null) {
              appLoginStreak = 1;
            } else {
              appLoginStreak = 1;
            }
            lastAppOpenDate = today;
          }
          next = { ...next, appLoginStreak, lastAppOpenDate };

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
          habits: state.habits
            .map((h) => ensureHabitDefaults(h))
            .map((h) => {
              if (!h.isActive) return h;
              if (h.taskType === 'one-off') {
                if (h.completedToday) return { ...h, completedToday: false, isActive: false };
                return { ...h, completedToday: false };
              }
              if (h.isFrozen) {
                // Preserve streak line for one day and thaw on reset.
                return { ...h, completedToday: false, isFrozen: false, frozenAtDate: null };
              }
              if (!h.completedToday) {
                return { ...h, completedToday: false, currentStreak: 0 };
              }
              return { ...h, completedToday: false };
            }),
          allCompletedToday: false,
          streak: newStreak,
          habitCompletionLog: {},
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
        sageEpicQuestId: state.sageEpicQuestId,
        sageEpicQuestDate: state.sageEpicQuestDate,
        sageEpicRerollsUsedToday: state.sageEpicRerollsUsedToday,
        sageEpicRerollPendingIds: state.sageEpicRerollPendingIds,
        lastMorningGoldClaimDate: state.lastMorningGoldClaimDate,
        unlockedTitleIds: state.unlockedTitleIds,
        habitCompletionLog: state.habitCompletionLog,
        completedStrengthQuests: state.completedStrengthQuests,
        completedAgilityQuests: state.completedAgilityQuests,
        completedIntelligenceQuests: state.completedIntelligenceQuests,
        ownedItemIds: state.ownedItemIds,
        equippedOutfitId: state.equippedOutfitId,
        equippedRelicId: state.equippedRelicId,
        activeDragonId: state.activeDragonId,
        dragonSwitchCooldownUntil: state.dragonSwitchCooldownUntil,
        consumables: state.consumables,
        activityByDate: state.activityByDate,
        completedHabitNamesByDate: state.completedHabitNamesByDate,
        hapticsEnabled: state.hapticsEnabled,
        sageFocus: state.sageFocus,
        sageChatMessages: state.sageChatMessages,
        planningDayOrderByDate: state.planningDayOrderByDate,
        castleQuestSortMode: state.castleQuestSortMode,
        castleQuestOrderIds: state.castleQuestOrderIds,
        appLoginStreak: state.appLoginStreak,
        lastAppOpenDate: state.lastAppOpenDate,
        lastDailyWelcomeDate: state.lastDailyWelcomeDate,
        lastAcknowledgedPlayerLevel: state.lastAcknowledgedPlayerLevel,
        reflectionSavedDateKeys: state.reflectionSavedDateKeys,
        heroShopPurchaseEver: state.heroShopPurchaseEver,
        heroDailyQuestClaimsDate: state.heroDailyQuestClaimsDate,
        heroDailyQuestClaimedIds: state.heroDailyQuestClaimedIds,
        heroEpicMilestoneClaimedIds: state.heroEpicMilestoneClaimedIds,
        onboardingEnergyBaseline: state.onboardingEnergyBaseline,
        onboardingScreenDistraction: state.onboardingScreenDistraction,
        onboardingStressResponse: state.onboardingStressResponse,
        onboardingPhysicality: state.onboardingPhysicality,
        onboardingPlanningStyle: state.onboardingPlanningStyle,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameState> | undefined;
        return {
          ...current,
          ...p,
          habits: (p?.habits ?? current.habits).map((h) => ensureHabitDefaults(h)),
          sageFocus: p?.sageFocus ?? current.sageFocus,
          sageChatMessages:
            Array.isArray(p?.sageChatMessages) && p.sageChatMessages.length > 0
              ? p.sageChatMessages
              : current.sageChatMessages,
          completedHabitNamesByDate: p?.completedHabitNamesByDate ?? current.completedHabitNamesByDate,
          activeDragonId: p?.activeDragonId ?? current.activeDragonId,
          dragonSwitchCooldownUntil: p?.dragonSwitchCooldownUntil ?? current.dragonSwitchCooldownUntil,
          consumables: p?.consumables ?? current.consumables,
          planningDayOrderByDate: p?.planningDayOrderByDate ?? current.planningDayOrderByDate,
          castleQuestSortMode: p?.castleQuestSortMode ?? current.castleQuestSortMode,
          castleQuestOrderIds: Array.isArray(p?.castleQuestOrderIds)
            ? p.castleQuestOrderIds
            : current.castleQuestOrderIds,
          onboardingComplete:
            p?.onboardingComplete ?? (p?.playerClass ? true : current.onboardingComplete),
          heroDisplayName: p?.heroDisplayName ?? current.heroDisplayName,
          heroGender: p?.heroGender ?? current.heroGender,
          onboardingWeakness: p?.onboardingWeakness ?? current.onboardingWeakness,
          onboardingCommitment: p?.onboardingCommitment ?? current.onboardingCommitment,
          onboardingEnergyBaseline: p?.onboardingEnergyBaseline ?? current.onboardingEnergyBaseline,
          onboardingScreenDistraction: p?.onboardingScreenDistraction ?? current.onboardingScreenDistraction,
          onboardingStressResponse: p?.onboardingStressResponse ?? current.onboardingStressResponse,
          onboardingPhysicality: p?.onboardingPhysicality ?? current.onboardingPhysicality,
          onboardingPlanningStyle: p?.onboardingPlanningStyle ?? current.onboardingPlanningStyle,
          appLoginStreak: p?.appLoginStreak ?? current.appLoginStreak,
          lastAppOpenDate: p?.lastAppOpenDate ?? current.lastAppOpenDate,
          lastDailyWelcomeDate: p?.lastDailyWelcomeDate ?? current.lastDailyWelcomeDate,
          lastAcknowledgedPlayerLevel:
            typeof p?.lastAcknowledgedPlayerLevel === 'number'
              ? p.lastAcknowledgedPlayerLevel
              : getLevelFromXP(
                  (p?.strengthXP ?? 0) + (p?.agilityXP ?? 0) + (p?.intelligenceXP ?? 0),
                ),
          reflectionSavedDateKeys: p?.reflectionSavedDateKeys ?? current.reflectionSavedDateKeys,
          heroShopPurchaseEver: p?.heroShopPurchaseEver ?? current.heroShopPurchaseEver,
          heroDailyQuestClaimsDate: p?.heroDailyQuestClaimsDate ?? current.heroDailyQuestClaimsDate,
          heroDailyQuestClaimedIds: Array.isArray(p?.heroDailyQuestClaimedIds)
            ? p.heroDailyQuestClaimedIds
            : current.heroDailyQuestClaimedIds,
          heroEpicMilestoneClaimedIds: Array.isArray(p?.heroEpicMilestoneClaimedIds)
            ? p.heroEpicMilestoneClaimedIds
            : current.heroEpicMilestoneClaimedIds,
        };
      },
    },
  ),
);
