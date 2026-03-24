/**
 * Dungeons / boss challenges UI (portrait cards). Wired to DUNGEON_CHALLENGES + computeDungeonWinChance.
 */
import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Pressable,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DoorOpen, Lock } from "lucide-react-native";
import Colors from "@/constants/colors";
import {
  DUNGEON_CHALLENGES,
  GEAR_ITEMS,
  type DungeonChallengeConfig,
  type DungeonChallengeId,
} from "@/constants/gameplayConfig";
import { computeDungeonWinChance } from "@/lib/gameEngine";
import type { GameState } from "@/types/game";
import {
  impactAsync,
  selectionAsync,
  ImpactFeedbackStyle,
} from "@/lib/hapticsGate";

const CHALLENGES_LIST = Object.values(DUNGEON_CHALLENGES);

/** Portrait card: width × (16/9) height ≈ tall phone poster. */
export const PORTRAIT_CARD_HEIGHT_RATIO = 16 / 9;

export function winChanceColor(pct: number): string {
  if (pct > 70) return "#3dd68c";
  if (pct > 40) return "#ffc845";
  return "#ff5c7a";
}

type Props = {
  /** Snapshot fields used by computeDungeonWinChance */
  engineState: Pick<
    GameState,
    | "strengthXP"
    | "agilityXP"
    | "intelligenceXP"
    | "activeDragonId"
    | "equippedOutfitId"
    | "equippedRelicId"
  >;
  playerLevel: number;
  dungeonKeys: number;
  onFight: (challenge: DungeonChallengeConfig) => void;
};

function ChallengePortraitCard({
  challenge,
  cardWidth,
  cardHeight,
  delay,
  winChancePct,
  locked,
  canFight,
  onFight,
}: {
  challenge: DungeonChallengeConfig;
  cardWidth: number;
  cardHeight: number;
  delay: number;
  winChancePct: number;
  locked: boolean;
  canFight: boolean;
  onFight: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chanceColor = winChanceColor(winChancePct);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 48,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [delay, scaleAnim, fadeAnim]);

  const lootPreview = challenge.lootTable
    .map((id) => GEAR_ITEMS[id]?.name ?? id)
    .slice(0, 3)
    .join(" · ");

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        { width: cardWidth },
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.cardShell,
          locked && styles.cardShellLocked,
          { height: cardHeight, borderColor: challenge.accentColor + (locked ? "33" : "66") },
        ]}
      >
        <ImageBackground
          source={challenge.bossImageAsset}
          style={styles.cardImage}
          imageStyle={styles.cardImageInner}
        >
          {locked ? (
            <View style={styles.lockVeil}>
              <Lock size={52} color="#ffffffcc" strokeWidth={2.4} />
              <Text style={styles.requiresLevel}>Requires Level {challenge.requiredPlayerLevel}</Text>
            </View>
          ) : null}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)"]}
            locations={[0.35, 0.65, 1]}
            style={styles.cardGradient}
          >
            <Text style={styles.dungeonName}>{challenge.dungeonName}</Text>
            <Text style={[styles.bossName, { color: challenge.accentColor }]}>{challenge.bossName}</Text>
            <Text style={styles.weakLabel}>
              Weakness: {challenge.weaknessStat.toUpperCase()} · Boss Lv {challenge.bossLevel}
            </Text>
            <View style={[styles.winChancePill, { borderColor: chanceColor + "aa" }]}>
              <Text style={[styles.winChanceText, { color: chanceColor }]}>
                Win chance: {winChancePct}%
              </Text>
            </View>
            {lootPreview ? (
              <Text style={styles.lootHint} numberOfLines={2}>
                Possible loot: {lootPreview}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                if (locked || !canFight) return;
                selectionAsync();
                impactAsync(ImpactFeedbackStyle.Medium);
                onFight();
              }}
              disabled={locked || !canFight}
              style={({ pressed }) => [
                styles.fightOuter,
                (locked || !canFight) && styles.fightOuterDisabled,
                pressed && canFight && !locked && styles.fightOuterPressed,
              ]}
            >
              <LinearGradient
                colors={locked || !canFight ? ["#444", "#2a2a2a"] : [...Colors.gradients.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fightGradient}
              >
                <DoorOpen size={18} color={locked || !canFight ? "#666" : "#1a1228"} />
                <Text style={[styles.fightLabel, (locked || !canFight) && styles.fightLabelDisabled]}>
                  {locked ? `Locked · Lv ${challenge.requiredPlayerLevel}` : "Fight (Cost: 1 Key)"}
                </Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </ImageBackground>
      </View>
    </Animated.View>
  );
}

export default function DungeonsSection({
  engineState,
  playerLevel,
  dungeonKeys,
  onFight,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => Math.min(Math.round(screenWidth * 0.72), 300), [screenWidth]);
  const cardHeight = useMemo(() => Math.round(cardWidth * PORTRAIT_CARD_HEIGHT_RATIO), [cardWidth]);
  const cardGap = 14;
  const snapInterval = cardWidth + cardGap;

  const chances = useMemo(() => {
    const stateSlice = engineState as GameState;
    const out: Record<DungeonChallengeId, number> = {} as Record<DungeonChallengeId, number>;
    for (const c of CHALLENGES_LIST) {
      const raw = computeDungeonWinChance(stateSlice, c.id);
      out[c.id] = Math.round(raw * 100);
    }
    return out;
  }, [engineState]);

  const canFightGlobal = dungeonKeys > 0;

  return (
    <View style={styles.block}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Dungeons</Text>
      </View>
      <Text style={styles.sectionHint}>Boss raids — portrait challenges · 1 key per fight</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        nestedScrollEnabled
      >
        {CHALLENGES_LIST.map((challenge, index) => (
          <View key={challenge.id} style={[styles.carouselItem, { width: cardWidth, marginRight: cardGap }]}>
            <ChallengePortraitCard
              challenge={challenge}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              delay={200 + index * 90}
              winChancePct={chances[challenge.id] ?? 0}
              locked={playerLevel < challenge.requiredPlayerLevel}
              canFight={canFightGlobal}
              onFight={() => onFight(challenge)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 28,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 12,
  },
  carouselContent: {
    paddingBottom: 8,
    paddingRight: 4,
  },
  carouselItem: {},
  cardWrap: {},
  cardShell: {
    borderRadius: 20,
    overflow: "hidden" as const,
    borderWidth: 2,
    backgroundColor: Colors.dark.background,
  },
  cardShellLocked: {
    opacity: 0.92,
  },
  cardImage: {
    width: "100%" as const,
    height: "100%" as const,
  },
  cardImageInner: {
    resizeMode: "cover" as const,
  },
  lockVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 2,
  },
  requiresLevel: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center" as const,
    paddingHorizontal: 16,
  },
  cardGradient: {
    flex: 1,
    justifyContent: "flex-end" as const,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 48,
  },
  dungeonName: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.1,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  bossName: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  weakLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.82)",
    marginBottom: 10,
  },
  winChancePill: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "rgba(0,0,0,0.45)",
    marginBottom: 8,
  },
  winChanceText: {
    fontSize: 15,
    fontWeight: "800" as const,
    letterSpacing: 0.3,
  },
  lootHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
    lineHeight: 14,
  },
  fightOuter: {
    borderRadius: 14,
    overflow: "hidden" as const,
    alignSelf: "stretch" as const,
  },
  fightOuterDisabled: {
    opacity: 0.5,
  },
  fightOuterPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  fightGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  fightLabel: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#1a1228",
  },
  fightLabelDisabled: {
    color: "#888",
  },
});
