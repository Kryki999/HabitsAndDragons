import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  useAnimatedReaction,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import HeroHexRadarChart from "@/components/HeroHexRadarChart";
import type { HeroHexStatId, HeroHexStats } from "@/constants/heroHexStats";

const STAT_LABELS_PL: Record<HeroHexStatId, string> = {
  strength: "Siła",
  agility: "Zwinność",
  intelligence: "Inteligencja",
  vitality: "Żywotność",
  spirit: "Duch",
  discipline: "Dyscyplina",
};

const STAT_ORDER: HeroHexStatId[] = [
  "strength",
  "agility",
  "intelligence",
  "vitality",
  "spirit",
  "discipline",
];

const YESTERDAY_FACTORS: Record<HeroHexStatId, number> = {
  strength: 0.91,
  agility: 0.88,
  intelligence: 0.93,
  vitality: 0.87,
  spirit: 0.95,
  discipline: 0.89,
};

function computeHexStats(
  strengthXP: number,
  agilityXP: number,
  intelligenceXP: number,
  streak: number,
  appLoginStreak: number,
): HeroHexStats {
  return {
    strength: Math.max(2, strengthXP / 6),
    agility: Math.max(2, agilityXP / 6),
    intelligence: Math.max(2, intelligenceXP / 6),
    vitality: Math.max(2, (strengthXP + agilityXP + intelligenceXP) / 25),
    spirit: Math.max(2, appLoginStreak * 2.8),
    discipline: Math.max(2, streak * 3.5),
  };
}

type Props = {
  onContinue: () => void;
};

