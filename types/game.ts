export type StatType = 'strength' | 'agility' | 'intelligence';

export type TimeOfDay = 'morning' | 'day' | 'evening';

export type PlayerClass = 'warrior' | 'hunter' | 'mage';

/** Cel życiowy / fokus Mędrca — wpływa na rady AI. */
export type SageLifeFocus = 'body' | 'mind' | 'work';

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
  timeOfDay: TimeOfDay;
  completedToday: boolean;
  icon: string;
  /** Older saves may omit; treated as `medium`. */
  difficulty?: HabitDifficulty;
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
  /** Stack przedmiotów z lochów — ID mogą się powtarzać (duplikaty). */
  ownedItemIds: string[];
  /** Aktywny strój / zbroja (kosmetyk). */
  equippedOutfitId: string | null;
  /** Aktywna relikwia / broń / artefakt (kosmetyk). */
  equippedRelicId: string | null;
  /**
   * Dzienna aktywność (nawyki) dla heatmapy — klucz `YYYY-MM-DD`.
   * `completions` = liczba odhaczonych nawyków; `xpFromHabits` = XP z nawyków tego dnia.
   */
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
  /** Globalny przełącznik wibracji (Settings). */
  hapticsEnabled: boolean;
  /** Priorytet rad Mędrca / LLM (ciało, umysł, praca). */
  sageFocus: SageLifeFocus;
  /** Historia czatu z Mędrcem (persystowana). */
  sageChatMessages: SageChatMessage[];
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
  /** Run after midnight / on first screen load: economy rollover + morning gold if eligible. */
  processDailyLogin: () => void;
  setPlayerClass: (playerClass: PlayerClass) => void;
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
}

export interface SuggestedHabit {
  name: string;
  description: string;
  rpgDescription: string;
  stat: StatType;
  timeOfDay: TimeOfDay;
  icon: string;
  difficulty: HabitDifficulty;
}
