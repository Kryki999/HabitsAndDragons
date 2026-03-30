import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Sparkles, Trophy } from "lucide-react-native";
import Colors from "@/constants/colors";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import { GEAR_ITEMS, type GearItemId } from "@/constants/gameplayConfig";
import { LootGlyph } from "@/lib/lootGlyph";
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "@/lib/hapticsGate";

/** Constants for the roulette strip */
const WIN_IDX = 34;
const TOTAL_ITEMS = 40;
const ITEM_WIDTH = 82;
const ITEM_HEIGHT = 104;
const ITEM_GAP = 8;
const ITEM_TOTAL = ITEM_WIDTH + ITEM_GAP;
const ROULETTE_ANIM_DURATION_MS = 5000;

const RARITY_LABEL: Record<string, string> = {
  common: "Pospolity",
  uncommon: "Rzadki",
  rare: "Elitarny",
  epic: "Epicki",
  legendary: "Legendarny",
};

type Phase = "chest" | "spinning" | "reveal";

interface Props {
  visible: boolean;
  bossName: string;
  dungeonName: string;
  accentColor: string;
  lootTable: GearItemId[];
  wonItemId: string;
  onCollect: () => void;
}

function buildRouletteStrip(lootTable: GearItemId[], wonItemId: GearItemId): GearItemId[] {
  const pool = lootTable.length > 0 ? lootTable : ([wonItemId] as GearItemId[]);
  return Array.from({ length: TOTAL_ITEMS }, (_, i) =>
    i === WIN_IDX ? wonItemId : pool[Math.floor(Math.random() * pool.length)],
  );
}

