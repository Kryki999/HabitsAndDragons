import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  useAnimatedReaction,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";

const DRAGON_MILESTONES: Record<number, { emoji: string; label: string; color: string }> = {
  3:   { emoji: "🥚", label: "Smocze Jajo",         color: "#c0a060" },
  5:   { emoji: "🐣", label: "Wykluty Smok",         color: "#88cc44" },
  7:   { emoji: "🔥", label: "Płomień Tygodnia",     color: "#ff6b35" },
  10:  { emoji: "🐉", label: "Smocza Moc",            color: "#9b6dff" },
  14:  { emoji: "⚔️",  label: "Wojownik Streaka",     color: "#e0e0e0" },
  21:  { emoji: "🌟", label: "Legenda",               color: "#ffc845" },
  30:  { emoji: "👑", label: "Władca Miesiąca",       color: "#ffd700" },
  50:  { emoji: "💎", label: "Diamentowy Strażnik",   color: "#45d4e8" },
  100: { emoji: "🌌", label: "Kosmiczny Smok",        color: "#cc88ff" },
};

const MILESTONE_DAYS = Object.keys(DRAGON_MILESTONES).map(Number).sort((a, b) => a - b);

const NODE_SIZE = 34;
const MILESTONE_NODE_SIZE = 50;
const SLOT_W = 62;
const TRACK_LINE_TOP = 40;

function getNextMilestone(streak: number): number | null {
  return MILESTONE_DAYS.find((d) => d > streak) ?? null;
}

type Props = {
  onComplete: () => void;
};

