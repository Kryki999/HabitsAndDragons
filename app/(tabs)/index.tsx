import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, Zap, BookOpen, Plus, Mail, Settings, Coins, KeyRound, Backpack, ScrollText } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { StatType, TimeOfDay, HabitDifficulty } from '@/types/game';
import { getXPProgressInCurrentLevel } from '@/lib/playerLevel';
import HabitCard from '@/components/HabitCard';
import AddHabitModal from '@/components/AddHabitModal';
import CircularProgress from '@/components/CircularProgress';
import LivingDiorama from '@/components/LivingDiorama';
import BackpackModal from '@/components/BackpackModal';
import ActivityChroniclesModal from '@/components/ActivityChroniclesModal';
import SettingsModal from '@/components/SettingsModal';
import MailboxModal from '@/components/MailboxModal';

const { width } = Dimensions.get('window');

const STAT_CONFIG: Record<StatType, { color: string; label: string; icon: typeof Swords }> = {
  strength: { color: Colors.dark.ruby, label: 'STR', icon: Swords },
  agility: { color: Colors.dark.emerald, label: 'AGI', icon: Zap },
  intelligence: { color: Colors.dark.cyan, label: 'INT', icon: BookOpen },
};

const TIME_LABELS: Record<TimeOfDay, { label: string; emoji: string }> = {
  morning: { label: 'Morning Rituals', emoji: '🌅' },
  day: { label: 'Daytime Challenges', emoji: '☀️' },
  evening: { label: 'Evening Quests', emoji: '🌙' },
};

const CASTLE_TIERS = [
  { minLevel: 1, namePl: 'Skromny Namiot', emoji: '🏕️', desc: 'Skromny początek przygody' },
  { minLevel: 3, namePl: 'Drewniana Wieża', emoji: '🪵', desc: 'Pierwsze palisady i wieżyczka strażnicza' },
  { minLevel: 5, namePl: 'Warowny Bastion', emoji: '🏯', desc: 'Mury rosną w górę — bezpieczniejszy obóz' },
  { minLevel: 8, namePl: 'Wielki Zamek', emoji: '⚔️', desc: 'Królestwo nabiera majestatu' },
  { minLevel: 12, namePl: 'Smocza Forteca', emoji: '🐉', desc: 'Legendy rodzą się w cieniu smoków' },
];

function getCastleTier(level: number) {
  let tier = CASTLE_TIERS[0];
  for (const t of CASTLE_TIERS) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}

