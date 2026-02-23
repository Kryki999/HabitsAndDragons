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
import { Swords, Zap, BookOpen, Plus, Mail, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { StatType, TimeOfDay } from '@/types/game';
import HabitCard from '@/components/HabitCard';
import AddHabitModal from '@/components/AddHabitModal';
import ClassSelectionModal from '@/components/ClassSelectionModal';
import CircularProgress from '@/components/CircularProgress';

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

function StatRing({ stat, xp, delay }: { stat: StatType; xp: number; delay: number }) {
  const cfg = STAT_CONFIG[stat];
  const getStatLevel = useGameStore(s => s.getStatLevel);
  const level = getStatLevel(stat);
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
        size={58}
        strokeWidth={4}
        color={cfg.color}
        backgroundColor={Colors.dark.surfaceLight}
      >
        <View style={styles.statRingIcon}>
          <cfg.icon size={22} color={cfg.color} />
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

  useEffect(() => {
    resetDailyHabits();
  }, [resetDailyHabits]);

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

  return (
    <View style={styles.container}>
      {/* Absolute Top HUD */}
      <Animated.View style={[styles.hudContainer, {
        paddingTop: Math.max(insets.top, 16),
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }]}>
        <View style={styles.hudTopRow}>
          {/* Left: Avatar & Name */}
          <View style={styles.hudLeft}>
            <CircularProgress
              progress={xpProgress}
              size={50}
              strokeWidth={4}
              color={Colors.dark.gold}
              backgroundColor={Colors.dark.border}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>🧙‍♂️</Text>
              </View>
            </CircularProgress>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>Player</Text>
              <Text style={styles.playerLevelText}>Lv.{playerLevel}</Text>
            </View>
          </View>

          {/* Right: Icons */}
          <View style={styles.hudRight}>
            <Pressable style={styles.iconButton}>
              <Mail color={Colors.dark.text} size={22} />
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Settings color={Colors.dark.text} size={22} />
            </Pressable>
          </View>
        </View>

        {/* Center: Pill Badges */}
        <View style={styles.pillBadgesContainer}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillEmoji}>🪙</Text>
            <Text style={styles.pillValue}>{gold}</Text>
          </View>
          <View style={styles.pillBadge}>
            <Text style={styles.pillEmoji}>🔥</Text>
            <Text style={[styles.pillValue, { color: Colors.dark.fire }]}>{streak}</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Diorama Component */}
        <Animated.View style={[styles.dioramaContainer, { transform: [{ scale: castleScaleAnim }] }]}>
          <LinearGradient
            colors={[...Colors.gradients.castle]}
            style={styles.dioramaBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.dioramaContent}>
            <Text style={styles.dioramaCastleEmoji}>{castleTier.emoji}</Text>

            <View style={styles.charactersRow}>
              <View style={styles.placeholderCharacter}>
                <Text style={styles.characterEmoji}>🧙‍♂️</Text>
                <View style={styles.characterShadow} />
              </View>
              <View style={styles.placeholderDragon}>
                <Text style={styles.dragonEmoji}>🐉</Text>
                <View style={styles.characterShadow} />
              </View>
            </View>

            <Text style={styles.dioramaCastleName}>{castleTier.name}</Text>
          </View>
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

  // --- HUD Styles ---
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '50',
    backgroundColor: Colors.dark.surface + 'e6', // Slight transparency
  },
  hudTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  playerInfo: {
    justifyContent: 'center',
  },
  playerName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  playerLevelText: {
    color: Colors.dark.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  hudRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    gap: 12,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 80,
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.dark.gold,
  },

  // --- Diorama Styles ---
  dioramaContainer: {
    marginHorizontal: 20,
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.dark.border,
    marginBottom: 20,
  },
  dioramaBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  dioramaContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dioramaCastleEmoji: {
    fontSize: 60,
    position: 'absolute',
    top: '15%',
    opacity: 0.3,
  },
  charactersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    zIndex: 2,
  },
  placeholderCharacter: {
    alignItems: 'center',
  },
  placeholderDragon: {
    alignItems: 'center',
    transform: [{ scaleX: -1 }], // flip dragon to face player
  },
  characterEmoji: {
    fontSize: 56,
  },
  dragonEmoji: {
    fontSize: 40,
  },
  characterShadow: {
    width: 30,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    marginTop: 4,
  },
  dioramaCastleName: {
    position: 'absolute',
    bottom: 12,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    marginTop: 8,
  },
  statRingLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statRingLevel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginTop: 2,
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
