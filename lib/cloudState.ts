import type { GameState } from "@/types/game";

export type CloudGameState = Pick<
  GameState,
  | "gold"
  | "streak"
  | "strengthXP"
  | "agilityXP"
  | "intelligenceXP"
  | "habits"
  | "lastCompletionDate"
  | "allCompletedToday"
  | "dungeonKeys"
  | "tasksCompletedToday"
  | "goldFromStandardTasksToday"
  | "lastEconomyResetDate"
  | "firstDungeonKeyDroppedToday"
  | "sageEpicQuestClaimedToday"
  | "sageEpicQuestId"
  | "sageEpicQuestDate"
  | "sageEpicRerollsUsedToday"
  | "sageEpicRerollPendingIds"
  | "lastMorningGoldClaimDate"
  | "unlockedTitleIds"
  | "habitCompletionLog"
  | "ownedItemIds"
  | "equippedOutfitId"
  | "equippedRelicId"
  | "activityByDate"
  | "hapticsEnabled"
  | "sageFocus"
  | "sageChatMessages"
>;

export function pickCloudGameState(state: GameState): CloudGameState {
  return {
    gold: state.gold,
    streak: state.streak,
    strengthXP: state.strengthXP,
    agilityXP: state.agilityXP,
    intelligenceXP: state.intelligenceXP,
    habits: state.habits,
    lastCompletionDate: state.lastCompletionDate,
    allCompletedToday: state.allCompletedToday,
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
    ownedItemIds: state.ownedItemIds,
    equippedOutfitId: state.equippedOutfitId,
    equippedRelicId: state.equippedRelicId,
    activityByDate: state.activityByDate,
    hapticsEnabled: state.hapticsEnabled,
    sageFocus: state.sageFocus,
    sageChatMessages: state.sageChatMessages,
  };
}

