import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { Check, Swords, Zap, BookOpen, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Habit, StatType, HabitDifficulty } from '@/types/game';

const DIFF_SHORT: Record<HabitDifficulty, string> = {
  easy: 'E',
  medium: 'M',
  hard: 'H',
};

const STAT_CONFIG: Record<StatType, { color: string; label: string; icon: typeof Swords }> = {
  strength: { color: Colors.dark.ruby, label: 'STR', icon: Swords },
  agility: { color: Colors.dark.emerald, label: 'AGI', icon: Zap },
  intelligence: { color: Colors.dark.cyan, label: 'INT', icon: BookOpen },
};

interface HabitCardProps {
  habit: Habit;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function HabitCard({ habit, onComplete, onUncomplete, onDelete }: HabitCardProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(habit.completedToday ? 1 : 0)).current;
  const statCfg = STAT_CONFIG[habit.stat];
  const diffKey = (habit.difficulty ?? 'medium') as HabitDifficulty;

  const handlePressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (habit.completedToday) {
      onUncomplete(habit.id);
      Animated.spring(checkAnim, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      onComplete(habit.id);
      Animated.sequence([
        Animated.spring(checkAnim, {
          toValue: 1.2,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(checkAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [habit.completedToday, habit.id, onComplete, onUncomplete, checkAnim]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete(habit.id);
  }, [habit.id, onDelete]);

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  const bottomBorderHeight = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [5, 1],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      testID={`habit-card-${habit.id}`}
    >
      <Animated.View
        style={[
          styles.cardOuter,
          {
            transform: [{ translateY }],
            borderColor: habit.completedToday ? statCfg.color + '50' : Colors.dark.border,
          },
        ]}
      >
        <View style={[
          styles.cardInner,
          habit.completedToday && { backgroundColor: statCfg.color + '10' },
        ]}>
          <View style={styles.cardLeft}>
            <Text style={styles.habitIcon}>{habit.icon}</Text>
            <View style={styles.habitInfo}>
              <Text style={[
                styles.habitName,
                habit.completedToday && styles.habitNameCompleted,
              ]}>
                {habit.name}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.statBadge}>
                  <statCfg.icon size={10} color={statCfg.color} />
                  <Text style={[styles.statBadgeText, { color: statCfg.color }]}>
                    +{statCfg.label}
                  </Text>
                </View>
                <Text style={styles.diffBadge}>{DIFF_SHORT[diffKey]}</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Pressable
              onPress={handleDelete}
              hitSlop={10}
              style={styles.deleteBtn}
              testID={`habit-delete-${habit.id}`}
            >
              <Trash2 size={14} color={Colors.dark.textMuted} />
            </Pressable>
            <Animated.View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: habit.completedToday ? statCfg.color : 'transparent',
                  borderColor: habit.completedToday ? statCfg.color : Colors.dark.border,
                  transform: [{ scale: checkAnim.interpolate({
                    inputRange: [0, 1, 1.2],
                    outputRange: [1, 1, 1.15],
                  }) }],
                },
              ]}
            >
              {habit.completedToday && (
                <Check size={14} color="#fff" strokeWidth={3} />
              )}
            </Animated.View>
          </View>
        </View>
        <Animated.View
          style={[
            styles.cardBottom,
            {
              height: bottomBorderHeight,
              backgroundColor: habit.completedToday ? statCfg.color + '60' : Colors.dark.border,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export default React.memo(HabitCard);

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden' as const,
    marginBottom: 10,
    backgroundColor: Colors.dark.surface,
  },
  cardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  habitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 3,
  },
  habitNameCompleted: {
    opacity: 0.6,
    textDecorationLine: 'line-through' as const,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  diffBadge: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: Colors.dark.textMuted,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  cardRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
    opacity: 0.5,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardBottom: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});
