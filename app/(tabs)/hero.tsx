import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { TITLE_DEFINITIONS } from "@/constants/titles";
import type { PlayerClass } from "@/types/game";
import HeroHexRadarChart from "@/components/HeroHexRadarChart";
import BackpackInventoryBody from "@/components/BackpackInventoryBody";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import ActivityChroniclesModal from "@/components/ActivityChroniclesModal";
import CircularProgress from "@/components/CircularProgress";
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from "@/lib/hapticsGate";

const CLASS_EPITHET: Record<PlayerClass, string> = {
  warrior: "The Iron Vanguard",
  hunter: "The Shadowblade",
  mage: "The Mindbinder",
  paladin: "The Dawnwarden",
};

type StatsTab = "stats" | "overview";

type QuestDef = {
  id: string;
  title: string;
  rewardGold: number;
  progress: number;
};

function bestUnlockedTitleName(unlockedIds: string[]): string | null {
  const unlocked = new Set(unlockedIds);
  let best: (typeof TITLE_DEFINITIONS)[number] | null = null;
  let score = -1;
  for (const def of TITLE_DEFINITIONS) {
    if (!unlocked.has(def.id)) continue;
    const s = (def.requiredStatLevel ?? 0) * 10 + (def.requiredCompletedQuests ?? 0);
    if (s > score) {
      score = s;
      best = def;
    }
  }
  return best?.name ?? null;
}

function formatDateKey(d: string): string {
  try {
    const [y, m, day] = d.split("-");
    if (!y || !m || !day) return d;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const mi = parseInt(m, 10) - 1;
    return `${months[mi] ?? m} ${parseInt(day, 10)}, ${y}`;
  } catch {
    return d;
  }
}

