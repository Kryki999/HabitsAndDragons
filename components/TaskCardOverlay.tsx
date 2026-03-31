/**
 * TaskCardOverlay
 *
 * Shared-element-style expansion driven by a SINGLE `expandProgress` shared value
 * (0 = compact/origin, 1 = fully expanded). All geometry, opacities, and
 * content cross-fades are derived from that one value → perfect synchronisation.
 *
 * Architecture highlights:
 *  - compactLayout  (absolute, fills card): mirrors the HabitCard row; fades OUT
 *  - expandedLayout (absolute, fills card): centred icon / title / badge; fades IN
 *  - Cross-fade occurs at progress ≈ 0.35 so neither layout is visible at the same time
 *  - `overflow: 'hidden'` on the card clips both layouts while the card is small
 *  - Card fades to opacity:0 from progress 0.30→0.15 during close ONLY.
 *    `useAnimatedReaction` fires onClose at progress < 0.14 (UI thread, ~160 ms
 *    into the close spring) — the card is already invisible at that point, so
 *    the HabitCard swap is completely seamless and touches unblock ~240 ms
 *    earlier than waiting for the spring's JS-thread `finished` callback.
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  RotateCcw,
  Coins,
  Flame,
  X,
  Trash2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Habit, HabitDifficulty } from '@/types/game';
import { DIFFICULTY_BASE_REWARDS } from '@/lib/economy';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CardMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  habit: Habit;
  /** Absolute page-space bounds of the source card (from ref.measure pageX/pageY). */
  originMetrics: CardMetrics | null;
  onClose: () => void;
  onComplete: (id: string, meta?: { source: { x: number; y: number } }) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (habit: Habit) => void;
  onReschedule?: (habit: Habit) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Spring used for both open and close. Tuned for a snappy but smooth feel. */
const SPRING = { damping: 22, stiffness: 240, mass: 0.9 };

