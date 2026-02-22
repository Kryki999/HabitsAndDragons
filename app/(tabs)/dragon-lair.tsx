import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Snowflake, Crown, Lock, Shield, Plus, RotateCcw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";

interface DragonData {
  id: string;
  name: string;
  subtitle: string;
  streakRequired: number;
  colors: readonly [string, string];
  accentColor: string;
  icon: React.ReactNode;
  lockedIcon: React.ReactNode;
}

const DRAGONS: DragonData[] = [
  {
    id: "red",
    name: "Red Dragon",
    subtitle: "Guardian of Embers",
    streakRequired: 10,
    colors: ["#ff6b35", "#cc2a1a"] as const,
    accentColor: "#ff6b35",
    icon: <Flame size={40} color="#fff" />,
    lockedIcon: <Flame size={40} color="#4a3a3a" />,
  },
  {
    id: "ice",
    name: "Ice Wyvern",
    subtitle: "Frost Sentinel",
    streakRequired: 20,
    colors: ["#45d4e8", "#1a6a8a"] as const,
    accentColor: "#45d4e8",
    icon: <Snowflake size={40} color="#fff" />,
    lockedIcon: <Snowflake size={40} color="#3a4a4a" />,
  },
  {
    id: "golden",
    name: "Golden Dragon",
    subtitle: "The Eternal Sovereign",
    streakRequired: 30,
    colors: ["#ffc845", "#cc8800"] as const,
    accentColor: "#ffc845",
    icon: <Crown size={40} color="#fff" />,
    lockedIcon: <Crown size={40} color="#4a4a3a" />,
  },
];

function DragonCard({
  dragon,
  streak,
  delay,
}: {
  dragon: DragonData;
  streak: number;
  delay: number;
}) {
  const unlocked = streak >= dragon.streakRequired;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (unlocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [unlocked]);

  const progress = Math.min(streak / dragon.streakRequired, 1);

  return (
    <Animated.View
      style={[
        styles.dragonCard,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      {unlocked && (
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowAnim,
              backgroundColor: dragon.accentColor + "12",
              borderColor: dragon.accentColor + "30",
            },
          ]}
        />
      )}

      <View
        style={[
          styles.cardInner,
          unlocked
            ? { borderColor: dragon.accentColor + "50" }
            : { borderColor: Colors.dark.border },
        ]}
      >
        <View style={styles.dragonIconArea}>
          {unlocked ? (
            <LinearGradient
              colors={[...dragon.colors]}
              style={styles.dragonIconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {dragon.icon}
            </LinearGradient>
          ) : (
            <View style={styles.dragonIconCircleLocked}>
              {dragon.lockedIcon}
              <View style={styles.lockOverlay}>
                <Lock size={20} color="#8a7a6a" />
              </View>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.dragonName,
            !unlocked && { color: Colors.dark.textMuted },
          ]}
        >
          {dragon.name}
        </Text>
        <Text
          style={[
            styles.dragonSubtitle,
            unlocked && { color: dragon.accentColor + "bb" },
          ]}
        >
          {dragon.subtitle}
        </Text>

        {unlocked ? (
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: dragon.accentColor + "20", borderColor: dragon.accentColor + "50" },
            ]}
          >
            <Shield size={12} color={dragon.accentColor} />
            <Text style={[styles.activeBadgeText, { color: dragon.accentColor }]}>
              Guardian Active
            </Text>
          </View>
        ) : (
          <View style={styles.lockedSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: dragon.accentColor + "60",
                  },
                ]}
              />
            </View>
            <Text style={styles.requirementText}>
              Requires {dragon.streakRequired} 🔥 Streak
            </Text>
            <Text style={styles.progressText}>
              {streak} / {dragon.streakRequired}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function DragonLairScreen() {
  const streak = useGameStore((s) => s.streak);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0.2)).current;

  const unlockedCount = DRAGONS.filter((d) => streak >= d.streakRequired).length;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, {
          toValue: 0.5,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(orbAnim, {
          toValue: 0.2,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleAddStreak = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    console.log("[DragonLair] Debug: Adding +5 streak");
    useGameStore.setState((s) => ({ streak: s.streak + 5 }));
  }, []);

  const handleResetStreak = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    console.log("[DragonLair] Debug: Resetting streak to 0");
    useGameStore.setState({ streak: 0 });
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.dragonLair]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.glowOrb, { opacity: orbAnim }]} />
      <Animated.View style={[styles.glowOrb2, { opacity: orbAnim }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerEmblem}>
            <LinearGradient
              colors={[...Colors.gradients.fire]}
              style={styles.headerEmblemGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Flame size={26} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Dragon Lair</Text>
          <Text style={styles.subtitle}>Trophy Room of Legends</Text>

          <View style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakValue}>{streak}</Text>
            <View style={styles.streakDivider} />
            <Text style={styles.unlockedText}>
              {unlockedCount} / {DRAGONS.length} Guardians
            </Text>
          </View>
        </Animated.View>

        <View style={styles.grid}>
          {DRAGONS.map((dragon, index) => (
            <DragonCard
              key={dragon.id}
              dragon={dragon}
              streak={streak}
              delay={200 + index * 150}
            />
          ))}
        </View>

        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>⚙️ Debug Controls</Text>
          <View style={styles.debugRow}>
            <Pressable
              onPress={handleAddStreak}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonAdd,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-add-streak"
            >
              <Plus size={16} color="#3dd68c" />
              <Text style={styles.debugButtonTextAdd}>+5 Streak</Text>
            </Pressable>
            <Pressable
              onPress={handleResetStreak}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonReset,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-reset-streak"
            >
              <RotateCcw size={16} color="#ff4d6a" />
              <Text style={styles.debugButtonTextReset}>Reset to 0</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  glowOrb: {
    position: "absolute" as const,
    top: 30,
    left: "20%" as const,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#ff6b3510",
  },
  glowOrb2: {
    position: "absolute" as const,
    top: 200,
    right: "10%" as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#45d4e808",
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 28,
  },
  headerEmblem: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: "#ff6b35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  headerEmblemGradient: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  streakPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 14,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.dark.fire + "30",
    gap: 8,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.fire,
  },
  streakDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.dark.border,
  },
  unlockedText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  grid: {
    gap: 16,
  },
  dragonCard: {
    position: "relative" as const,
  },
  cardGlow: {
    position: "absolute" as const,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 1,
  },
  cardInner: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center" as const,
    borderWidth: 1.5,
  },
  dragonIconArea: {
    marginBottom: 16,
  },
  dragonIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  dragonIconCircleLocked: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.dark.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  lockOverlay: {
    position: "absolute" as const,
    bottom: -2,
    right: -2,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dragonName: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  dragonSubtitle: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  activeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  lockedSection: {
    alignItems: "center" as const,
    marginTop: 14,
    width: "100%" as const,
  },
  progressBarBg: {
    width: "70%" as const,
    height: 6,
    backgroundColor: Colors.dark.background,
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  requirementText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textMuted,
  },
  progressText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  debugSection: {
    marginTop: 36,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: "dashed" as const,
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    marginBottom: 14,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  debugRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  debugButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  debugButtonAdd: {
    backgroundColor: "#3dd68c10",
    borderColor: "#3dd68c40",
  },
  debugButtonReset: {
    backgroundColor: "#ff4d6a10",
    borderColor: "#ff4d6a40",
  },
  debugButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  debugButtonTextAdd: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#3dd68c",
  },
  debugButtonTextReset: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#ff4d6a",
  },
});
