import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Modal,
} from 'react-native';
import { Check, Trash2, X, Edit3, Calendar, Coins, Flame } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Habit, HabitDifficulty } from '@/types/game';
import { DIFFICULTY_BASE_REWARDS } from '@/lib/economy';

const ACCENT = Colors.dark.gold;

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

// ─── Quick Action Modal ───────────────────────────────────────────────────────

function QuickActionModal({
  visible,
  habit,
  onClose,
  onComplete,
  onUncomplete,
  onDelete,
  onEdit,
  onReschedule,
}: {
  visible: boolean;
  habit: Habit;
  onClose: () => void;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (habit: Habit) => void;
  onReschedule?: (habit: Habit) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleCompletePress = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    if (habit.completedToday) {
      onUncomplete(habit.id);
    } else {
      onComplete(habit.id);
    }
    onClose();
  }, [habit, onComplete, onUncomplete, onClose]);

  const handleDelete = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onDelete(habit.id);
    onClose();
  }, [habit.id, onDelete, onClose]);

  const diffKey = (habit.difficulty ?? 'medium') as HabitDifficulty;
  const baseReward = DIFFICULTY_BASE_REWARDS[diffKey];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={qStyles.backdrop} onPress={onClose}>
        <Animated.View style={[qStyles.sheet, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={["#1e1628", "#140e20", "#0e0a16"]}
            style={qStyles.sheetGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Trash */}
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [qStyles.trashBtn, pressed && qStyles.trashBtnPressed]}
              accessibilityLabel="Delete habit"
            >
              <Trash2 size={20} color={Colors.dark.ruby} strokeWidth={2} />
            </Pressable>

            {/* Icon + Name */}
            <View style={qStyles.identity}>
              <Text style={qStyles.icon}>{habit.icon}</Text>
              <Text style={qStyles.name} numberOfLines={2}>{habit.name}</Text>
            </View>

            {/* Rewards preview */}
            <View style={qStyles.rewardRow}>
              <View style={qStyles.rewardChip}>
                <Flame size={12} color={Colors.dark.fire} strokeWidth={2.5} />
                <Text style={qStyles.rewardChipText}>+{baseReward.xp} XP</Text>
              </View>
              <View style={qStyles.rewardChipGold}>
                <Coins size={12} color={Colors.dark.gold} strokeWidth={2.5} />
                <Text style={qStyles.rewardChipGoldText}>+{baseReward.gold}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={qStyles.actionRow}>
              <Pressable
                onPress={() => { onEdit?.(habit); onClose(); }}
                style={({ pressed }) => [qStyles.secondaryBtn, pressed && qStyles.secondaryBtnPressed]}
              >
                <Edit3 size={16} color={Colors.dark.textSecondary} strokeWidth={2} />
                <Text style={qStyles.secondaryBtnText}>Edit</Text>
              </Pressable>

              <Pressable
                onPress={handleCompletePress}
                style={({ pressed }) => [qStyles.completeBtn, pressed && qStyles.completeBtnPressed]}
              >
                <LinearGradient
                  colors={habit.completedToday
                    ? [Colors.dark.border, Colors.dark.surface]
                    : [...Colors.gradients.gold]}
                  style={qStyles.completeBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Check size={18} color={habit.completedToday ? Colors.dark.textMuted : "#1a1228"} strokeWidth={3} />
                  <Text style={[qStyles.completeBtnText, habit.completedToday && qStyles.completeBtnTextDone]}>
                    {habit.completedToday ? "Undo" : "Complete"}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => { onReschedule?.(habit); onClose(); }}
                style={({ pressed }) => [qStyles.secondaryBtn, pressed && qStyles.secondaryBtnPressed]}
              >
                <Calendar size={16} color={Colors.dark.textSecondary} strokeWidth={2} />
                <Text style={qStyles.secondaryBtnText}>Reschedule</Text>
              </Pressable>
            </View>

            {/* Close */}
            <Pressable onPress={onClose} style={qStyles.closeBtn} hitSlop={8}>
              <X size={18} color={Colors.dark.textMuted} />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
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
  const [modalOpen, setModalOpen] = useState(false);
  // Lazy-mount: QuickActionModal is only added to the tree after first open,
  // preventing N native Modal nodes from living in memory at all times.
  const hasOpenedRef = useRef(false);
  if (modalOpen) hasOpenedRef.current = true;

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

  // Tapping the card body → open Quick Action Modal
  const handleCardPress = useCallback(() => {
    if (readOnly || habit.isFrozen) return;
    impactAsync(ImpactFeedbackStyle.Light);
    setModalOpen(true);
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
        disabled={readOnly || habit.isFrozen}
        testID={`habit-card-${habit.id}`}
      >
        <View
          style={[
            styles.cardOuter,
            {
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
        <QuickActionModal
          visible={modalOpen}
          habit={habit}
          onClose={() => setModalOpen(false)}
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

// ─── QuickActionModal styles ──────────────────────────────────────────────────

const qStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden' as const,
    borderTopWidth: 1,
    borderColor: Colors.dark.borderGlow + '55',
  },
  sheetGrad: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  trashBtn: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.dark.ruby + '18',
    borderWidth: 1,
    borderColor: Colors.dark.ruby + '44',
    zIndex: 10,
  },
  trashBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  identity: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    marginTop: 8,
    marginBottom: 12,
    paddingRight: 44,
  },
  icon: {
    fontSize: 36,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    lineHeight: 24,
  },
  rewardRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  rewardChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: Colors.dark.fire + '18',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.fire + '44',
  },
  rewardChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.dark.fire,
  },
  rewardChipGold: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: Colors.dark.gold + '18',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.gold + '44',
  },
  rewardChipGoldText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.dark.gold,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: 10,
    alignItems: 'stretch' as const,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  secondaryBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
  },
  completeBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  completeBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  completeBtnGrad: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#1a1228',
    letterSpacing: 0.3,
  },
  completeBtnTextDone: {
    color: Colors.dark.textMuted,
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 16,
    left: 16,
    padding: 4,
  },
});