function StatRing({ stat, xp, delay }: { stat: StatType; xp: number; delay: number }) {
  const cfg = STAT_CONFIG[stat];
  const getStatLevel = useGameStore(s => s.getStatLevel);
  const level = getStatLevel(stat);
  const entryAnim = useRef(new Animated.Value(0)).current;

  const xpInLevel = useMemo(() => {
    const { current, needed } = getXPProgressInCurrentLevel(xp);
    return needed > 0 ? Math.min(current / needed, 1) : 0;
  }, [xp]);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(entryAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [xpInLevel]);

  return (
    <Animated.View style={[styles.statRingContainer, {
      opacity: entryAnim,
      transform: [{ scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
    }]}>
      <CircularProgress
        progress={xpInLevel}
        size={42}
        strokeWidth={2.5}
        color={cfg.color}
        backgroundColor={Colors.dark.surfaceLight}
      >
        <View style={styles.statRingIcon}>
          <cfg.icon size={15} color={cfg.color} />
        </View>
      </CircularProgress>
      <View style={styles.statRingLabelContainer}>
        <Text style={[styles.statRingLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.statRingLevel}>Lv.{level}</Text>
      </View>
    </Animated.View>
  );
}

export default function CastleScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [chroniclesOpen, setChroniclesOpen] = useState(false);
  const {
    gold, streak, habits, strengthXP, agilityXP, intelligenceXP, dungeonKeys,
    activityByDate,
    getPlayerLevel, getCurrentLevelXP, getXPForNextLevel,
    completeHabit, uncompleteHabit, addHabit, removeHabit,
  } = useGameStore();

  const playerLevel = getPlayerLevel();
  const currentLevelXP = getCurrentLevelXP();
  const xpForNext = getXPForNextLevel();
  const castleTier = getCastleTier(playerLevel);
  const xpProgress = xpForNext > 0 ? currentLevelXP / xpForNext : 0;

  const castleScaleAnim = useRef(new Animated.Value(0.8)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(headerAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      Animated.spring(castleScaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(fabPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleAddHabit = useCallback((habit: {
    name: string;
    description: string;
    stat: StatType;
    timeOfDay: TimeOfDay;
    icon: string;
    difficulty: HabitDifficulty;
  }) => {
    addHabit(habit);
  }, [addHabit]);

  const handleComplete = useCallback((id: string) => {
    completeHabit(id);
  }, [completeHabit]);

  const handleUncomplete = useCallback((id: string) => {
    uncompleteHabit(id);
  }, [uncompleteHabit]);

  const handleRemove = useCallback((id: string) => {
    removeHabit(id);
  }, [removeHabit]);

  const groupedHabits = useMemo(() => {
    const groups: Record<TimeOfDay, typeof habits> = { morning: [], day: [], evening: [] };
    habits.forEach(h => groups[h.timeOfDay].push(h));
    return groups;
  }, [habits]);

  const completedCount = useMemo(() => habits.filter(h => h.completedToday).length, [habits]);
  const totalCount = habits.length;

  return (
    <View style={styles.container}>
      {/* Absolute Top HUD */}
      <Animated.View style={[styles.hudContainer, {
        paddingTop: Math.max(insets.top, 10),
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }]}>
        <View style={styles.hudRow}>
          {/* Left: Avatar & Name */}
          <View style={styles.hudLeft}>
            <CircularProgress
              progress={xpProgress}
              size={40}
              strokeWidth={3}
              color={Colors.dark.gold}
              backgroundColor={Colors.dark.border}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>🧙‍♂️</Text>
              </View>
            </CircularProgress>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>Player</Text>
              <Text style={styles.playerLevelText}>Lv.{playerLevel}</Text>
            </View>
          </View>

          {/* Center: Pill Badges */}
          <View style={styles.pillBadgesContainer}>
            <View style={styles.pillBadge}>
              <Coins color={Colors.dark.gold} size={14} />
              <Text style={styles.pillValue}>{gold}</Text>
            </View>
            <View style={styles.pillBadge}>
              <KeyRound color={Colors.dark.cyan} size={14} />
              <Text style={[styles.pillValue, { color: Colors.dark.cyan }]}>{dungeonKeys}</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillEmoji}>🔥</Text>
              <Text style={[styles.pillValue, { color: Colors.dark.fire }]}>{streak}</Text>
            </View>
          </View>

          {/* Right: Icons */}
          <View style={styles.hudRight}>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setMailboxOpen(true);
              }}
            >
              <Mail color={Colors.dark.text} size={20} />
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setSettingsOpen(true);
              }}
            >
              <Settings color={Colors.dark.text} size={20} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Living Diorama Component */}
        <Animated.View style={{ transform: [{ scale: castleScaleAnim }] }}>
          <LivingDiorama />
        </Animated.View>

        <Animated.View style={[styles.castleCaptionBlock, { opacity: headerAnim }]}>
          <LinearGradient
            colors={['#1a1528', '#120e1a']}
            style={styles.castleCaptionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.castleCaptionLevel}>Poziom {playerLevel}</Text>
            <Text style={styles.castleCaptionTitle}>
              {castleTier.emoji} {castleTier.namePl}
            </Text>
            <Text style={styles.castleCaptionDesc}>{castleTier.desc}</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.dashboardRow, { opacity: headerAnim }]}>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setChroniclesOpen(true);
            }}
            style={({ pressed }) => [styles.dashboardCardOuter, pressed && styles.dashboardCardPressed]}
          >
            <LinearGradient
              colors={['#152820', '#0f1a14']}
              style={styles.dashboardCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.dashboardIconCircle}>
                <ScrollText color={Colors.dark.emerald} size={22} strokeWidth={2.2} />
              </View>
              <Text style={styles.dashboardCardTitle}>Kroniki</Text>
              <Text style={styles.dashboardCardSub}>Historia aktywności</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setBackpackOpen(true);
            }}
            style={({ pressed }) => [styles.dashboardCardOuter, pressed && styles.dashboardCardPressed]}
          >
            <LinearGradient
              colors={[Colors.dark.surfaceLight, Colors.dark.surface]}
              style={styles.dashboardCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.dashboardIconCircle, styles.dashboardIconCircleGold]}>
                <Backpack color={Colors.dark.gold} size={22} strokeWidth={2.2} />
              </View>
              <Text style={styles.dashboardCardTitle}>Ekwipunek</Text>
              <Text style={styles.dashboardCardSub}>Łup z lochów</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Stat Hub */}
        <Animated.View style={[styles.statHubContainer, {
          opacity: headerAnim,
        }]}>
          <StatRing stat="strength" xp={strengthXP} delay={200} />
          <StatRing stat="agility" xp={agilityXP} delay={350} />
          <StatRing stat="intelligence" xp={intelligenceXP} delay={500} />
        </Animated.View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerBadge}>
            <Text style={styles.dividerText}>
              {totalCount > 0 ? `${completedCount}/${totalCount} QUESTS` : 'DAILY QUESTS'}
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.habitsSection}>
          {totalCount === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚔️</Text>
              <Text style={styles.emptyTitle}>No Quests Yet</Text>
              <Text style={styles.emptyDesc}>Tap the + button to forge your first daily habit</Text>
            </View>
          ) : (
            (['morning', 'day', 'evening'] as TimeOfDay[]).map(time => {
              const group = groupedHabits[time];
              if (group.length === 0) return null;
              const timeCfg = TIME_LABELS[time];
              return (
                <View key={time} style={styles.timeGroup}>
                  <Text style={styles.timeGroupHeader}>
                    {timeCfg.emoji} {timeCfg.label}
                  </Text>
                  {group.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onComplete={handleComplete}
                      onUncomplete={handleUncomplete}
                      onDelete={handleRemove}
                    />
                  ))}
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabPulse }] }]}>
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Heavy);
            setModalVisible(true);
          }}
          testID="add-habit-fab"
        >
          <LinearGradient
            colors={[...Colors.gradients.gold]}
            style={styles.fab}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Plus size={28} color="#1a1228" strokeWidth={3} />
          </LinearGradient>
          <View style={styles.fabShadow} />
        </Pressable>
      </Animated.View>

      <AddHabitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddHabit={handleAddHabit}
      />

      <BackpackModal visible={backpackOpen} onClose={() => setBackpackOpen(false)} />

      <ActivityChroniclesModal
        visible={chroniclesOpen}
        onClose={() => setChroniclesOpen(false)}
        activityByDate={activityByDate ?? {}}
      />

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <MailboxModal visible={mailboxOpen} onClose={() => setMailboxOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },

  // --- HUD Styles ---
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '50',
    backgroundColor: Colors.dark.surface + 'e6',
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1, // allow truncation if needed
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  playerInfo: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  playerName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 0,
  },
  playerLevelText: {
    color: Colors.dark.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  hudRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.ruby,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceLight,
  },
  pillBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: 'center',
    gap: 4,
  },
  pillEmoji: {
    fontSize: 12,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.dark.gold,
  },

  castleCaptionBlock: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
  },
  dashboardRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 14,
  },
  dashboardCardOuter: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border + 'aa',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  dashboardCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  dashboardCardGradient: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
  },
  dashboardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.dark.background + 'cc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.emerald + '35',
  },
  dashboardIconCircleGold: {
    borderColor: Colors.dark.gold + '35',
  },
  dashboardCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  dashboardCardSub: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  castleCaptionGradient: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border + '88',
    alignItems: 'center',
  },
  castleCaptionLevel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.gold,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  castleCaptionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  castleCaptionDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // --- Stat Hub Styles ---
  statHubContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  statRingContainer: {
    alignItems: 'center',
    width: 80,
  },
  statRingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statRingLabelContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  statRingLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statRingLevel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginTop: 1,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerBadge: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
  },
  habitsSection: {
    paddingHorizontal: 20,
  },
  timeGroup: {
    marginBottom: 12,
  },
  timeGroupHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabShadow: {
    position: 'absolute',
    bottom: -3,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.goldDark,
  },
});
