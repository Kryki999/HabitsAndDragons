/**
 * Dungeons / boss challenges UI (portrait cards). Wired to DUNGEON_CHALLENGES + computeDungeonWinChance.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Pressable,
  ImageBackground,
  useWindowDimensions,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DoorOpen, Info, Lock } from "lucide-react-native";
import Colors from "@/constants/colors";
import {
  DUNGEON_CHALLENGES,
  type DungeonChallengeConfig,
  type DungeonChallengeId,
} from "@/constants/gameplayConfig";
import { computeDungeonWinChance, computeDungeonWinChanceBreakdown } from "@/lib/gameEngine";
import type { GameState } from "@/types/game";
import {
  impactAsync,
  selectionAsync,
  ImpactFeedbackStyle,
} from "@/lib/hapticsGate";
import LootDetailModal, { type LootModalPayload } from "@/components/LootDetailModal";
import { resolveLootItemById } from "@/lib/itemCatalog";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import { LOOT_RARITY_ORDER } from "@/types/dungeonLoot";
import RarityItemSlot from "@/components/RarityItemSlot";
import SpriteAnimator from "@/components/SpriteAnimator";

const CHALLENGES_LIST = Object.values(DUNGEON_CHALLENGES);

/** Portrait card: width × (16/9) height ≈ tall phone poster. */
export const PORTRAIT_CARD_HEIGHT_RATIO = 16 / 9;

/** Wysokość paska lootu dopasowana do rzędu przycisku Fight (~padding 14×2 + treść). */
const LOOT_STRIP_ROW_HEIGHT = 48;
const LOOT_STRIP_ICON_SIZE = 32;

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
  /** When true, omit section title and hint (parent renders them above). */
  hideTitle?: boolean;
};

function sortedLootIdsForChallenge(challenge: DungeonChallengeConfig): string[] {
  const unique = [...new Set(challenge.lootTable)];
  unique.sort((a, b) => {
    const ea = resolveLootItemById(a);
    const eb = resolveLootItemById(b);
    const ra = ea?.rarity ?? "common";
    const rb = eb?.rarity ?? "common";
    const o = LOOT_RARITY_ORDER[ra] - LOOT_RARITY_ORDER[rb];
    if (o !== 0) return o;
    return a.localeCompare(b);
  });
  return unique;
}