export default function BossVictoryLootModal({
  visible,
  bossName,
  dungeonName,
  accentColor,
  lootTable,
  wonItemId,
  onCollect,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>("chest");
  const [rouletteStrip, setRouletteStrip] = useState<GearItemId[]>([]);

  /* Chest animations */
  const chestPulse = useRef(new Animated.Value(1)).current;
  const chestOpacity = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  /* Roulette animation */
  const stripTX = useRef(new Animated.Value(0)).current;
  const rouletteFade = useRef(new Animated.Value(0)).current;

  /* Reveal animations */
  const revealScale = useRef(new Animated.Value(0.5)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  const wonItem = useMemo(
    () => GEAR_ITEMS[wonItemId as GearItemId] ?? null,
    [wonItemId],
  );

  /* ─── Reset on open ─────────────────────────────────────────── */
  useEffect(() => {
    if (!visible) return;

    setPhase("chest");
    chestOpacity.setValue(0);
    headerFade.setValue(0);
    stripTX.setValue(0);
    rouletteFade.setValue(0);
    revealScale.setValue(0.5);
    revealOpacity.setValue(0);
    glowPulse.setValue(0.5);
    btnFade.setValue(0);

    setRouletteStrip(buildRouletteStrip(lootTable, wonItemId as GearItemId));

    // Fade in header and chest
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(chestOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Chest pulse loop ──────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "chest") {
      chestPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chestPulse, {
          toValue: 1.07,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(chestPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, chestPulse]);

  /* ─── Reveal glow loop ──────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "reveal") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, glowPulse]);

  /* ─── Handle tap on chest ───────────────────────────────────── */
  const handleOpenChest = useCallback(() => {
    if (phase !== "chest") return;
    impactAsync(ImpactFeedbackStyle.Heavy);

    // Fade out chest
    Animated.timing(chestOpacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setPhase("spinning");

      // Fade roulette in
      Animated.timing(rouletteFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // finalTX: position where WIN_IDX item center = screenWidth / 2
      const finalTX =
        screenWidth / 2 - WIN_IDX * ITEM_TOTAL - ITEM_WIDTH / 2;
      // small natural variance
      const variance = (Math.random() - 0.5) * 36;

      // Rapid haptic during spin
      let hapticTick = 0;
      const hapticId = setInterval(() => {
        hapticTick++;
        impactAsync(
          hapticTick % 5 === 0
            ? ImpactFeedbackStyle.Heavy
            : ImpactFeedbackStyle.Light,
        );
      }, 120);
      setTimeout(() => clearInterval(hapticId), 2200);

      Animated.timing(stripTX, {
        toValue: finalTX + variance,
        duration: ROULETTE_ANIM_DURATION_MS,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }).start(() => {
        // Win haptic
        setTimeout(() => {
          impactAsync(ImpactFeedbackStyle.Heavy);
          notificationAsync(NotificationFeedbackType.Success);
        }, 180);

        // Transition to reveal after brief pause
        setTimeout(() => {
          setPhase("reveal");
          Animated.parallel([
            Animated.spring(revealScale, {
              toValue: 1,
              friction: 5,
              tension: 70,
              useNativeDriver: true,
            }),
            Animated.timing(revealOpacity, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => {
            Animated.timing(btnFade, {
              toValue: 1,
              duration: 350,
              delay: 300,
              useNativeDriver: true,
            }).start();
          });
        }, 500);
      });
    });
  }, [phase, screenWidth, chestOpacity, rouletteFade, stripTX, revealScale, revealOpacity, btnFade]);

  if (!visible) return null;

  const rarityColor = wonItem ? LOOT_RARITY_COLOR[wonItem.rarity] : accentColor;

  /* ─── Roulette cursor position ──────────────────────────────── */
  const cursorX = screenWidth / 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={phase === "reveal" ? onCollect : undefined}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Background */}
        {Platform.OS === "web" ? (
          <View style={[StyleSheet.absoluteFill, styles.webBg]} />
        ) : (
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={["rgba(5,2,12,0.75)", "rgba(5,2,12,0.4)", "rgba(5,2,12,0.82)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Glow orbs */}
        <View style={[styles.bgOrb1, { backgroundColor: accentColor + "14" }]} />
        <View style={[styles.bgOrb2, { backgroundColor: rarityColor + "10" }]} />

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerBadge}>
            <Trophy size={14} color={Colors.dark.gold} />
            <Text style={styles.headerBadgeText}>{dungeonName}</Text>
          </View>
          <Text style={styles.victoryText}>ZWYCIĘSTWO!</Text>
          <Text style={[styles.bossText, { color: accentColor }]}>
            {bossName} pokonany
          </Text>
        </Animated.View>

        {/* ─── PHASE: CHEST ──────────────────────────────────────── */}
        {phase === "chest" && (
          <Animated.View style={[styles.chestPhase, { opacity: chestOpacity }]}>
            <View style={styles.chestGlowWrap}>
              <Animated.View
                style={[
                  styles.chestGlowRing,
                  {
                    borderColor: accentColor + "55",
                    shadowColor: accentColor,
                    transform: [{ scale: chestPulse }],
                  },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: chestPulse }] }}>
                <Image
                  source={require("@/assets/images/boss_chest.png")}
                  style={styles.chestImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            <Text style={styles.tapHint}>✨ Dotknij, aby otworzyć ✨</Text>

            <Pressable
              onPress={handleOpenChest}
              style={({ pressed }) => [
                styles.openBtn,
                pressed && styles.openBtnPressed,
              ]}
            >
              <LinearGradient
                colors={[accentColor + "ee", accentColor + "99"]}
                style={styles.openBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Sparkles size={20} color="#fff" />
                <Text style={styles.openBtnText}>Otwórz Skrzynię Bossa</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* ─── PHASE: ROULETTE ───────────────────────────────────── */}
        {phase === "spinning" && (
          <Animated.View style={[styles.roulettePhase, { opacity: rouletteFade }]}>
            <Text style={styles.spinningLabel}>Losowanie nagrody…</Text>

            {/* Roulette strip container */}
            <View style={styles.rouletteOuter}>
              {/* Left fade */}
              <LinearGradient
                colors={["rgba(5,2,12,1)", "transparent"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.edgeFadeLeft}
                pointerEvents="none"
              />
              {/* Right fade */}
              <LinearGradient
                colors={["transparent", "rgba(5,2,12,1)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.edgeFadeRight}
                pointerEvents="none"
              />

              {/* Center cursor line */}
              <View
                style={[
                  styles.cursorLine,
                  { left: cursorX - 1, borderColor: Colors.dark.gold },
                ]}
                pointerEvents="none"
              />
              {/* Cursor triangles */}
              <View
                style={[
                  styles.cursorArrowTop,
                  {
                    left: cursorX - 7,
                    borderBottomColor: Colors.dark.gold,
                  },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.cursorArrowBottom,
                  {
                    left: cursorX - 7,
                    borderTopColor: Colors.dark.gold,
                  },
                ]}
                pointerEvents="none"
              />

              {/* Scrolling strip */}
              <View style={styles.rouletteClip}>
                <Animated.View
                  style={[
                    styles.rouletteStrip,
                    { transform: [{ translateX: stripTX }] },
                  ]}
                >
                  {rouletteStrip.map((itemId, index) => {
                    const item = GEAR_ITEMS[itemId];
                    if (!item) return null;
                    const rColor = LOOT_RARITY_COLOR[item.rarity];
                    const isWinner = index === WIN_IDX;
                    return (
                      <View
                        key={`${itemId}_${index}`}
                        style={[
                          styles.rouletteItem,
                          {
                            width: ITEM_WIDTH,
                            height: ITEM_HEIGHT,
                            marginRight: ITEM_GAP,
                            borderColor: rColor + (isWinner ? "ff" : "55"),
                            backgroundColor: isWinner
                              ? rColor + "22"
                              : rColor + "0d",
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={[rColor + "18", "transparent"]}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                        />
                        <LootGlyph icon={item.icon} size={34} color={rColor} />
                        <Text
                          style={[styles.rouletteItemName, { color: rColor + "ee" }]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={[styles.rarityDot, { backgroundColor: rColor }]}
                        />
                      </View>
                    );
                  })}
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ─── PHASE: REVEAL ─────────────────────────────────────── */}
        {phase === "reveal" && wonItem && (
          <Animated.View
            style={[
              styles.revealPhase,
              { opacity: revealOpacity, transform: [{ scale: revealScale }] },
            ]}
          >
            {/* Animated glow ring */}
            <Animated.View
              style={[
                styles.revealGlowRing,
                {
                  borderColor: rarityColor + "55",
                  shadowColor: rarityColor,
                  opacity: glowPulse,
                },
              ]}
            />

            {/* Item icon halo */}
            <View
              style={[
                styles.revealHalo,
                {
                  borderColor: rarityColor + "99",
                  shadowColor: rarityColor,
                },
              ]}
            >
              <LinearGradient
                colors={[rarityColor + "40", Colors.dark.surface + "dd"]}
                style={styles.revealHaloInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LootGlyph icon={wonItem.icon} size={60} color={rarityColor} />
              </LinearGradient>
            </View>

            {/* Rarity badge */}
            <View
              style={[
                styles.revealRarityBadge,
                {
                  borderColor: rarityColor + "aa",
                  backgroundColor: rarityColor + "1e",
                },
              ]}
            >
              <Text style={[styles.revealRarityText, { color: rarityColor }]}>
                ✦ {(RARITY_LABEL[wonItem.rarity] ?? wonItem.rarity).toUpperCase()} ✦
              </Text>
            </View>

            <Text style={[styles.revealName, { color: rarityColor }]}>
              {wonItem.name}
            </Text>
            <Text style={styles.revealDescription}>{wonItem.description}</Text>

            {/* Slot tag */}
            <View style={styles.revealMetaRow}>
              <View
                style={[
                  styles.slotPill,
                  {
                    borderColor: rarityColor + "66",
                    backgroundColor: rarityColor + "14",
                  },
                ]}
              >
                <Text style={[styles.slotPillText, { color: rarityColor }]}>
                  {wonItem.itemSlot === "outfit" ? "⚔️  Strój" : "💎  Relikwia"}
                </Text>
              </View>
            </View>

            {/* Collect button */}
            <Animated.View style={[styles.collectWrap, { opacity: btnFade }]}>
              <Pressable
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Medium);
                  onCollect();
                }}
                style={({ pressed }) => [
                  styles.collectBtn,
                  pressed && styles.collectBtnPressed,
                ]}
              >
                <LinearGradient
                  colors={[...Colors.gradients.gold]}
                  style={styles.collectGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Trophy size={18} color="#1a1228" strokeWidth={2.5} />
                  <Text style={styles.collectText}>Zbierz Łup</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  webBg: {
    backgroundColor: "rgba(5,2,12,0.97)",
  },
  bgOrb1: {
    position: "absolute" as const,
    top: "15%" as const,
    left: "10%" as const,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  bgOrb2: {
    position: "absolute" as const,
    bottom: "18%" as const,
    right: "8%" as const,
    width: 180,
    height: 180,
    borderRadius: 90,
  },

  /* ─ Header ─────────────────────────────────────────────── */
  header: {
    position: "absolute" as const,
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center" as const,
  },
  headerBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.dark.surface + "cc",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
    marginBottom: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  victoryText: {
    fontSize: 38,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 3,
    textShadowColor: Colors.dark.gold + "88",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  bossText: {
    fontSize: 15,
    fontWeight: "600" as const,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  /* ─ Chest phase ─────────────────────────────────────────── */
  chestPhase: {
    alignItems: "center" as const,
    paddingHorizontal: 32,
    marginTop: 40,
  },
  chestGlowWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 28,
  },
  chestGlowRing: {
    position: "absolute" as const,
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.6,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  chestImage: {
    width: 200,
    height: 200,
  },
  tapHint: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
    marginBottom: 22,
    letterSpacing: 0.3,
  },
  openBtn: {
    borderRadius: 18,
    overflow: "hidden" as const,
    width: 280,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  openBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  openBtnGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  openBtnText: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.3,
  },

  /* ─ Roulette phase ──────────────────────────────────────── */
  roulettePhase: {
    alignItems: "center" as const,
    width: "100%" as const,
    marginTop: 30,
  },
  spinningLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 18,
  },
  rouletteOuter: {
    width: "100%" as const,
    height: ITEM_HEIGHT + 28,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  rouletteClip: {
    width: "100%" as const,
    height: ITEM_HEIGHT,
    overflow: "hidden" as const,
    alignItems: "flex-start" as const,
  },
  rouletteStrip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingLeft: 0,
  },
  rouletteItem: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
    overflow: "hidden" as const,
  },
  rouletteItemName: {
    fontSize: 10,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    lineHeight: 13,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  edgeFadeLeft: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 64,
    zIndex: 5,
  },
  edgeFadeRight: {
    position: "absolute" as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: 64,
    zIndex: 5,
  },
  cursorLine: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    width: 2,
    borderWidth: 1.5,
    borderRadius: 1,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOpacity: 0.9,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  cursorArrowTop: {
    position: "absolute" as const,
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    zIndex: 11,
  },
  cursorArrowBottom: {
    position: "absolute" as const,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    zIndex: 11,
  },

  /* ─ Reveal phase ────────────────────────────────────────── */
  revealPhase: {
    alignItems: "center" as const,
    paddingHorizontal: 28,
    marginTop: 30,
    maxWidth: 380,
    width: "100%" as const,
  },
  revealGlowRing: {
    position: "absolute" as const,
    top: -20,
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.8,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  revealHalo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.7,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  revealHaloInner: {
    width: 114,
    height: 114,
    borderRadius: 57,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  revealRarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  revealRarityText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  revealName: {
    fontSize: 24,
    fontWeight: "800" as const,
    textAlign: "center" as const,
    marginBottom: 8,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  revealDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    marginBottom: 14,
  },
  revealMetaRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 24,
  },
  slotPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  slotPillText: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.4,
  },
  collectWrap: {
    width: "100%" as const,
  },
  collectBtn: {
    borderRadius: 18,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  collectBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  collectGradient: {
    paddingVertical: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 10,
  },
  collectText: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#1a1228",
    letterSpacing: 0.4,
  },
});
