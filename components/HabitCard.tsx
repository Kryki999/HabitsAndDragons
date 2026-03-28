import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Check, Trash2, Flame, Target } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import Colors from '@/constants/colors';
import { Habit, HabitDifficulty } from '@/types/game';
import { DIFFICULTY_BASE_REWARDS } from '@/lib/economy';

const ACCENT = Colors.dark.gold;

interface HabitCardProps {
  habit: Habit;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  /** Past-day castle view: no edit, delete, or toggle. */
  readOnly?: boolean;
  /** When read-only, show whether this habit was completed on the viewed day (chronicles). */
  historicalCompleted?: boolean;
}

function HabitCard({
  habit,
  onComplete,
  onUncomplete,
  onDelete,
  readOnly,
  historicalCompleted,
}: HabitCardProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const displayCompleted = readOnly ? !!historicalCompleted : habit.completedToday;
  const checkAnim = useRef(new Animated.Value(displayCompleted ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: displayCompleted ? 1 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [displayCompleted, checkAnim]);
  const diffKey = (habit.difficulty ?? 'medium') as HabitDifficulty;
  const baseReward = DIFFICULTY_BASE_REWARDS[diffKey];
  const rewardLabel = `+${baseReward.xp} XP · +${baseReward.gold} gold`;

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
    if (readOnly || habit.isFrozen) return;
    impactAsync(ImpactFeedbackStyle.Heavy);
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
  }, [readOnly, habit.completedToday, habit.id, habit.isFrozen, onComplete, onUncomplete, checkAnim]);

  const handleDelete = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
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
      onPressIn={readOnly ? undefined : handlePressIn}
      onPressOut={readOnly ? undefined : handlePressOut}
      onPress={handlePress}
      disabled={readOnly || habit.isFrozen}
      testID={`habit-card-${habit.id}`}
    >
      <Animated.View
        style={[
          styles.cardOuter,
          {
            transform: [{ translateY }],
            borderColor: habit.isFrozen
              ? Colors.dark.cyan + '60'
              : displayCompleted
                ? ACCENT + '50'
                : Colors.dark.border,
          },
        ]}
      >
        <View style={[
          styles.cardInner,
          displayCompleted && { backgroundColor: ACCENT + '10' },
          habit.isFrozen && { backgroundColor: Colors.dark.cyan + '10' },
        ]}>
          <View style={styles.cardLeft}>
            <Text style={styles.habitIcon}>{habit.icon}</Text>
            <View style={styles.habitInfo}>
              <Text style={[
                styles.habitName,
                displayCompleted && styles.habitNameCompleted,
              ]}>
                {habit.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.rewardText} numberOfLines={1}>
                  {rewardLabel}
                </Text>
                {habit.taskType === 'daily' ? (
                  <View style={styles.typeBadge}>
                    <Flame size={10} color={(habit.currentStreak ?? 0) > 0 ? Colors.dark.fire : Colors.dark.textMuted} />
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: (habit.currentStreak ?? 0) > 0 ? Colors.dark.fire : Colors.dark.textMuted },
                      ]}
                    >
                      {habit.currentStreak ?? 0}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.typeBadge}>
                    <Target size={10} color={Colors.dark.textMuted} />
                  </View>
                )}
                {habit.isFrozen ? <Text style={styles.frozenBadge}>FROZEN</Text> : null}
              </View>
            </View>
          </View>
          <View style={styles.cardRight}>
            {!readOnly ? (
              <Pressable
                onPress={handleDelete}
                hitSlop={10}
                style={styles.deleteBtn}
                testID={`habit-delete-${habit.id}`}
              >
                <Trash2 size={14} color={Colors.dark.textMuted} />
              </Pressable>
            ) : null}
            <Animated.View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: displayCompleted ? ACCENT : 'transparent',
                  borderColor: displayCompleted ? ACCENT : Colors.dark.border,
                  transform: [{ scale: checkAnim.interpolate({
                    inputRange: [0, 1, 1.2],
                    outputRange: [1, 1, 1.15],
                  }) }],
                },
              ]}
            >
              {displayCompleted && (
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
              backgroundColor: displayCompleted ? ACCENT + '60' : Colors.dark.border,
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
  frozenBadge: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: Colors.dark.cyan,
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
    flexWrap: 'wrap' as const,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.dark.textMuted,
    flexShrink: 1,
  },
  typeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
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