export default function DailyRecapScreen({ onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const strengthXP = useGameStore((s) => s.strengthXP);
  const agilityXP = useGameStore((s) => s.agilityXP);
  const intelligenceXP = useGameStore((s) => s.intelligenceXP);
  const streak = useGameStore((s) => s.streak);
  const appLoginStreak = useGameStore((s) => s.appLoginStreak);
  const heroDisplayName = useGameStore((s) => s.heroDisplayName);

  const todayStats = useMemo(
    () => computeHexStats(strengthXP, agilityXP, intelligenceXP, streak, appLoginStreak),
    [strengthXP, agilityXP, intelligenceXP, streak, appLoginStreak],
  );

  const yesterdayStats = useMemo<HeroHexStats>(() => {
    const result = {} as HeroHexStats;
    for (const key of STAT_ORDER) {
      result[key] = todayStats[key] * YESTERDAY_FACTORS[key];
    }
    return result;
  }, [todayStats]);

  const gains = useMemo(
    () =>
      STAT_ORDER.map((key) => ({ id: key, delta: todayStats[key] - yesterdayStats[key] }))
        .filter((g) => g.delta > 0.05)
        .sort((a, b) => b.delta - a.delta),
    [todayStats, yesterdayStats],
  );

  const radarProgress = useSharedValue(0);
  const [animProg, setAnimProg] = useState(0);

  const headerScale = useSharedValue(0.82);
  const headerOpacity = useSharedValue(0);
  const gainsFade = useSharedValue(0);
  const btnOpacity = useSharedValue(0);
  const btnTranslateY = useSharedValue(28);

  useAnimatedReaction(
    () => radarProgress.value,
    (val) => runOnJS(setAnimProg)(val),
  );

  useEffect(() => {
    headerScale.value = withSpring(1, { damping: 16, stiffness: 180 });
    headerOpacity.value = withTiming(1, { duration: 550 });
    radarProgress.value = withDelay(650, withTiming(1, { duration: 2100, easing: Easing.out(Easing.cubic) }));
    gainsFade.value = withDelay(2300, withTiming(1, { duration: 550 }));
    btnOpacity.value = withDelay(2700, withTiming(1, { duration: 480 }));
    btnTranslateY.value = withDelay(2700, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStats = useMemo<HeroHexStats>(() => {
    const lerp = (a: number, b: number) => a + (b - a) * animProg;
    return {
      strength: lerp(yesterdayStats.strength, todayStats.strength),
      agility: lerp(yesterdayStats.agility, todayStats.agility),
      intelligence: lerp(yesterdayStats.intelligence, todayStats.intelligence),
      vitality: lerp(yesterdayStats.vitality, todayStats.vitality),
      spirit: lerp(yesterdayStats.spirit, todayStats.spirit),
      discipline: lerp(yesterdayStats.discipline, todayStats.discipline),
    };
  }, [animProg, todayStats, yesterdayStats]);

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ scale: headerScale.value }],
  }));

  const gainsAnimStyle = useAnimatedStyle(() => ({
    opacity: gainsFade.value,
    transform: [{ translateY: (1 - gainsFade.value) * 14 }],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnTranslateY.value }],
  }));

  const radarSize = Math.min(width * 0.58, 210);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#040210", "#0c0618", "#120a1e", "#0d0a14"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Side vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.65)", "transparent", "rgba(0,0,0,0.65)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.headerRow, headerAnimStyle]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🧙‍♂️</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Świt Nowego Dnia</Text>
            <Text style={styles.heroName}>{heroDisplayName ?? "Wędrowcze"}</Text>
            <Text style={styles.loreText}>
              Przetrwałeś kolejną noc.{"\n"}Twoje wczorajsze czyny przyniosły owoce.
            </Text>
          </View>
        </Animated.View>

        {/* Radar section */}
        <View style={styles.radarSection}>
          <Text style={styles.sectionLabel}>Wzrost Statystyk</Text>
          <View style={styles.radarWrap}>
            {/* Yesterday ring hint */}
            <Text style={styles.radarHint}>◀ wczoraj → dziś ▶</Text>
            <HeroHexRadarChart size={radarSize} stats={currentStats} />
          </View>
        </View>

        {/* Gains list */}
        <Animated.View style={[styles.gainsCard, gainsAnimStyle]}>
          <Text style={styles.gainsSectionTitle}>Wczorajsze Zdobycze</Text>
          {gains.map((g) => (
            <View key={g.id} style={styles.gainRow}>
              <View style={styles.gainDot} />
              <Text style={styles.gainLabel}>{STAT_LABELS_PL[g.id]}</Text>
              <Text style={styles.gainValue}>+{g.delta.toFixed(1)}</Text>
            </View>
          ))}
          {gains.length === 0 && (
            <Text style={styles.noGains}>Twoje statystyki oczekują na wyzwania dnia.</Text>
          )}
        </Animated.View>
      </ScrollView>

      {/* Fixed Continue Button */}
      <Animated.View style={[styles.btnContainer, { paddingBottom: insets.bottom + 20 }, btnAnimStyle]}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Kontynuuj"
        >
          <LinearGradient
            colors={["#2a1040", "#180828", "#0e0618"]}
            style={styles.ctaGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>Kontynuuj</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </LinearGradient>
          <View style={styles.ctaShadowBar} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#040210",
  },
  scrollContent: {
    paddingHorizontal: 22,
    alignItems: "center" as const,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 14,
    marginBottom: 28,
    width: "100%" as const,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#26103a",
    borderWidth: 2,
    borderColor: Colors.dark.gold + "66",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  headerText: {
    flex: 1,
    paddingTop: 2,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2.2,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  loreText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  radarSection: {
    alignItems: "center" as const,
    marginBottom: 20,
    width: "100%" as const,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  radarWrap: {
    alignItems: "center" as const,
  },
  radarHint: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
    fontStyle: "italic" as const,
  },
  gainsCard: {
    width: "100%" as const,
    backgroundColor: "rgba(16, 10, 26, 0.92)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    marginBottom: 16,
  },
  gainsSectionTitle: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginBottom: 14,
  },
  gainRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border + "40",
  },
  gainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.emerald,
  },
  gainLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: "600" as const,
  },
  gainValue: {
    fontSize: 17,
    fontWeight: "900" as const,
    color: Colors.dark.emerald,
    fontVariant: ["tabular-nums"] as ("tabular-nums")[],
  },
  noGains: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    paddingVertical: 10,
  },
  btnContainer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 20,
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.purple + "88",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  ctaArrow: {
    fontSize: 20,
    color: Colors.dark.gold,
  },
  ctaShadowBar: {
    height: 4,
    backgroundColor: Colors.dark.purple + "66",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});