export default function HeroScreen() {
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(width - 32, 420);

  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);
  const getCurrentLevelXP = useGameStore((s) => s.getCurrentLevelXP);
  const getXPForNextLevel = useGameStore((s) => s.getXPForNextLevel);
  const playerClass = useGameStore((s) => s.playerClass);
  const heroDisplayName = useGameStore((s) => s.heroDisplayName);
  const unlockedTitleIds = useGameStore((s) => s.unlockedTitleIds);
  const completedStrengthQuests = useGameStore((s) => s.completedStrengthQuests);
  const completedAgilityQuests = useGameStore((s) => s.completedAgilityQuests);
  const completedIntelligenceQuests = useGameStore((s) => s.completedIntelligenceQuests);
  const streak = useGameStore((s) => s.streak);
  const activityByDate = useGameStore((s) => s.activityByDate);
  const completedHabitNamesByDate = useGameStore((s) => s.completedHabitNamesByDate);
  const sageChatMessages = useGameStore((s) => s.sageChatMessages);
  const equippedRelicId = useGameStore((s) => s.equippedRelicId);
  const habits = useGameStore((s) => s.habits);
  const tasksCompletedToday = useGameStore((s) => s.tasksCompletedToday);
  const addGold = useGameStore((s) => s.addGold);

  const [statsTab, setStatsTab] = useState<StatsTab>("stats");
  const [claimedQuestIds, setClaimedQuestIds] = useState<Set<string>>(() => new Set());
  const [chroniclesOpen, setChroniclesOpen] = useState(false);

  const playerLevel = getPlayerLevel();
  const currentLevelXP = getCurrentLevelXP();
  const xpForNext = getXPForNextLevel();
  const xpProgress = xpForNext > 0 ? currentLevelXP / xpForNext : 0;

  const displayName = useMemo(() => {
    const title = bestUnlockedTitleName(unlockedTitleIds);
    if (title) return title;
    const nick = heroDisplayName?.trim();
    if (nick) return nick;
    if (playerClass) return CLASS_EPITHET[playerClass];
    return "The Wayfarer";
  }, [unlockedTitleIds, heroDisplayName, playerClass]);

  const joinedDateLabel = useMemo(() => {
    const keys = Object.keys(activityByDate).filter(Boolean).sort();
    if (keys.length === 0) return "— first log pending";
    return formatDateKey(keys[0]!);
  }, [activityByDate]);

  const bossesKilled =
    completedStrengthQuests + completedAgilityQuests + completedIntelligenceQuests;

  const quests: QuestDef[] = useMemo(() => {
    const visitedSage = sageChatMessages.some((m) => m.role === "user");
    const relicEquipped = equippedRelicId != null;
    const habitToday = habits.some((h) => h.completedToday) || tasksCompletedToday > 0;

    return [
      {
        id: "visit_sage",
        title: "Visit the Sage",
        rewardGold: 15,
        progress: visitedSage ? 100 : 0,
      },
      {
        id: "change_relic",
        title: "Change your relic",
        rewardGold: 20,
        progress: relicEquipped ? 100 : 0,
      },
      {
        id: "complete_today",
        title: "Complete a habit today",
        rewardGold: 25,
        progress: habitToday ? 100 : 0,
      },
    ];
  }, [sageChatMessages, equippedRelicId, habits, tasksCompletedToday]);

  const claimQuest = useCallback(
    (id: string, reward: number) => {
      if (claimedQuestIds.has(id)) return;
      addGold(reward);
      setClaimedQuestIds((prev) => new Set(prev).add(id));
      impactAsync(ImpactFeedbackStyle.Medium);
      notificationAsync(NotificationFeedbackType.Success);
    },
    [addGold, claimedQuestIds],
  );

  return (
    <LinearGradient
      colors={["#1a1228", "#120c1c", "#0a0810"]}
      style={styles.gradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Hero</Text>

          {/* Module 1 — Hero header */}
          <View style={styles.headerBlock}>
            <CircularProgress
              progress={xpProgress}
              size={96}
              strokeWidth={4}
              color={Colors.dark.gold}
              backgroundColor={Colors.dark.border}
            >
              <View style={styles.avatarRing}>
                <Text style={styles.avatarEmoji}>🧙‍♂️</Text>
              </View>
            </CircularProgress>
            <Text style={styles.heroName} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={styles.heroLevel}>Level {playerLevel}</Text>
          </View>

          {/* Module 2 — Stats & Overview */}
          <View style={[styles.card, { width: cardMaxW, alignSelf: "center" }]}>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setStatsTab("stats");
                }}
                style={[
                  styles.toggleBtn,
                  statsTab === "stats" && styles.toggleBtnActive,
                ]}
              >
                <Text style={[styles.toggleText, statsTab === "stats" && styles.toggleTextActive]}>
                  Stats
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setStatsTab("overview");
                }}
                style={[
                  styles.toggleBtn,
                  statsTab === "overview" && styles.toggleBtnActive,
                ]}
              >
                <Text
                  style={[styles.toggleText, statsTab === "overview" && styles.toggleTextActive]}
                >
                  Overview
                </Text>
              </Pressable>
            </View>

            {statsTab === "stats" ? (
              <HeroHexRadarChart size={Math.min(240, cardMaxW - 36)} />
            ) : (
              <View style={styles.overviewBlock}>
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Total bosses defeated (lifetime)</Text>
                  <Text style={styles.overviewValue}>{bossesKilled}</Text>
                </View>
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Days survived (streak)</Text>
                  <Text style={styles.overviewValue}>{streak}</Text>
                </View>
                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Joined (first activity)</Text>
                  <Text style={styles.overviewValue}>{joinedDateLabel}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Module 3 — Equipment */}
          <View style={[styles.section, { width: cardMaxW, alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>Equipment</Text>
            <View style={styles.equipmentCard}>
              <BackpackInventoryBody scrollable={false} contentWidth={cardMaxW - 28} />
            </View>
          </View>

          {/* Module 4 — Chronicles */}
          <View style={[styles.section, { width: cardMaxW, alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>Chronicles</Text>
            <View style={styles.chroniclesCard}>
              <ActivityHeatmap activityByDate={activityByDate} embedded title="Habit map" />
            </View>
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setChroniclesOpen(true);
              }}
              style={({ pressed }) => [styles.chroniclesCta, pressed && styles.chroniclesCtaPressed]}
            >
              <Text style={styles.chroniclesCtaText}>View detailed chronicles</Text>
            </Pressable>
          </View>

          {/* Module 5 — Daily quests */}
          <View style={[styles.section, styles.lastSection, { width: cardMaxW, alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>Daily Quests</Text>
            {quests.map((q) => {
              const pct = Math.min(100, Math.max(0, q.progress));
              const canClaim = pct >= 100 && !claimedQuestIds.has(q.id);
              const claimed = claimedQuestIds.has(q.id);
              return (
                <View key={q.id} style={styles.questCard}>
                  <View style={styles.questTop}>
                    <Text style={styles.questTitle}>{q.title}</Text>
                    <Text style={styles.questPct}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                  <Pressable
                    disabled={!canClaim}
                    onPress={() => claimQuest(q.id, q.rewardGold)}
                    style={({ pressed }) => [
                      styles.claimBtn,
                      !canClaim && styles.claimBtnDisabled,
                      pressed && canClaim && styles.claimBtnPressed,
                    ]}
                  >
                    <Text style={[styles.claimBtnText, !canClaim && styles.claimBtnTextMuted]}>
                      {claimed ? "Claimed" : canClaim ? "Claim" : "In progress"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <ActivityChroniclesModal
          visible={chroniclesOpen}
          onClose={() => setChroniclesOpen(false)}
          activityByDate={activityByDate ?? {}}
          completedHabitNamesByDate={completedHabitNamesByDate ?? {}}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 2,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  headerBlock: {
    alignItems: "center" as const,
    marginBottom: 28,
  },
  avatarRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 40,
  },
  heroName: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
    letterSpacing: 0.3,
    paddingHorizontal: 12,
  },
  heroLevel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: Colors.dark.surface + "cc",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: Colors.dark.background + "cc",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center" as const,
  },
  toggleBtnActive: {
    backgroundColor: Colors.dark.gold + "28",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "55",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
  },
  toggleTextActive: {
    color: Colors.dark.gold,
  },
  overviewBlock: {
    gap: 14,
    paddingVertical: 8,
  },
  overviewRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "55",
  },
  overviewLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginBottom: 12,
    marginLeft: 4,
  },
  equipmentCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: Colors.dark.background + "ee",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  chroniclesCard: {
    borderRadius: 20,
    padding: 14,
    paddingBottom: 10,
    backgroundColor: Colors.dark.background + "ee",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  chroniclesCta: {
    marginTop: 14,
    width: "100%" as const,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: Colors.dark.emerald + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.emerald + "55",
    alignItems: "center" as const,
  },
  chroniclesCtaPressed: {
    opacity: 0.9,
  },
  chroniclesCtaText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.emerald,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  questCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: Colors.dark.surface + "aa",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  questTop: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  questTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginRight: 8,
  },
  questPct: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    overflow: "hidden" as const,
    marginBottom: 12,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 5,
    backgroundColor: Colors.dark.gold,
  },
  claimBtn: {
    alignSelf: "flex-end" as const,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.dark.gold,
  },
  claimBtnDisabled: {
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  claimBtnPressed: {
    opacity: 0.88,
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#1a1228",
  },
  claimBtnTextMuted: {
    color: Colors.dark.textMuted,
    fontWeight: "700" as const,
  },
});
