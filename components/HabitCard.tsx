import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Check, Coins } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import Colors from '@/constants/colors';
import { Habit, HabitDifficulty } from '@/types/game';
import { DIFFICULTY_BASE_REWARDS } from '@/lib/economy';
import TaskCardOverlay, { CardMetrics } from '@/components/TaskCardOverlay';

const ACCENT = Colors.dark.gold;

// ─── Types ────────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (habit: Habit) => void;
  onReschedule?: (habit: Habit) => void;
  /** Past-day castle view: no edit, delete, or toggle. */
  readOnly?: boolean;
  /** When read-only, show whether this habit was completed on the viewed day (chronicles). */
  historicalCompleted?: boolean;
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  onComplete,
  onUncomplete,
  onDelete,
  onEdit,
  onReschedule,
  readOnly,
  historicalCompleted,
}: HabitCardProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [cardMetrics, setCardMetrics] = useState<CardMetrics | null>(null);
  // Ref attached to the card's outer View for position measurement
  const cardRef = useRef<View>(null);
  // Lazy-mount: TaskCardOverlay is added to the tree only on first tap and then
  // kept alive. Closing just sets visible=false on the inner Modal (native hide,
  // near-free) instead of destroying & rebuilding the entire native view tree on
  // every close — which is what caused the brief freeze after landing.
  const hasOpenedRef = useRef(false);
  if (overlayOpen) hasOpenedRef.current = true;

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

  // Tapping the card body → measure position, then open overlay
  const handleCardPress = useCallback(() => {
    if (readOnly || habit.isFrozen) return;
    impactAsync(ImpactFeedbackStyle.Light);
    cardRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setCardMetrics({ x: pageX, y: pageY, width, height });
      setOverlayOpen(true);
    });
  }, [readOnly, habit.isFrozen]);

  // Tapping the checkbox directly → complete/uncomplete (no card animation conflict)
  const handleCheckboxPress = useCallback(() => {
    if (readOnly || habit.isFrozen) return;
    impactAsync(ImpactFeedbackStyle.Heavy);
    if (habit.completedToday) {
      onUncomplete(habit.id);
      Animated.spring(checkAnim, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }).start();
    } else {
      onComplete(habit.id);
      Animated.sequence([
        Animated.spring(checkAnim, { toValue: 1.2, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.spring(checkAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [readOnly, habit.completedToday, habit.id, habit.isFrozen, onComplete, onUncomplete, checkAnim]);

  return (
    <>
      <Pressable
        onPress={handleCardPress}
        disabled={readOnly || habit.isFrozen || overlayOpen}
        testID={`habit-card-${habit.id}`}
      >
        <View
          ref={cardRef}
          collapsable={false}
          style={[
            styles.cardOuter,
            {
              // "Hole in list": card is invisible while the overlay is animating.
              // Reappears in the same render cycle when onClose sets overlayOpen=false.
              opacity: overlayOpen ? 0 : 1,
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
            {/* Left: icon + name */}
            <View style={styles.cardLeft}>
              <Text style={styles.habitIcon}>{habit.icon}</Text>
              <View style={styles.habitInfo}>
                <Text style={[
                  styles.habitName,
                  displayCompleted && styles.habitNameCompleted,
                ]}>
                  {habit.name}
                </Text>
                {habit.isFrozen ? (
                  <Text style={styles.frozenBadge}>FROZEN</Text>
                ) : null}
              </View>
            </View>

            {/* Right: vertical rewards + checkbox */}
            <View style={styles.cardRight}>
              {/* Vertical reward stack */}
              <View style={styles.rewardStack}>
                <View style={styles.rewardRow}>
                  <Text style={styles.rewardXP}>+{baseReward.xp} XP</Text>
                </View>
                <View style={styles.rewardRow}>
                  <Text style={styles.rewardGold}>+{baseReward.gold}</Text>
                  <Coins size={10} color={Colors.dark.gold} strokeWidth={2.5} />
                </View>
              </View>

              {/* Checkbox — separate tap zone */}
              <Pressable
                onPress={handleCheckboxPress}
                disabled={readOnly || habit.isFrozen}
                hitSlop={8}
                testID={`habit-check-${habit.id}`}
              >
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
              </Pressable>
            </View>
          </View>
          <View
            style={[
              styles.cardBottom,
              { backgroundColor: displayCompleted ? ACCENT + '60' : Colors.dark.border },
            ]}
          />
        </View>
      </Pressable>

      {!readOnly && hasOpenedRef.current && (
        <TaskCardOverlay
          visible={overlayOpen}
          habit={habit}
          originMetrics={cardMetrics}
          onClose={() => setOverlayOpen(false)}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onDelete={onDelete}
          onEdit={onEdit}
          onReschedule={onReschedule}
        />
      )}
    </>
  );
}

export default React.memo(HabitCard);

// ─── HabitCard styles ─────────────────────────────────────────────────────────

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
    marginTop: 2,
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
  },
  habitNameCompleted: {
    opacity: 0.55,
    textDecorationLine: 'line-through' as const,
  },
  cardRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginLeft: 10,
  },
  rewardStack: {
    alignItems: 'flex-end' as const,
    gap: 4,
  },
  rewardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
  },
  rewardXP: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.dark.fire,
  },
  rewardGold: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.dark.gold,
  },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardBottom: {
    height: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});

