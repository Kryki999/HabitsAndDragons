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
import { Swords, Zap, BookOpen, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { StatType, TimeOfDay } from '@/types/game';
import HabitCard from '@/components/HabitCard';
import AddHabitModal from '@/components/AddHabitModal';
import ClassSelectionModal from '@/components/ClassSelectionModal';

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
  { minLevel: 1, name: 'Wooden Hut', emoji: '🏚️', desc: 'A humble beginning' },
  { minLevel: 3, name: 'Stone Tower', emoji: '🏰', desc: 'Walls of stone rise' },
  { minLevel: 5, name: 'Fortified Keep', emoji: '🏯', desc: 'A bastion of strength' },
  { minLevel: 8, name: 'Grand Castle', emoji: '⚔️', desc: 'A kingdom takes shape' },
  { minLevel: 12, name: 'Dragon Fortress', emoji: '🐉', desc: 'Legends are forged here' },
];

function getCastleTier(level: number) {
  let tier = CASTLE_TIERS[0];
  for (const t of CASTLE_TIERS) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}

function StatBar({ stat, xp, delay }: { stat: StatType; xp: number; delay: number }) {
  const cfg = STAT_CONFIG[stat];
  const getStatLevel = useGameStore(s => s.getStatLevel);
  const level = getStatLevel(stat);
  const barAnim = useRef(new Animated.Value(0)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;

  const xpInLevel = useMemo(() => {
    const baseXP = 100;
    const growth = 1.4;
    let accumulated = 0;
    for (let i = 1; i < level; i++) {
      accumulated += Math.floor(baseXP * Math.pow(growth, i - 1));
    }
    const currentLevelXP = xp - accumulated;
    const neededXP = Math.floor(baseXP * Math.pow(growth, level - 1));
    return Math.min(currentLevelXP / neededXP, 1);
  }, [xp, level]);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(entryAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.timing(barAnim, { toValue: xpInLevel, duration: 800, useNativeDriver: false }),
      ]),
    ]).start();
  }, [xpInLevel]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.statBarContainer, {
      opacity: entryAnim,
      transform: [{ translateX: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
    }]}>
      <View style={[styles.statBarIcon, { backgroundColor: cfg.color + '18' }]}>
        <cfg.icon size={14} color={cfg.color} />
      </View>
      <View style={styles.statBarInfo}>
        <View style={styles.statBarHeader}>
          <Text style={[styles.statBarLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.statBarLevel}>Lv.{level}</Text>
        </View>
        <View style={styles.statBarTrack}>
          <Animated.View style={[styles.statBarFill, { width: barWidth, backgroundColor: cfg.color }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function CastleScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const {
    gold, streak, habits, strengthXP, agilityXP, intelligenceXP, playerClass,
    getPlayerLevel, getCurrentLevelXP, getXPForNextLevel,
    completeHabit, uncompleteHabit, addHabit, removeHabit, resetDailyHabits, setPlayerClass,
  } = useGameStore();

  const playerLevel = getPlayerLevel();
  const currentLevelXP = getCurrentLevelXP();
  const xpForNext = getXPForNextLevel();
  const castleTier = getCastleTier(playerLevel);
  const xpProgress = xpForNext > 0 ? currentLevelXP / xpForNext : 0;

  const castleScaleAnim = useRef(new Animated.Value(0.8)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    resetDailyHabits();
  }, []);

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

  useEffect(() => {
    Animated.timing(xpBarAnim, {
      toValue: xpProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [xpProgress]);

  const handleAddHabit = useCallback((habit: { name: string; description: string; stat: StatType; timeOfDay: TimeOfDay; icon: string }) => {
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

  const xpBarWidth = xpBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.castle]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.decorOrb1} />
      <View style={styles.decorOrb2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.kingdomSection, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={styles.topCounters}>
            <View style={styles.counterChip}>
              <Text style={styles.counterEmoji}>🪙</Text>
              <Text style={styles.counterValue}>{gold}</Text>
            </View>
            <View style={styles.counterChip}>
              <Text style={styles.counterEmoji}>🔥</Text>
              <Text style={[styles.counterValue, { color: Colors.dark.fire }]}>{streak}</Text>
            </View>
          </View>

          <Animated.View style={[styles.castleVisual, { transform: [{ scale: castleScaleAnim }] }]}>
            <View style={styles.castleEmojiWrap}>
              <Text style={styles.castleEmoji}>{castleTier.emoji}</Text>
            </View>
            <View style={styles.castleLevelBadge}>
              <LinearGradient
                colors={[...Colors.gradients.gold]}
                style={styles.castleLevelGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.castleLevelText}>LVL {playerLevel}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.castleName}>{castleTier.name}</Text>
            <Text style={styles.castleDesc}>{castleTier.desc}</Text>
          </Animated.View>

          <View style={styles.xpBarSection}>
            <View style={styles.xpBarHeader}>
              <Text style={styles.xpLabel}>TOTAL EXP</Text>
              <Text style={styles.xpNumbers}>{currentLevelXP} / {xpForNext}</Text>
            </View>
            <View style={styles.xpBarTrack}>
              <Animated.View style={[styles.xpBarFillMain]}>
                <LinearGradient
                  colors={[...Colors.gradients.gold]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, { width: xpBarWidth }]}>
                <LinearGradient
                  colors={[...Colors.gradients.gold]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <StatBar stat="strength" xp={strengthXP} delay={200} />
            <StatBar stat="agility" xp={agilityXP} delay={350} />
            <StatBar stat="intelligence" xp={intelligenceXP} delay={500} />
          </View>
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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

      <ClassSelectionModal
        visible={playerClass === null}
        onSelect={setPlayerClass}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  decorOrb1: {
    position: 'absolute' as const,
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.dark.gold + '06',
  },
  decorOrb2: {
    position: 'absolute' as const,
    top: 200,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.ruby + '04',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  kingdomSection: {
    paddingHorizontal: 20,
  },
  topCounters: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 16,
    marginBottom: 16,
  },
  counterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  counterEmoji: {
    fontSize: 18,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.dark.gold,
  },
  castleVisual: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  castleEmojiWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  castleEmoji: {
    fontSize: 42,
  },
  castleLevelBadge: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 6,
  },
  castleLevelGradient: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  castleLevelText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#1a1228',
    letterSpacing: 1.5,
  },
  castleName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  castleDesc: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  xpBarSection: {
    marginBottom: 18,
  },
  xpBarHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.dark.gold,
    letterSpacing: 1.5,
  },
  xpNumbers: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  xpBarTrack: {
    height: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 5,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  xpBarFillMain: {
    ...StyleSheet.absoluteFillObject,
    width: '0%',
    borderRadius: 5,
  },
  statsSection: {
    gap: 10,
    marginBottom: 4,
  },
  statBarContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  statBarIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statBarInfo: {
    flex: 1,
  },
  statBarHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  statBarLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  statBarLevel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.dark.textMuted,
  },
  statBarTrack: {
    height: 6,
    backgroundColor: Colors.dark.surface,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  statBarFill: {
    height: '100%' as const,
    borderRadius: 3,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    fontWeight: '800' as const,
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
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 240,
  },
  fabContainer: {
    position: 'absolute' as const,
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  fabShadow: {
    position: 'absolute' as const,
    bottom: -3,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.goldDark,
  },
});