export default function StreakMilestoneScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const streak = useGameStore((s) => s.streak);

  const totalNodes = Math.max(15, streak + 8);
  const days = useMemo(() => Array.from({ length: totalNodes }, (_, i) => i + 1), [totalNodes]);

  const todayMilestone = DRAGON_MILESTONES[streak] ?? null;
  const nextMilestone = getNextMilestone(streak);

  // ── Shared animation values ──────────────────────────────────────────────
  const numScale = useSharedValue(0.45);
  const numOpacity = useSharedValue(0);

  const counterAnim = useSharedValue(0);
  const [displayStreak, setDisplayStreak] = useState(0);

  const fillAnim = useSharedValue(0);
  const [litCount, setLitCount] = useState(0);

  const rewardScale = useSharedValue(0.6);
  const rewardOpacity = useSharedValue(0);
  const rewardPulse = useSharedValue(1);

  const btnOpacity = useSharedValue(0);
  const btnTranslateY = useSharedValue(32);

  const [showReward, setShowReward] = useState(false);

  // ── Animated reactions ──────────────────────────────────────────────────
  useAnimatedReaction(
    () => Math.round(counterAnim.value),
    (val) => runOnJS(setDisplayStreak)(val),
  );

  useAnimatedReaction(
    () => Math.floor(fillAnim.value),
    (val) => runOnJS(setLitCount)(val),
  );

  useAnimatedReaction(
    () => fillAnim.value >= streak - 0.1 && streak > 0,
    (reached) => {
      if (reached) runOnJS(setShowReward)(true);
    },
  );

  // ── Mount animations ────────────────────────────────────────────────────
  useEffect(() => {
    const animDuration = Math.min(1600, Math.max(700, streak * 65));

    numOpacity.value = withDelay(200, withTiming(1, { duration: 420 }));
    numScale.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));

    fillAnim.value = withDelay(500, withTiming(streak, { duration: animDuration, easing: Easing.out(Easing.cubic) }));
    counterAnim.value = withDelay(500, withTiming(streak, { duration: animDuration, easing: Easing.out(Easing.cubic) }));

    const rewardDelay = 500 + animDuration + 200;
    if (todayMilestone) {
      rewardOpacity.value = withDelay(rewardDelay, withTiming(1, { duration: 500 }));
      rewardScale.value = withDelay(rewardDelay, withSpring(1, { damping: 12, stiffness: 160 }));
      rewardPulse.value = withDelay(
        rewardDelay + 600,
        withRepeat(
          withSequence(
            withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      );
    }

    btnOpacity.value = withDelay(rewardDelay + 200, withTiming(1, { duration: 480 }));
    btnTranslateY.value = withDelay(rewardDelay + 200, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showReward && todayMilestone) {
      impactAsync(ImpactFeedbackStyle.Heavy);
    }
  }, [showReward, todayMilestone]);

  // ── Animated styles ────────────────────────────────────────────────────
  const numStyle = useAnimatedStyle(() => ({
    opacity: numOpacity.value,
    transform: [{ scale: numScale.value }],
  }));

  const rewardStyle = useAnimatedStyle(() => ({
    opacity: rewardOpacity.value,
    transform: [{ scale: rewardScale.value * rewardPulse.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnTranslateY.value }],
  }));

  // ── Track scroll ────────────────────────────────────────────────────────
  const trackRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (streak > 5) {
      const scrollX = Math.max(0, (streak - 5) * SLOT_W);
      setTimeout(() => {
        trackRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 900);
    }
  }, [streak]);

  return (
    <View style={styles.root}>
      {/* Dark vignette background */}
      <LinearGradient
        colors={["#020109", "#070412", "#0d0814", "#05020d"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Top + bottom vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.9)", "transparent", "transparent", "rgba(0,0,0,0.9)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Side vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.8)", "transparent", "rgba(0,0,0,0.8)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />

      {/* Ambient ember glow */}
      <View style={styles.emberGlow} pointerEvents="none" />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Kicker */}
        <Text style={styles.kicker}>Ścieżka Wytrwałości</Text>

        {/* ── Giant Streak Counter ─────────────────────────────────────────── */}
        <Animated.View style={[styles.streakCounterWrap, numStyle]}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>{displayStreak}</Text>
          <Text style={styles.streakUnitLabel}>
            {streak === 1 ? "DZIEŃ" : "DNI"}
          </Text>
        </Animated.View>

        {/* ── Milestone Track ──────────────────────────────────────────────── */}
        <View style={styles.trackOuter}>
          <ScrollView
            ref={trackRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trackContent}
          >
            {days.map((day, idx) => {
              const isLit = day <= litCount;
              const isCurrent = day === streak;
              const milestone = DRAGON_MILESTONES[day];
              const nodeSize = milestone ? MILESTONE_NODE_SIZE : NODE_SIZE;
              const nodeOffset = (SLOT_W - nodeSize) / 2;

              return (
                <View key={day} style={[styles.slot, { width: SLOT_W }]}>
                  {/* Connector line between nodes */}
                  {idx > 0 && (
                    <View
                      style={[
                        styles.connector,
                        { top: TRACK_LINE_TOP },
                        isLit && styles.connectorLit,
                      ]}
                    />
                  )}

                  {/* Node */}
                  <View
                    style={[
                      styles.node,
                      {
                        width: nodeSize,
                        height: nodeSize,
                        borderRadius: nodeSize / 2,
                        marginLeft: nodeOffset,
                        marginTop: milestone ? (NODE_SIZE - MILESTONE_NODE_SIZE) / 2 + 24 : 24,
                      },
                      isLit && styles.nodeLit,
                      isCurrent && styles.nodeCurrent,
                      milestone && isLit && { borderColor: milestone.color + "cc", borderWidth: 2.5 },
                      isCurrent && milestone && {
                        shadowColor: milestone.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.95,
                        shadowRadius: 14,
                        elevation: 12,
                      },
                    ]}
                  >
                    {milestone ? (
                      <Text
                        style={[
                          styles.milestoneEmoji,
                          { opacity: isLit ? 1 : 0.35 },
                        ]}
                      >
                        {milestone.emoji}
                      </Text>
                    ) : (
                      <View
                        style={[
                          styles.innerDot,
                          isLit && styles.innerDotLit,
                          isCurrent && styles.innerDotCurrent,
                        ]}
                      />
                    )}
                  </View>

                  {/* Day number label */}
                  <Text
                    style={[
                      styles.dayLabel,
                      isLit && styles.dayLabelLit,
                      isCurrent && styles.dayLabelCurrent,
                    ]}
                  >
                    {day}
                  </Text>

                  {/* Milestone name below current day */}
                  {milestone && isCurrent && (
                    <Text style={[styles.milestoneName, { color: milestone.color }]}>
                      {milestone.label}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Dragon Reward (milestone day) ─────────────────────────────────── */}
        {todayMilestone && showReward && (
          <Animated.View style={[styles.rewardCard, rewardStyle]}>
            <LinearGradient
              colors={[todayMilestone.color + "28", "#18091e", "#0d0614"]}
              style={styles.rewardGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.rewardEmoji}>{todayMilestone.emoji}</Text>
              <View style={styles.rewardTextCol}>
                <Text style={styles.rewardTitle}>Nowa Bestia Odblokowana!</Text>
                <Text style={[styles.rewardSubtitle, { color: todayMilestone.color }]}>
                  {todayMilestone.label}
                </Text>
                <Text style={styles.rewardDesc}>
                  Twoja wytrwałość została nagrodzona smoczą mocą.
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Next Milestone Info (regular day) ─────────────────────────────── */}
        {!todayMilestone && (
          <View style={styles.nextMilestoneWrap}>
            {nextMilestone ? (
              <Text style={styles.nextMilestoneText}>
                🐉 Kolejny smok za{" "}
                <Text style={styles.nextMilestoneDays}>{nextMilestone - streak}</Text>
                {" "}
                {nextMilestone - streak === 1 ? "dzień" : "dni"}
              </Text>
            ) : (
              <Text style={styles.nextMilestoneText}>
                🌌 Osiągnąłeś legendarny status Kosmicznego Smoka!
              </Text>
            )}
          </View>
        )}

        <View style={styles.spacer} />

        {/* ── Start Day Button ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.btnWrap, btnStyle]}>
          <Pressable
            onPress={onComplete}
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Rozpocznij Dzień"
          >
            <LinearGradient
              colors={["#ffc845", "#ff9a18", "#cc7200"]}
              style={styles.ctaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.ctaText}>Rozpocznij Dzień</Text>
            </LinearGradient>
            <View style={styles.ctaShadowBar} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020109",
  },
  emberGlow: {
    position: "absolute" as const,
    top: "30%" as const,
    left: "20%" as const,
    right: "20%" as const,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#ff6b3512",
  },
  content: {
    flex: 1,
    alignItems: "center" as const,
    paddingHorizontal: 22,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2.4,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginBottom: 20,
    opacity: 0.85,
  },
  streakCounterWrap: {
    alignItems: "center" as const,
    marginBottom: 32,
  },
  fireEmoji: {
    fontSize: 38,
    marginBottom: 2,
    textShadowColor: "#ff6b35",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  streakNumber: {
    fontSize: 96,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    lineHeight: 100,
    letterSpacing: -2,
    textShadowColor: Colors.dark.gold + "55",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
    fontVariant: ["tabular-nums"] as ("tabular-nums")[],
  },
  streakUnitLabel: {
    fontSize: 18,
    fontWeight: "900" as const,
    letterSpacing: 5,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginTop: -4,
  },
  trackOuter: {
    width: "100%" as const,
    marginBottom: 24,
  },
  trackContent: {
    paddingHorizontal: 8,
    alignItems: "flex-start" as const,
    paddingBottom: 8,
  },
  slot: {
    alignItems: "center" as const,
    position: "relative" as const,
    minHeight: 90,
  },
  connector: {
    position: "absolute" as const,
    left: -SLOT_W / 2,
    right: SLOT_W / 2,
    height: 3,
    backgroundColor: Colors.dark.border + "55",
    borderRadius: 2,
  },
  connectorLit: {
    backgroundColor: Colors.dark.gold + "aa",
  },
  node: {
    borderWidth: 2,
    borderColor: Colors.dark.border + "77",
    backgroundColor: Colors.dark.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  nodeLit: {
    borderColor: Colors.dark.gold + "88",
    backgroundColor: Colors.dark.gold + "18",
  },
  nodeCurrent: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + "28",
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.surfaceLight,
  },
  innerDotLit: {
    backgroundColor: Colors.dark.gold + "88",
  },
  innerDotCurrent: {
    backgroundColor: Colors.dark.gold,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  milestoneEmoji: {
    fontSize: 24,
  },
  dayLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
  },
  dayLabelLit: {
    color: Colors.dark.textSecondary,
  },
  dayLabelCurrent: {
    color: Colors.dark.gold,
    fontWeight: "800" as const,
    fontSize: 12,
  },
  milestoneName: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
    textAlign: "center" as const,
    maxWidth: SLOT_W - 4,
  },
  rewardCard: {
    width: "100%" as const,
    borderRadius: 18,
    overflow: "hidden" as const,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "55",
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  rewardGrad: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 18,
    gap: 16,
  },
  rewardEmoji: {
    fontSize: 44,
    flexShrink: 0,
    textShadowColor: Colors.dark.gold + "aa",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  rewardTextCol: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    marginBottom: 3,
  },
  rewardSubtitle: {
    fontSize: 13,
    fontWeight: "800" as const,
    marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    lineHeight: 17,
  },
  nextMilestoneWrap: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(12, 8, 20, 0.7)",
    borderWidth: 1,
    borderColor: Colors.dark.border + "55",
    marginBottom: 12,
    width: "100%" as const,
    alignItems: "center" as const,
  },
  nextMilestoneText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    fontWeight: "600" as const,
  },
  nextMilestoneDays: {
    color: Colors.dark.gold,
    fontWeight: "900" as const,
    fontSize: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  btnWrap: {
    width: "100%" as const,
  },
  ctaBtn: {
    borderRadius: 18,
    overflow: "hidden" as const,
  },
  ctaBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaGrad: {
    paddingVertical: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 18,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#1a0f04",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  ctaShadowBar: {
    height: 4,
    backgroundColor: "#cc7200",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});