const TOP_GAP = 10;
const BOTTOM_GAP = 16;
const TOP_BTNS_H = 36;
/** Total pixel width of the two top buttons [trash (36) + gap (8) + X (36)]. */
const TOP_BTNS_W = 80;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskCardOverlay({
  visible,
  habit,
  originMetrics,
  onClose,
  onComplete,
  onUncomplete,
  onDelete,
  onEdit,
  onReschedule,
}: Props) {
  const { width: SW, height: SH } = useWindowDimensions();

  const TARGET_W = SW * 0.85;
  const TARGET_H = 205;
  const TARGET_X = (SW - TARGET_W) / 2;
  // Slightly above vertical centre so action buttons remain on-screen
  const TARGET_Y = SH * 0.27;

  // ── Single progress driver (UI thread) ───────────────────────────────────────
  const expandProgress = useSharedValue(0);

  // Origin metrics stored as shared values so worklets can read them without
  // JS-thread closures.
  const originX = useSharedValue(-9999);
  const originY = useSharedValue(-9999);
  const originW = useSharedValue(SW * 0.85);
  const originH = useSharedValue(72);

  // 1 = close animation in progress; guards the animated reaction below.
  const isClosingFlag = useSharedValue(0);

  const [actionsActive, setActionsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Early close trigger (UI thread) ─────────────────────────────────────────
  // Fire onClose as soon as the card becomes invisible during close (progress
  // < 0.14) instead of waiting for the JS-thread finished callback.
  // This eliminates the ~200-300 ms window where the invisible-yet-present
  // Modal blocks all touches and the LinearGradient card sits over the list.
  useAnimatedReaction(
    () => expandProgress.value,
    (value) => {
      if (isClosingFlag.value === 1 && value < 0.14) {
        isClosingFlag.value = 0; // prevent duplicate fires
        runOnJS(onClose)();
      }
    },
    [onClose],
  );

  // ── Open animation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !originMetrics) return;

    setActionsActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset closing flag so the animated reaction doesn't misfire
    isClosingFlag.value = 0;

    // Snap origin values synchronously so worklets have correct references
    originX.value = originMetrics.x;
    originY.value = originMetrics.y;
    originW.value = originMetrics.width;
    originH.value = originMetrics.height;
    expandProgress.value = 0;

    expandProgress.value = withSpring(1, SPRING);

    // Enable button touches once the expansion is nearly complete
    timerRef.current = setTimeout(() => setActionsActive(true), 480);
  }, [visible, originMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close animation ──────────────────────────────────────────────────────────
  const triggerClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActionsActive(false);

    if (!originMetrics) {
      onClose();
      return;
    }

    // Mark as closing: the animated reaction (useAnimatedReaction above) watches
    // for expandProgress < 0.14 and fires onClose from the UI thread — much
    // earlier than the JS-thread finished callback would, and at a point where
    // the card is already faded to opacity:0 (see cardStyle below).
    isClosingFlag.value = 1;
    expandProgress.value = withSpring(0, SPRING);
  }, [originMetrics, onClose, expandProgress, isClosingFlag]);

  // ── Action handlers ──────────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    if (habit.completedToday) {
      onUncomplete(habit.id);
    } else {
      onComplete(habit.id);
    }
    triggerClose();
  }, [habit, onComplete, onUncomplete, triggerClose]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Quest?',
      'Are you sure you want to delete this quest? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            impactAsync(ImpactFeedbackStyle.Light);
            onDelete(habit.id);
            triggerClose();
          },
        },
      ],
    );
  }, [habit.id, onDelete, triggerClose]);

  const handleEdit = useCallback(() => {
    onEdit?.(habit);
    triggerClose();
  }, [habit, onEdit, triggerClose]);

  const handleReschedule = useCallback(() => {
    onReschedule?.(habit);
    triggerClose();
  }, [habit, onReschedule, triggerClose]);

  const diffKey = (habit.difficulty ?? 'medium') as HabitDifficulty;
  const rewards = DIFFICULTY_BASE_REWARDS[diffKey];
  const isCompleted = habit.completedToday;

  // ── Dynamic theme (gold for completed quests) ────────────────────────────────
  const cardBorderColor = isCompleted
    ? Colors.dark.gold + '70'
    : Colors.dark.borderGlow + '55';

  const cardGradColors = (
    isCompleted
      ? ['#231a05', '#1a1204', '#0e0a02']
      : ['#1e1628', '#140e20', '#0e0a16']
  ) as [string, string, string];

  const accentBarColor = isCompleted
    ? Colors.dark.gold + '80'
    : Colors.dark.borderGlow + '80';

  // ── Animated styles (all driven by expandProgress) ───────────────────────────

  /** Card container: position + size + border-radius + close-fade */
  const cardStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    return {
      position: 'absolute' as const,
      left: originX.value + (TARGET_X - originX.value) * p,
      top: originY.value + (TARGET_Y - originY.value) * p,
      width: originW.value + (TARGET_W - originW.value) * p,
      height: originH.value + (TARGET_H - originH.value) * p,
      borderRadius: 14 + (20 - 14) * p,
      // During close only: fade card to 0 before it reaches origin.
      // • Masks the LinearGradient-vs-solid-surface mismatch (color flash).
      // • onClose fires via useAnimatedReaction at progress < 0.14 — by then
      //   opacity is already 0, so the HabitCard swap is completely invisible.
      // During open: card is always fully opaque (no fade-in delay).
      opacity:
        isClosingFlag.value === 1
          ? interpolate(p, [0.15, 0.30], [0, 1], Extrapolation.CLAMP)
          : 1,
    };
  });

  /** Dark backdrop fades in during the first 60 % of expansion */
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
  }));

  /**
   * Compact layout (mirrors HabitCard row):
   * Fully visible at progress 0, invisible by progress 0.35
   */
  const compactOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      expandProgress.value,
      [0, 0.35],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /**
   * Expanded layout (centred icon / title / type badge):
   * Invisible until progress 0.35, fully visible at 0.75
   */
  const expandedOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      expandProgress.value,
      [0.35, 0.75],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  /** Management buttons above the card */
  const topBtnsStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    const cx = originX.value + (TARGET_X - originX.value) * p;
    const cw = originW.value + (TARGET_W - originW.value) * p;
    const cy = originY.value + (TARGET_Y - originY.value) * p;
    return {
      position: 'absolute' as const,
      top: cy - TOP_BTNS_H - TOP_GAP,
      left: cx + cw - TOP_BTNS_W,
      opacity: interpolate(p, [0.6, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  /** Action row below the card */
  const bottomRowStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    const cx = originX.value + (TARGET_X - originX.value) * p;
    const cw = originW.value + (TARGET_W - originW.value) * p;
    const cy = originY.value + (TARGET_Y - originY.value) * p;
    const ch = originH.value + (TARGET_H - originH.value) * p;
    return {
      position: 'absolute' as const,
      top: cy + ch + BOTTOM_GAP,
      left: cx,
      width: cw,
      opacity: interpolate(p, [0.6, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={triggerClose}
    >
      {/* ── Backdrop ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdropBase, backdropStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={triggerClose} />
      </Animated.View>

      {/* ── Animated card ── */}
      <Animated.View style={[styles.card, { borderColor: cardBorderColor }, cardStyle]}>
        <LinearGradient
          colors={cardGradColors}
          style={styles.cardGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* ── Compact layout — must be pixel-perfect match of HabitCard row ── */}
          <Animated.View
            style={[
              styles.compactLayout,
              isCompleted && styles.compactLayoutDone,
              compactOpacityStyle,
            ]}
          >
            {/* Icon */}
            <Text style={styles.compactIcon}>{habit.icon}</Text>

            {/* Name — mirrors habitName + habitNameCompleted styles */}
            <View style={styles.compactInfo}>
              <Text
                style={[
                  styles.compactName,
                  isCompleted && styles.compactNameDone,
                ]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
            </View>

            {/* Reward stack — right side */}
            <View style={styles.compactRewardStack}>
              <Text style={styles.compactXP}>+{rewards.xp} XP</Text>
              <View style={styles.compactGoldRow}>
                <Text style={styles.compactGold}>+{rewards.gold}</Text>
                <Coins size={10} color={Colors.dark.gold} strokeWidth={2.5} />
              </View>
            </View>

            {/* Check circle — mirrors HabitCard checkbox (gold-filled when done) */}
            <View
              style={[
                styles.compactCheckCircle,
                isCompleted && styles.compactCheckCircleDone,
              ]}
            >
              {isCompleted && (
                <Check size={14} color="#fff" strokeWidth={3} />
              )}
            </View>
          </Animated.View>

          {/* ── Expanded layout ── */}
          <Animated.View
            style={[StyleSheet.absoluteFill, expandedOpacityStyle]}
            pointerEvents="none"
          >
            {/* Reward indicators — vertical column, absolute top-right */}
            <View style={styles.rewardColumn}>
              <View style={styles.rewardRow}>
                <Flame size={11} color={Colors.dark.fire} strokeWidth={2.5} />
                <Text style={styles.rewardXPText}>+{rewards.xp} XP</Text>
              </View>
              <View style={styles.rewardRow}>
                <Coins size={11} color={Colors.dark.gold} strokeWidth={2.5} />
                <Text style={styles.rewardGoldText}>+{rewards.gold}</Text>
              </View>
            </View>

            {/* Centred body: icon → title → type badge */}
            <ScrollView
              style={styles.expandedBody}
              contentContainerStyle={styles.expandedBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.expandedIcon}>{habit.icon}</Text>
              <Text style={styles.expandedName}>
                {habit.name}
              </Text>
              <View
                style={[
                  styles.typeBadge,
                  isCompleted && styles.typeBadgeCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    isCompleted && styles.typeBadgeTextCompleted,
                  ]}
                >
                  {habit.taskType === 'daily' ? 'Habit' : 'One-time Quest'}
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </LinearGradient>

        {/* Bottom accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentBarColor }]} />
      </Animated.View>

      {/* ── Management buttons (above card, right-aligned) ── */}
      <Animated.View style={topBtnsStyle} pointerEvents="box-none">
        <View
          style={styles.topBtns}
          pointerEvents={actionsActive ? 'box-none' : 'none'}
        >
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.topBtn,
              styles.topBtnDelete,
              pressed && styles.topBtnPressed,
            ]}
            hitSlop={6}
            accessibilityLabel="Delete quest"
          >
            <Trash2 size={15} color={Colors.dark.ruby} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={triggerClose}
            style={({ pressed }) => [styles.topBtn, pressed && styles.topBtnPressed]}
            hitSlop={6}
            accessibilityLabel="Close"
          >
            <X size={15} color={Colors.dark.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Action row (below card): Edit | Complete/Undo | Reschedule ── */}
      <Animated.View style={bottomRowStyle} pointerEvents="box-none">
        {/*
          Three-column symmetric layout:
          • Column L (flex:1, center): Edit ghost button
          • Column C (fixed 66 px): Complete / Undo square — guaranteed centre
          • Column R (flex:1, center): Reschedule ghost button
        */}
        <View
          style={styles.actionRow}
          pointerEvents={actionsActive ? 'box-none' : 'none'}
        >
          {/* ── Left: Edit ── */}
          <View style={styles.actionSide}>
            <Pressable
              onPress={handleEdit}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
            >
              <Text style={styles.ghostBtnEmoji}>✏️</Text>
              <Text style={styles.ghostBtnLabel}>Edit</Text>
            </Pressable>
          </View>

          {/* ── Centre: Complete / Undo (filled square, icon only) ── */}
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.actionSquare,
              isCompleted ? styles.undoSquare : styles.completeSquare,
              pressed && styles.actionSquarePressed,
            ]}
            accessibilityLabel={isCompleted ? 'Undo completion' : 'Mark complete'}
          >
            {isCompleted ? (
              <RotateCcw size={26} color={Colors.dark.textSecondary} strokeWidth={2} />
            ) : (
              <Check size={26} color="#fff" strokeWidth={2.5} />
            )}
          </Pressable>

          {/* ── Right: Reschedule ── */}
          <View style={styles.actionSide}>
            <Pressable
              onPress={handleReschedule}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
            >
              <Text style={styles.ghostBtnEmoji}>📅</Text>
              <Text style={styles.ghostBtnLabel}>Reschedule</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdropBase: {
    backgroundColor: 'rgba(0,0,0,0.72)',
  },

  // ── Card container ──────────────────────────────────────────────────────────
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: Colors.dark.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 20,
  },
  cardGrad: {
    flex: 1,
  },
  accentBar: {
    height: 4,
  },

  // ── Compact layout (pixel-perfect match of HabitCard row) ─────────────────
  compactLayout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  /** Mirrors HabitCard's `cardInner` tint when completed */
  compactLayoutDone: {
    backgroundColor: Colors.dark.gold + '10',
  },
  compactIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  /** Mirrors HabitCard's `habitNameCompleted` */
  compactNameDone: {
    opacity: 0.55,
    textDecorationLine: 'line-through',
  },
  compactRewardStack: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 10,
  },
  compactXP: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.fire,
  },
  compactGoldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactGold: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.gold,
  },
  /** Mirrors HabitCard's `checkCircle` — gold-filled when completed */
  compactCheckCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  compactCheckCircleDone: {
    backgroundColor: Colors.dark.gold,
    borderColor: Colors.dark.gold,
  },

  // ── Expanded layout ─────────────────────────────────────────────────────────
  rewardColumn: {
    position: 'absolute',
    top: 12,
    right: 14,
    alignItems: 'flex-end',
    gap: 5,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardXPText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.fire,
  },
  rewardGoldText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.gold,
  },
  expandedBody: {
    flex: 1,
  },
  expandedBodyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  expandedIcon: {
    fontSize: 44,
  },
  expandedName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '78%',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: Colors.dark.purple + '20',
    borderWidth: 1,
    borderColor: Colors.dark.purple + '50',
  },
  typeBadgeCompleted: {
    backgroundColor: Colors.dark.gold + '18',
    borderColor: Colors.dark.gold + '50',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.purple,
    letterSpacing: 0.4,
  },
  typeBadgeTextCompleted: {
    color: Colors.dark.gold,
  },

  // ── Management buttons (above card) ────────────────────────────────────────
  topBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  topBtnDelete: {
    backgroundColor: Colors.dark.ruby + '15',
    borderColor: Colors.dark.ruby + '40',
  },
  topBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },

  // ── Action row (below card) ─────────────────────────────────────────────────
  /**
   * Three-column row: [flex:1 side] [fixed centre] [flex:1 side]
   * Guarantees the centre button is always at exact 50 % of the card width.
   */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** flex:1 column that centres its ghost button horizontally */
  actionSide: {
    flex: 1,
    alignItems: 'center',
  },

  /** Ghost button: transparent background, emoji icon stacked above label */
  ghostBtn: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ghostBtnPressed: {
    opacity: 0.5,
    transform: [{ scale: 0.93 }],
  },
  /** Hero-style emoji icon (matches heroQuestSystem icon rendering) */
  ghostBtnEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  ghostBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    letterSpacing: 0.3,
  },

  /** Filled square button for Complete / Undo (no text label) */
  actionSquare: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeSquare: {
    backgroundColor: Colors.dark.emerald,
    shadowColor: Colors.dark.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  undoSquare: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionSquarePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.93 }],
  },
});
