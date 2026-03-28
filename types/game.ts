import type { OracleTaskStatWeights } from '@/types/oracle';

export type StatType = 'strength' | 'agility' | 'intelligence';

export type TaskType = 'daily' | 'one-off';
export type ConsumableType = 'elixir_of_time';

export type PlayerClass = 'warrior' | 'hunter' | 'mage' | 'paladin';

/** Cel życiowy / fokus Mędrca — wpływa na rady AI. */
export type SageLifeFocus = 'body' | 'mind' | 'work';

/** Cosmetic — chosen in Sage onboarding. */
export type HeroGender = 'male' | 'female';

export type OnboardingWeakness = 'procrastination' | 'bad_diet' | 'lack_of_sleep';

export type OnboardingCommitment = '15min' | '1hour' | 'limitless';

/** Deep profiling path (Sage "Ask More") — persisted for personalization / future AI. */
export type OnboardingEnergyBaseline = 'high_energy' | 'coffee_dependent' | 'low_energy';
export type OnboardingScreenDistraction = 'low_screen' | 'average_screen' | 'doomscroll';
export type OnboardingStressResponse = 'organized' | 'anxious' | 'overwhelmed';
export type OnboardingPhysicality = 'active' | 'lightly_active' | 'sedentary';
export type OnboardingPlanningStyle = 'todo_lists' | 'mental_notes' | 'no_planning';

export interface OnboardingDeepProfile {
  energy: OnboardingEnergyBaseline;
  screen: OnboardingScreenDistraction;
  stress: OnboardingStressResponse;
  physicality: OnboardingPhysicality;
  planning: OnboardingPlanningStyle;
}

export type SageChatRole = 'user' | 'sage';

export interface SageChatMessage {
  id: string;
  role: SageChatRole;
  text: string;
  /** ISO 8601 */
  createdAt: string;
}

/** Task difficulty — drives base XP and gold per completion. */
export type HabitDifficulty = 'easy' | 'medium' | 'hard';

export interface Habit {
  id: string;
  name: string;
  description: string;
  stat: StatType;
  taskType: TaskType;
  /**
   * Planned due date (`YYYY-MM-DD`).
   * - `null` / `undefined` => treat as unscheduled (visible on "today" by default)
   * - future date => hidden from the default list until opened via "Kalendarz Wypraw"
   */
  scheduledDate?: string | null;
  isActive: boolean;
  currentStreak?: number;
  longestStreak?: number;
  totalCompletions?: number;
  completionDates?: string[];
  completedToday: boolean;
  icon: string;
  /** Older saves may omit; treated as `medium`. */
  difficulty?: HabitDifficulty;
  /** One-day protection: if true, streak is not lost on reset. */
  isFrozen?: boolean;
  /** Date key (`YYYY-MM-DD`) when freeze was applied. */
  frozenAtDate?: string | null;
  /** Optional six-axis blend from Oracle (Groq); gameplay still uses `stat`. */
  oracleStatWeights?: OracleTaskStatWeights;
}

export interface DragonBuffs {
  goldMultiplier: number;
  keyDropChanceBonus: number;
  bossWinChanceBonus: number;
}

export interface PlayerConsumables {
  elixirOfTime: number;
}

