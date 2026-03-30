import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollText } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { TITLE_DEFINITIONS } from "@/constants/titles";
import type { PlayerClass } from "@/types/game";
import HeroHexRadarChart from "@/components/HeroHexRadarChart";
import BackpackInventoryBody from "@/components/BackpackInventoryBody";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import DayQuestLogReadOnly from "@/components/DayQuestLogReadOnly";
import ActivityChroniclesModal from "@/components/ActivityChroniclesModal";
import CircularProgress from "@/components/CircularProgress";
import HeroQuestTimeline from "@/components/HeroQuestTimeline";
import { HERO_DAILY_RITUALS, HERO_EPIC_MILESTONES } from "@/constants/heroQuestSystem";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useAuth } from "@/providers/AuthProvider";

const CLASS_EPITHET: Record<PlayerClass, string> = {
  warrior: "The Iron Vanguard",
  hunter: "The Shadowblade",
  mage: "The Mindbinder",
  paladin: "The Dawnwarden",
};

type StatsTab = "stats" | "overview";

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

function calendarYesterdayKey(): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y.toISOString().split("T")[0]!;
}

function calendarTomorrowKey(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().split("T")[0]!;
}

function formatRemainingToNextMidnight(now: Date): string {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const ms = Math.max(0, next.getTime() - now.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function seededOrderForDay<T extends { id: string }>(items: T[], dayKey: string): T[] {
  const seed = dayKey
    .split("")
    .reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
  return [...items]
    .map((item) => {
      const h = item.id
        .split("")
        .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, seed);
      return { item, h };
    })
    .sort((a, b) => a.h - b.h)
    .map((x) => x.item);
}

export default function HeroScreen() {
  const { width } = useWindowDimensions();
  const cardMaxW = Math.min(width - 32, 420);
  const { user } = useAuth();

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
  const reflectionSavedDateKeys = useGameStore((s) => s.reflectionSavedDateKeys);
  const heroShopPurchaseEver = useGameStore((s) => s.heroShopPurchaseEver);
  const sageEpicRerollsUsedToday = useGameStore((s) => s.sageEpicRerollsUsedToday);
  const planningDayOrderByDate = useGameStore((s) => s.planningDayOrderByDate);
  const heroDailyQuestClaimsDate = useGameStore((s) => s.heroDailyQuestClaimsDate);
  const heroDailyQuestClaimedIds = useGameStore((s) => s.heroDailyQuestClaimedIds);
  const heroEpicMilestoneClaimedIds = useGameStore((s) => s.heroEpicMilestoneClaimedIds);
  const claimHeroDailyQuest = useGameStore((s) => s.claimHeroDailyQuest);
  const claimHeroEpicMilestone = useGameStore((s) => s.claimHeroEpicMilestone);

  const [statsTab, setStatsTab] = useState<StatsTab>("stats");
  const [chroniclesOpen, setChroniclesOpen] = useState(false);
  const [chronicleHeatmapDate, setChronicleHeatmapDate] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => new Date());

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

  const todayKey = useMemo(() => nowTick.toISOString().split("T")[0]!, [nowTick]);
  const nextDailyResetCountdown = useMemo(() => formatRemainingToNextMidnight(nowTick), [nowTick]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dailyQuestRows = useMemo(() => {
    const visitedSage = sageChatMessages.some((m) => m.role === "user");
    const habitToday = habits.some((h) => h.completedToday) || tasksCompletedToday > 0;
    const reflectionToday = !!reflectionSavedDateKeys[todayKey];
    const yKey = calendarYesterdayKey();
    const reflectionYesterday = !!reflectionSavedDateKeys[yKey];
    const reflectionAnyRecent = reflectionToday || reflectionYesterday;
    const tomorrowKey = calendarTomorrowKey();
    const plannedTomorrow =
      (planningDayOrderByDate[tomorrowKey]?.length ?? 0) > 0 ||
      habits.some((h) => h.isActive && h.scheduledDate === tomorrowKey);
    const claimedIds =
      heroDailyQuestClaimsDate === todayKey ? heroDailyQuestClaimedIds : [];

    const completeById: Record<string, boolean> = {
      daily_visit_sage: visitedSage,
      daily_complete_quest: habitToday,
      daily_affirmations: visitedSage,
      daily_gratitude: visitedSage,
      daily_mood: reflectionAnyRecent,
      daily_reflection: reflectionAnyRecent,
      daily_refresh_epic: sageEpicRerollsUsedToday > 0,
      daily_plan_tomorrow: plannedTomorrow,
      daily_spend_gold: heroShopPurchaseEver,
      daily_save_progress: true,
    };

    const trackableDailyRituals = HERO_DAILY_RITUALS.filter((def) =>
      Object.prototype.hasOwnProperty.call(completeById, def.id),
    );
    const rotatedDailyRituals = seededOrderForDay(trackableDailyRituals, todayKey).slice(0, 4);

    return rotatedDailyRituals.map((def) => ({
      def,
      objectiveComplete: completeById[def.id] ?? false,
      claimed: claimedIds.includes(def.id),
    }));
  }, [
    sageChatMessages,
    habits,
    tasksCompletedToday,
    reflectionSavedDateKeys,
    planningDayOrderByDate,
    sageEpicRerollsUsedToday,
    heroShopPurchaseEver,
    heroDailyQuestClaimsDate,
    heroDailyQuestClaimedIds,
    todayKey,
  ]);

  const epicQuestRows = useMemo(() => {
    const hasEmail = !!(user?.email && user.email.trim().length > 0);
    const completeById: Record<string, boolean> = {
      epic_bind_email: hasEmail,
      epic_first_market_trade: heroShopPurchaseEver,
      epic_bind_relic: equippedRelicId != null,
    };

    return HERO_EPIC_MILESTONES.map((def) => ({
      def,
      objectiveComplete: completeById[def.id] ?? false,
      claimed: heroEpicMilestoneClaimedIds.includes(def.id),
    }));
  }, [user?.email, heroShopPurchaseEver, equippedRelicId, heroEpicMilestoneClaimedIds]);

  const onClaimDaily = useCallback(
    (def: (typeof HERO_DAILY_RITUALS)[number]) => {
      return claimHeroDailyQuest(def.id, def.rewardGold, def.rewardXP);
    },
    [claimHeroDailyQuest],
  );

  const onClaimEpic = useCallback(
    (def: (typeof HERO_EPIC_MILESTONES)[number]) => {
      return claimHeroEpicMilestone(def.id, def.rewardGold, def.rewardXP);
    },
    [claimHeroEpicMilestone],
  );

  const radarChartSize = Math.min(240, cardMaxW - 36);
  /**
   * HeroHexRadarChart uses pad=36 → rendered frame is (size + 72) tall. Reserve that full height so Stats is never clipped.
   * Overview shares the same box (absolute layers); extra vertical space centers the shorter overview content.
   */
  const radarFrameHeight = radarChartSize + 72;
  const statsOverviewFixedHeight = Math.max(radarFrameHeight + 12, 260);

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

            <View style={[styles.statsOverviewBody, { height: statsOverviewFixedHeight }]}>
              <View
                style={[styles.statsOverviewLayer, statsTab === "stats" ? styles.statsOverviewLayerVisible : styles.statsOverviewLayerHidden]}
                pointerEvents={statsTab === "stats" ? "auto" : "none"}
              >
                <View style={styles.statsTabPaneInner}>
                  <HeroHexRadarChart size={radarChartSize} />
                </View>
              </View>
              <View
                style={[styles.statsOverviewLayer, statsTab === "overview" ? styles.statsOverviewLayerVisible : styles.statsOverviewLayerHidden]}
                pointerEvents={statsTab === "overview" ? "auto" : "none"}
              >
                <View style={styles.overviewTabPaneInner}>
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
                </View>
              </View>
            </View>
          </View>

          {/* Module 3 — Equipment */}
          <View style={[styles.section, { width: cardMaxW, alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>Equipment</Text>
            <View style={styles.equipmentCard}>
              <BackpackInventoryBody scrollable={false} contentWidth={cardMaxW - 28} />
            </View>
          </View>

          {/* Module 4 — Hero quest timeline (daily rituals + epic milestones) */}
          <View style={[styles.section, { width: cardMaxW, alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>Ścieżka bohatera</Text>
            <Text style={styles.questIntro}>
              Splataj codzienne rytuały i epickie kamienie milowe — każdy węzeł to krok przez mrok ku potędze.
            </Text>
            <HeroQuestTimeline
              dailyRows={dailyQuestRows}
              epicRows={epicQuestRows}
              onClaimDaily={onClaimDaily}
              onClaimEpic={onClaimEpic}
              dailyResetCountdown={nextDailyResetCountdown}
            />
          </View>

          {/* Module 5 — Chronicles */}
          <View style={[styles.section, styles.lastSection, { width: cardMaxW, alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>Chronicles</Text>
            <View style={styles.chroniclesCard}>
              <ActivityHeatmap
                activityByDate={activityByDate}
                embedded
                title="Habit map"
                selectedDate={chronicleHeatmapDate}
                onSelectDate={setChronicleHeatmapDate}
              />
              {chronicleHeatmapDate ? (
                <View style={styles.chronicleQuestLog}>
                  <DayQuestLogReadOnly dateKey={chronicleHeatmapDate} showTitle={false} />
                </View>
              ) : (
                <Text style={styles.chronicleHeatmapHint}>
                  Tap a day on the map to open its quest log.
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setChroniclesOpen(true);
              }}
              style={({ pressed }) => [styles.chroniclesCta, pressed && styles.chroniclesCtaPressed]}
            >
              <ScrollText size={20} color={Colors.dark.emerald} strokeWidth={2.2} />
              <Text style={styles.chroniclesCtaText}>View detailed chronicles</Text>
            </Pressable>
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
  statsOverviewBody: {
    position: "relative" as const,
    width: "100%" as const,
    overflow: "hidden" as const,
  },
  statsOverviewLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  statsOverviewLayerVisible: {
    opacity: 1,
  },
  statsOverviewLayerHidden: {
    opacity: 0,
  },
  statsTabPaneInner: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    paddingTop: 4,
  },
  overviewTabPaneInner: {
    flex: 1,
    justifyContent: "center" as const,
    paddingVertical: 8,
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
    gap: 12,
  },
  chronicleQuestLog: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border + "66",
  },
  chronicleHeatmapHint: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    lineHeight: 17,
    marginTop: 4,
  },
  chroniclesCta: {
    marginTop: 14,
    width: "100%" as const,
    flexDirection: "row" as const,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: Colors.dark.emerald + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.emerald + "55",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
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
  questIntro: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.dark.textMuted,
    fontWeight: "600" as const,
    marginBottom: 18,
    marginLeft: 4,
    marginRight: 4,
  },
});