function ChallengePortraitCard({
  challenge,
  cardWidth,
  cardHeight,
  delay,
  winChancePct,
  locked,
  canFight,
  onFight,
  engineState,
  onInspectLoot,
}: {
  challenge: DungeonChallengeConfig;
  cardWidth: number;
  cardHeight: number;
  delay: number;
  winChancePct: number;
  locked: boolean;
  canFight: boolean;
  onFight: () => void;
  engineState: Props["engineState"];
  onInspectLoot: (itemId: string) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chanceColor = winChanceColor(winChancePct);
  const lootIds = useMemo(() => sortedLootIdsForChallenge(challenge), [challenge]);

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

  const showWinBreakdown = useCallback(() => {
    const { alertMessage } = computeDungeonWinChanceBreakdown(
      engineState as GameState,
      challenge.id,
    );
    impactAsync(ImpactFeedbackStyle.Light);
    Alert.alert("Win chance breakdown", alertMessage);
  }, [engineState, challenge.id]);

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
        {challenge.bossSpriteSheet?.fullCard ? (
          <View style={styles.cardImage}>
            <LinearGradient
              colors={[challenge.accentColor + "66", "#0a1628", "#050c14"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.bossSpriteFullBleed} pointerEvents="none">
              <SpriteAnimator
                source={challenge.bossSpriteSheet.source}
                columns={challenge.bossSpriteSheet.columns}
                rows={challenge.bossSpriteSheet.rows}
                totalFrames={challenge.bossSpriteSheet.frameCount}
                fps={challenge.bossSpriteSheet.fps ?? 14}
                style={StyleSheet.absoluteFillObject}
                imageOpacity={locked ? 0.38 : 1}
              />
            </View>
            {locked ? (
              <View style={styles.lockVeil}>
                <Lock size={56} color="#ffffffcc" strokeWidth={2.4} />
                <Text style={styles.requiresLevel}>Requires Level {challenge.requiredPlayerLevel}</Text>
              </View>
            ) : (
              <View style={styles.unlockedRoot}>
                <LinearGradient
                  colors={["rgba(0,0,0,0.88)", "rgba(0,0,0,0.35)", "transparent"]}
                  locations={[0, 0.55, 1]}
                  style={styles.topGradient}
                />
                <View style={styles.topTitlesBlock} pointerEvents="box-none">
                  <Text style={styles.dungeonName}>{challenge.dungeonName}</Text>
                  <Text style={[styles.bossName, { color: challenge.accentColor }]}>{challenge.bossName}</Text>
                  <View style={styles.winChanceRow}>
                    <Text style={[styles.winChanceInline, { color: chanceColor }]}>
                      Win Chance: {winChancePct}%
                    </Text>
                    <Pressable
                      onPress={showWinBreakdown}
                      hitSlop={10}
                      style={({ pressed }) => [styles.infoIconBtn, pressed && styles.infoIconBtnPressed]}
                    >
                      <Info size={17} color={Colors.dark.cyan} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.unlockedSpacer} />

                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.94)"]}
                  locations={[0, 0.35, 1]}
                  style={styles.bottomGradient}
                >
                  {lootIds.length > 0 ? (
                    <View style={styles.lootStripCard}>
                      <LinearGradient
                        colors={[
                          "rgba(42,36,56,0.42)",
                          "rgba(26,21,36,0.36)",
                          "rgba(16,12,22,0.34)",
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.lootStripCardGradient}
                      >
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          nestedScrollEnabled
                          style={styles.lootStripScroll}
                          contentContainerStyle={styles.lootStripScrollContent}
                        >
                          {lootIds.map((id) => (
                            <Pressable
                              key={id}
                              onPress={() => {
                                selectionAsync();
                                onInspectLoot(id);
                              }}
                              style={styles.lootStripItemPress}
                            >
                              <RarityItemSlot itemId={id} size={LOOT_STRIP_ICON_SIZE} />
                            </Pressable>
                          ))}
                        </ScrollView>
                      </LinearGradient>
                    </View>
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
                        Fight (Cost: 1 Key)
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}
          </View>
        ) : (
        <ImageBackground
          source={challenge.bossImageAsset}
          style={styles.cardImage}
          imageStyle={[styles.cardImageInner, locked && styles.cardImageLockedSilhouette]}
        >
          {challenge.bossSpriteSheet ? (
            <View style={styles.bossSpriteOverlay} pointerEvents="none">
              <View style={styles.bossSpriteFrame}>
                <SpriteAnimator
                  source={challenge.bossSpriteSheet.source}
                  columns={challenge.bossSpriteSheet.columns}
                  rows={challenge.bossSpriteSheet.rows}
                  totalFrames={challenge.bossSpriteSheet.frameCount}
                  fps={challenge.bossSpriteSheet.fps ?? 14}
                  style={StyleSheet.absoluteFillObject}
                  imageOpacity={locked ? 0.38 : 1}
                />
              </View>
            </View>
          ) : null}
          {locked ? (
            <View style={styles.lockVeil}>
              <Lock size={56} color="#ffffffcc" strokeWidth={2.4} />
              <Text style={styles.requiresLevel}>Requires Level {challenge.requiredPlayerLevel}</Text>
            </View>
          ) : (
            <View style={styles.unlockedRoot}>
              <LinearGradient
                colors={["rgba(0,0,0,0.88)", "rgba(0,0,0,0.35)", "transparent"]}
                locations={[0, 0.55, 1]}
                style={styles.topGradient}
              />
              <View style={styles.topTitlesBlock} pointerEvents="box-none">
                <Text style={styles.dungeonName}>{challenge.dungeonName}</Text>
                <Text style={[styles.bossName, { color: challenge.accentColor }]}>{challenge.bossName}</Text>
                <View style={styles.winChanceRow}>
                  <Text style={[styles.winChanceInline, { color: chanceColor }]}>
                    Win Chance: {winChancePct}%
                  </Text>
                  <Pressable
                    onPress={showWinBreakdown}
                    hitSlop={10}
                    style={({ pressed }) => [styles.infoIconBtn, pressed && styles.infoIconBtnPressed]}
                  >
                    <Info size={17} color={Colors.dark.cyan} strokeWidth={2.4} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.unlockedSpacer} />

              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.94)"]}
                locations={[0, 0.35, 1]}
                style={styles.bottomGradient}
              >
                {lootIds.length > 0 ? (
                  <View style={styles.lootStripCard}>
                    <LinearGradient
                      colors={[
                        "rgba(42,36,56,0.42)",
                        "rgba(26,21,36,0.36)",
                        "rgba(16,12,22,0.34)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.lootStripCardGradient}
                    >
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        nestedScrollEnabled
                        style={styles.lootStripScroll}
                        contentContainerStyle={styles.lootStripScrollContent}
                      >
                        {lootIds.map((id) => (
                          <Pressable
                            key={id}
                            onPress={() => {
                              selectionAsync();
                              onInspectLoot(id);
                            }}
                            style={styles.lootStripItemPress}
                          >
                            <RarityItemSlot itemId={id} size={LOOT_STRIP_ICON_SIZE} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </LinearGradient>
                  </View>
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
                      Fight (Cost: 1 Key)
                    </Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          )}
        </ImageBackground>
        )}
      </View>
    </Animated.View>
  );
}

export default function DungeonsSection({
  engineState,
  playerLevel,
  dungeonKeys,
  onFight,
  hideTitle = false,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => Math.min(Math.round(screenWidth * 0.72), 300), [screenWidth]);
  const cardHeight = useMemo(() => Math.round(cardWidth * PORTRAIT_CARD_HEIGHT_RATIO), [cardWidth]);
  const cardGap = 14;
  const snapInterval = cardWidth + cardGap;

  const [lootPayload, setLootPayload] = useState<LootModalPayload | null>(null);

  const chances = useMemo(() => {
    const stateSlice = engineState as GameState;
    const out: Record<DungeonChallengeId, number> = {} as Record<DungeonChallengeId, number>;
    for (const c of CHALLENGES_LIST) {
      const raw = computeDungeonWinChance(stateSlice, c.id);
      out[c.id] = Math.round(raw * 100);
    }
    return out;
  }, [engineState]);

  const openLootInspect = useCallback((itemId: string) => {
    const entry = resolveLootItemById(itemId);
    if (!entry) return;
    impactAsync(ImpactFeedbackStyle.Light);
    setLootPayload({ type: "item", entry });
  }, []);

  const canFightGlobal = dungeonKeys > 0;

  return (
    <View style={[styles.block, hideTitle && styles.blockCompact]}>
      {!hideTitle ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Dungeons</Text>
          </View>
          <Text style={styles.sectionHint}>Boss raids — portrait challenges · 1 key per fight</Text>
        </>
      ) : null}

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
              engineState={engineState}
              onInspectLoot={openLootInspect}
            />
          </View>
        ))}
      </ScrollView>

      <LootDetailModal
        visible={lootPayload !== null}
        onClose={() => setLootPayload(null)}
        payload={lootPayload}
        accentHint={
          lootPayload?.type === "item" ? LOOT_RARITY_COLOR[lootPayload.entry.rarity] : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 12,
  },
  blockCompact: {
    marginTop: 0,
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
    opacity: 0.95,
  },
  cardImage: {
    width: "100%" as const,
    height: "100%" as const,
  },
  cardImageInner: {
    resizeMode: "cover" as const,
  },
  cardImageLockedSilhouette: {
    opacity: 0.38,
  },
  /** Tidecaller full-card spritesheet (no static PNG). */
  bossSpriteFullBleed: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  /** Full card; sprite sits above static art, below UI (z-index via order + children). */
  bossSpriteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  /** Lower-center: animated character over the painted goblin / water scene. */
  bossSpriteFrame: {
    position: "absolute" as const,
    left: "0%" as const,
    right: "0%" as const,
    bottom: "0%" as const,
    height: "100%" as const,
  },
  lockVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.78)",
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
  unlockedRoot: {
    flex: 1,
    zIndex: 1,
  },
  topGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: "46%" as const,
    zIndex: 1,
  },
  topTitlesBlock: {
    paddingTop: 12,
    paddingHorizontal: 14,
    zIndex: 2,
  },
  dungeonName: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase" as const,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bossName: {
    fontSize: 21,
    fontWeight: "800" as const,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  winChanceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  winChanceInline: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  infoIconBtn: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  infoIconBtnPressed: {
    opacity: 0.75,
  },
  unlockedSpacer: {
    flex: 1,
  },
  bottomGradient: {
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 12,
    justifyContent: "flex-end" as const,
  },
  lootStripCard: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden" as const,
    alignSelf: "stretch" as const,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "36",
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  lootStripCardGradient: {
    height: LOOT_STRIP_ROW_HEIGHT,
    justifyContent: "center" as const,
  },
  lootStripScroll: {
    height: LOOT_STRIP_ROW_HEIGHT,
  },
  lootStripScrollContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    paddingHorizontal: 10,
    minHeight: LOOT_STRIP_ROW_HEIGHT,
  },
  lootStripItemPress: {
    marginRight: 8,
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