/** Snapshot of rewards granted for one habit completion today (for reversal on uncomplete). */
export interface HabitCompletionLedger {
  taskDayIndex: number;
  xpGranted: number;
  goldGranted: number;
  keyDropped: boolean;
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
  /** Display name from Sage onboarding (Hero tab / future use). */
  heroDisplayName: string | null;
  heroGender: HeroGender | null;
  onboardingWeakness: OnboardingWeakness | null;
  onboardingCommitment: OnboardingCommitment | null;
  onboardingEnergyBaseline: OnboardingEnergyBaseline | null;
  onboardingScreenDistraction: OnboardingScreenDistraction | null;
  onboardingStressResponse: OnboardingStressResponse | null;
  onboardingPhysicality: OnboardingPhysicality | null;
  onboardingPlanningStyle: OnboardingPlanningStyle | null;
  /** When false, AuthGate sends the player through the Sage onboarding flow. */
  onboardingComplete: boolean;
  /** Persistent currency — dungeon keys (casino / lochów). */
  dungeonKeys: number;
  /** Completions today (for fatigue XP scaling). */
  tasksCompletedToday: number;
  /** Gold from standard habits today toward the 100 cap. */
  goldFromStandardTasksToday: number;
  /** Calendar day for which economy counters below are valid. */
  lastEconomyResetDate: string | null;
  /** First key already dropped today — lowers further drop rates. */
  firstDungeonKeyDroppedToday: boolean;
  /** Sage epic quest (50 gold, separate from 100 cap) claimed this calendar day. */
  sageEpicQuestClaimedToday: boolean;
  /** Stable id from `EPIC_QUEST_DEFINITIONS` for today's epic quest. */
  sageEpicQuestId: string | null;
  /** Calendar day (`YYYY-MM-DD`) for which `sageEpicQuestId` is valid. */
  sageEpicQuestDate: string | null;
  /** Paid rerolls used today (max 1). */
  sageEpicRerollsUsedToday: number;
  /** After paying reroll: three quest ids to pick from; null when not choosing. */
  sageEpicRerollPendingIds: string[] | null;
  /** Morning streak bonus (+20 gold) claimed for this calendar day. */
  lastMorningGoldClaimDate: string | null;
  /** Titles unlocked by milestone stat levels. */
  unlockedTitleIds: string[];
  /** Per-habit grants for the current economy day (cleared at daily reset). */
  habitCompletionLog: Record<string, HabitCompletionLedger>;
  /** Łączna liczba ukończonych nawyków STR w historii gracza. */
  completedStrengthQuests: number;
  /** Łączna liczba ukończonych nawyków AGI w historii gracza. */
  completedAgilityQuests: number;
  /** Łączna liczba ukończonych nawyków INT w historii gracza. */
  completedIntelligenceQuests: number;
  /** Stack przedmiotów z lochów — ID mogą się powtarzać (duplikaty). */
  ownedItemIds: string[];
  /** Aktywny strój / zbroja (kosmetyk). */
  equippedOutfitId: string | null;
  /** Aktywna relikwia / broń / artefakt (kosmetyk). */
  equippedRelicId: string | null;
  /** Global companion selected by player. */
  activeDragonId: string | null;
  /** Next date-time when dragon switch is unlocked (ISO). */
  dragonSwitchCooldownUntil: string | null;
  /** Owned consumables inventory. */
  consumables: PlayerConsumables;
  /**
   * Dzienna aktywność (nawyki) dla heatmapy — klucz `YYYY-MM-DD`.
   * `completions` = liczba odhaczonych nawyków; `xpFromHabits` = XP z nawyków tego dnia.
   */
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
  /** Dzienny log nazw wykonanych zadań do podglądu z heatmapy. */
  completedHabitNamesByDate: Record<string, string[]>;
  /** Globalny przełącznik wibracji (Settings). */
  hapticsEnabled: boolean;
  /** Priorytet rad Mędrca / LLM (ciało, umysł, praca). */
  sageFocus: SageLifeFocus;
  /** Historia czatu z Mędrcem (persystowana). */
  sageChatMessages: SageChatMessage[];
  /**
   * Custom ordering of habit ids per calendar day (`YYYY-MM-DD`) in Planning Center (drag & drop).
   */
  planningDayOrderByDate: Record<string, string[]>;
  /** Castle home quest list: default follows `habits` array order; custom uses `castleQuestOrderIds`. */
  castleQuestSortMode: 'default' | 'custom';
  /** Habit ids for custom ordering on the Castle screen (due quests only at render time). */
  castleQuestOrderIds: string[];
  /** Consecutive calendar days the app was opened (for daily welcome timeline). */
  appLoginStreak: number;
  /** Last calendar day (`YYYY-MM-DD`) the app open was recorded for streak. */
  lastAppOpenDate: string | null;
  /** Last day the daily welcome overlay was dismissed; show again when calendar day changes. */
  lastDailyWelcomeDate: string | null;
  /** Hero level last confirmed via level-up overlay; when `getPlayerLevel()` exceeds this, show celebration. */
  lastAcknowledgedPlayerLevel: number;
}

