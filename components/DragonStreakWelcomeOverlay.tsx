import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";

type Props = {
  visible: boolean;
  loginStreak: number;
  onDismiss: () => void;
};

const WINDOW = 5;

export default function DragonStreakWelcomeOverlay({ visible, loginStreak, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const markerScale = useRef(new Animated.Value(0.4)).current;
  const markerGlow = useRef(new Animated.Value(0)).current;

  const { startDay, dayLabels, activeIndex } = useMemo(() => {
    const streak = Math.max(1, loginStreak);
    const start = Math.max(1, streak - (WINDOW - 1));
    const labels = Array.from({ length: WINDOW }, (_, i) => start + i);
    const active = Math.min(WINDOW - 1, streak - start);
    return { startDay: start, dayLabels: labels, activeIndex: active };
  }, [loginStreak]);

  useEffect(() => {
    if (!visible) {
      pulse.setValue(0);
      markerScale.setValue(0.4);
      markerGlow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    markerScale.setValue(0.4);
    markerGlow.setValue(0);
    Animated.parallel([
      Animated.spring(markerScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(markerGlow, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    return () => loop.stop();
  }, [visible, pulse, markerScale, markerGlow]);

  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  const timelineWidth = Math.min(width - 48, 340);
  const slotW = timelineWidth / WINDOW;

  const handleEnter = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.root} pointerEvents="box-none">
        {Platform.OS === "web" ? (
          <View style={[StyleSheet.absoluteFill, styles.webBackdrop]} />
        ) : (
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={["#0a0512f0", "#12081ef2", "#050208fa"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.kicker}>The Dragon Streak</Text>
          <Text style={styles.title}>A New Day Dawns</Text>
          <Text style={styles.subtitle}>
            Return to the keep. Each dawn you claim sharpens the habit of coming back.
          </Text>

          <View style={[styles.timelineWrap, { width: timelineWidth }]}>
            <View style={styles.timelineLine} />
            <View style={styles.timelineRow}>
              {dayLabels.map((dayNum, i) => {
                const isActive = i === activeIndex;
                const isMilestone = dayNum > 0 && dayNum % 5 === 0;
                const pastOrActive = dayNum <= loginStreak;
                return (
                  <View key={`${startDay}-${i}`} style={[styles.slot, { width: slotW }]}>
                    <View style={styles.nodeCol}>
                      {isMilestone ? (
                        <View
                          style={[
                            styles.milestoneRing,
                            pastOrActive && styles.milestoneRingLit,
                            isActive && styles.milestoneRingActive,
                          ]}
                        >
                          <Text style={styles.milestoneIcon}>🥚</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.dot,
                            pastOrActive && styles.dotLit,
                            isActive && styles.dotActive,
                          ]}
                        />
                      )}
                      {isActive ? (
                        <Animated.View
                          style={[
                            styles.playerMarker,
                            {
                              opacity: markerGlow,
                              transform: [{ scale: markerScale }],
                            },
                          ]}
                        >
                          <Text style={styles.markerEmoji}>🐉</Text>
                        </Animated.View>
                      ) : null}
                      <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
                        Day {dayNum}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Animated.View style={[styles.emberGlow, { opacity: pulseOpacity }]} />
          </View>

          <Text style={styles.streakCaption}>
            {loginStreak} day{loginStreak === 1 ? "" : "s"} of consecutive visits
          </Text>

          <View style={styles.ctaWrap}>
            <Pressable
              onPress={handleEnter}
              style={({ pressed }) => [styles.ctaOuter, pressed && styles.ctaPressed]}
            >
              <LinearGradient
                colors={["#f4ca73", "#c9952e", "#8a6520"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                <Text style={styles.ctaText}>[ Enter the Keep ]</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
  webBackdrop: {
    backgroundColor: "rgba(6, 3, 14, 0.94)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 2,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
    textShadowColor: "#000000aa",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitle: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    maxWidth: 320,
  },
  timelineWrap: {
    marginTop: 44,
    marginBottom: 8,
    alignItems: "center",
  },
  timelineLine: {
    position: "absolute" as const,
    left: 12,
    right: 12,
    top: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.dark.border + "cc",
  },
  timelineRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
  },
  slot: {
    alignItems: "center" as const,
  },
  nodeCol: {
    alignItems: "center" as const,
    minHeight: 120,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    marginTop: 28,
  },
  dotLit: {
    backgroundColor: Colors.dark.gold + "55",
    borderColor: Colors.dark.gold + "99",
  },
  dotActive: {
    backgroundColor: Colors.dark.gold,
    borderColor: "#fff8e0",
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  milestoneRing: {
    marginTop: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface + "cc",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  milestoneRingLit: {
    borderColor: Colors.dark.gold + "88",
    backgroundColor: Colors.dark.gold + "22",
  },
  milestoneRingActive: {
    borderColor: Colors.dark.gold,
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 10,
  },
  milestoneIcon: {
    fontSize: 22,
  },
  playerMarker: {
    marginTop: 8,
    alignItems: "center" as const,
  },
  markerEmoji: {
    fontSize: 28,
    textShadowColor: "#00000088",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  dayLabel: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
  },
  dayLabelActive: {
    color: Colors.dark.gold,
    fontSize: 12,
  },
  emberGlow: {
    position: "absolute" as const,
    left: "15%" as const,
    right: "15%" as const,
    top: 20,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.ruby + "22",
  },
  streakCaption: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
  },
  ctaWrap: {
    marginTop: "auto" as const,
    width: "100%" as const,
    maxWidth: 360,
    paddingTop: 24,
  },
  ctaOuter: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 16,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaGrad: {
    paddingVertical: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#fff6d055",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900" as const,
    color: "#1a0f08",
    letterSpacing: 0.6,
  },
});