export interface GameActions {
  completeHabit: (habitId: string) => void;
  uncompleteHabit: (habitId: string) => void;
  addHabit: (habit: {
    name: string;
    description: string;
    stat: StatType;
    taskType: TaskType;
    icon: string;
    difficulty?: HabitDifficulty;
    scheduledDate?: string | null;
    oracleStatWeights?: OracleTaskStatWeights;
  }) => void;
  removeHabit: (habitId: string) => void;
  /** Allows editing only the planned date without affecting the rest of progress. */
  setHabitScheduledDate: (habitId: string, scheduledDate: string | null) => void;
  getPlayerLevel: () => number;
  getTotalXP: () => number;
  getXPForNextLevel: () => number;
  getCurrentLevelXP: () => number;
  getStatLevel: (stat: StatType) => number;
  resetDailyHabits: () => void;
  /** Run after midnight / on first screen load: economy rollover + morning gold if eligible. */
  processDailyLogin: () => void;
  /** Mark today's dragon welcome as seen (closes daily celebration overlay). */
  dismissDailyWelcome: () => void;
  /** Sync acknowledged hero level to current (closes level-up overlay). */
  acknowledgePlayerLevelUp: () => void;
  setPlayerClass: (playerClass: PlayerClass) => void;
  /** Persists all Sage onboarding choices and opens the realm (tabs). */
  completeRealmOnboarding: (payload: {
    playerClass: PlayerClass;
    heroDisplayName: string;
    heroGender: HeroGender;
    sageFocus: SageLifeFocus;
    weakness: OnboardingWeakness;
    commitment: OnboardingCommitment;
    /** Null = short path; full object = completed deep profiling. */
    deepProfile: OnboardingDeepProfile | null;
  }) => void;
  /** Dev-only: clear onboarding flags and profile fields for re-testing the Sage wizard. */
  devResetOnboarding: () => void;
  /** Unrestricted gold (avoid for gameplay; prefer specific reward actions). */
  addGold: (amount: number) => void;
  /** Raw XP grant (no fatigue); used for Sage epic bonus XP. */
  addXP: (stat: StatType, amount: number) => void;
  /** Epic Quest from Sage: +50 gold (outside 100 cap) once per day; not counted toward standard daily gold. */
  claimSageEpicQuestReward: (stat: StatType, xpBonus?: number) => void;
  /** Ensures today's epic quest id exists (migration + day alignment). */
  ensureSageEpicState: () => void;
  /** Spend gold to roll 3 epic quest options; max 1/day; returns false if blocked. */
  paySageEpicReroll: () => boolean;
  /** Commit one of the three reroll options as the new epic quest. */
  selectSageEpicQuest: (questId: string) => void;
  /** Spend gold for a dungeon key (D&D tab). Returns false if not enough gold. */
  purchaseDungeonKeyWithGold: () => boolean;
  /** Consume one key to enter a dungeon run. Returns false if no keys. */
  consumeDungeonKeyForRun: () => boolean;
  /** Dodaje jeden egzemplarz przedmiotu do plecaka (duplikaty dozwolone). */
  addInventoryItemId: (itemId: string) => void;
  /** Sprzedaje jeden egzemplarz pod indeksem; złoto poza limitem nawyków; zdejmuje z loadoutu jeśli założony. */
  sellInventoryItemAtIndex: (index: number) => void;
  /** Zakłada przedmiot do właściwego slotu (nadpisuje poprzedni). */
  equipItemById: (itemId: string) => void;
  /** Zdejmuje aktywny przedmiot ze slotu. */
  unequipLoadoutSlot: (slot: "outfit" | "relic") => void;
  setActiveDragon: (dragonId: string) => { ok: boolean; reason?: string };
  purchaseElixirOfTime: () => boolean;
  useElixirOfTimeOnHabit: (habitId: string) => boolean;
  resolveDungeonBattle: (challengeId: string) => Promise<{
    ok: boolean;
    reason?: string;
    won?: boolean;
    chance?: number;
    reward?: { type: 'item'; itemId: string } | { type: 'gold'; amount: number };
  }>;
  /**
   * Złoto ze skrzyń / lochów — bez limitu dziennego z nawyków.
   * Wewnętrznie to zwykły przyrost salda (jak `addGold`).
   */
  addDungeonChestGold: (amount: number) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSageFocus: (focus: SageLifeFocus) => void;
  /** Dodaje wiadomość do historii czatu (id i createdAt generowane w store). */
  appendSageChatMessage: (message: { role: SageChatRole; text: string }) => void;
  /** Nadpisuje lokalny postęp snapshotem z chmury po zalogowaniu. */
  hydrateFromCloud: (snapshot: Partial<GameState>) => void;
  /** Persists manual task order for a day (Planning Center). */
  setPlanningDayOrderForDate: (dateKey: string, orderedHabitIds: string[]) => void;
  setCastleQuestSortMode: (mode: 'default' | 'custom') => void;
  setCastleQuestOrderIds: (orderedHabitIds: string[]) => void;
}

export interface SuggestedHabit {
  name: string;
  description: string;
  rpgDescription: string;
  stat: StatType;
  taskType: TaskType;
  icon: string;
  difficulty: HabitDifficulty;
}
