import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
  Pressable,
  Alert,
  useWindowDimensions,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Plus,
  RotateCcw,
  Coins,
  Key,
  Lock,
  Snowflake,
  AlertTriangle,
  Swords,
} from "lucide-react-native";
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "@/lib/hapticsGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { DUNGEON_KEY_GOLD_PRICE } from "@/lib/economy";
import type { StatType } from "@/types/game";
import {
  DRAGON_CONFIGS,
  DUNGEON_CHALLENGES,
  ELIXIR_OF_TIME_GOLD_COST,
  type DragonConfig,
  type DragonId,
  type DungeonChallengeConfig,
  type DungeonChallengeId,
} from "@/constants/gameplayConfig";
import BossVictoryLootModal from "@/components/BossVictoryLootModal";
import DungeonsSection, { PORTRAIT_CARD_HEIGHT_RATIO } from "@/components/dungeons";
import SectionBanner, { SectionBannerCounter } from "@/components/SectionBanner";
import BattleSimulationModal, {
  type BattleApiResult,
} from "@/components/BattleSimulationModal";
import GuideInfoModal from "@/components/GuideInfoModal";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { pickCloudGameState } from "@/lib/cloudState";

const DRAGON_LIST = Object.values(DRAGON_CONFIGS);

const DRAGONS_BANNER_BG = require("@/assets/images/dragons_bg.png");
const DUNGEONS_BANNER_BG = require("@/assets/images/dungeons_bg.png");

const DUNGEONS_GUIDE_BODY =
  "Keys are required to fight bosses. Defeat them to earn epic loot and Relics. Pay attention to boss weaknesses to increase your win chance.";

const DRAGONS_GUIDE_BODY =
  "Maintain your daily habit streak to unlock powerful dragons. Only one dragon can be active at a time, providing global buffs. Use Freeze Potions to protect your streak on bad days.";

function formatSwitchCooldownRemaining(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function PortraitDragonCard({
  dragon,
  streak,
  activeDragonId,
  cardWidth,
  cardHeight,
  delay,
  switchCooldownLabel,
  onSetActive,
}: {
  dragon: DragonConfig;
  streak: number;
  activeDragonId: string | null;
  cardWidth: number;
  cardHeight: number;
  delay: number;
  switchCooldownLabel: string | null;
  onSetActive: (id: DragonId) => void;
}) {
  const unlocked = streak >= dragon.unlockStreak;
  const isActive = activeDragonId === dragon.id;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.45)).current;

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

  useEffect(() => {
    if (!isActive || !unlocked) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.95,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, unlocked, glowAnim]);

  const goldPct = Math.round((dragon.buffs.goldMultiplier - 1) * 100);
  const keyPct = Math.round(dragon.buffs.keyDropChanceBonus * 100);
  const winPct = Math.round(dragon.buffs.bossWinChanceBonus * 100);

  const canPressSet = unlocked && !isActive && !switchCooldownLabel;

  const shellBorder = {
    height: cardHeight,
    borderColor: isActive ? Colors.dark.gold + "aa" : dragon.accentColor + "55",
    borderWidth: isActive ? 3 : 2,
  };

  if (!unlocked) {
    return (
      <Animated.View
        style={[
          styles.portraitCardWrap,
          { width: cardWidth },
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.portraitCardShell, shellBorder]}>
          <ImageBackground
            source={dragon.imageAsset}
            style={styles.portraitImage}
            imageStyle={[styles.portraitImageInner, styles.portraitImageLockedSilhouette]}
          >
            <View style={styles.dragonLockVeil}>
              <Lock size={56} color="#ffffffcc" strokeWidth={2.6} />
              <Text style={styles.dragonLockReq}>
                Requires {dragon.unlockStreak} 🔥 Streak
              </Text>
            </View>
          </ImageBackground>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.portraitCardWrap,
        { width: cardWidth },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {isActive ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeEpicRing,
            {
              opacity: glowAnim,
              borderColor: Colors.dark.gold + "cc",
              shadowColor: Colors.dark.gold,
            },
          ]}
        />
      ) : null}
      <View style={[styles.portraitCardShell, shellBorder]}>
        <ImageBackground
          source={dragon.imageAsset}
          style={styles.portraitImage}
          imageStyle={styles.portraitImageInner}
        >
          <View style={styles.dragonUnlockedRoot}>
            <LinearGradient
              colors={["rgba(0,0,0,0.88)", "rgba(0,0,0,0.35)", "transparent"]}
              locations={[0, 0.55, 1]}
              style={styles.dragonTopGradient}
            />
            <View style={styles.dragonTopTitles}>
              <Text style={styles.portraitDragonName}>{dragon.name}</Text>
              <Text style={[styles.portraitDragonSub, { color: dragon.accentColor + "ee" }]}>
                {dragon.subtitle}
              </Text>
            </View>
            <View style={styles.dragonUnlockedSpacer} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.92)"]}
              locations={[0.25, 0.55, 1]}
              style={styles.portraitGradientBottom}
            >
              <View style={styles.buffRow}>
                <View style={styles.buffChip}>
                  <View style={styles.buffIconWrap}>
                    <Coins size={18} color={Colors.dark.gold} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.buffText}>+{goldPct}% gold</Text>
                </View>
                <View style={styles.buffChip}>
                  <View style={styles.buffIconWrap}>
                    <Key size={18} color={Colors.dark.gold} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.buffText}>+{keyPct}% key</Text>
                </View>
                <View style={styles.buffChip}>
                  <View style={styles.buffIconWrap}>
                    <Swords size={18} color={Colors.dark.emerald} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.buffText}>+{winPct}% win</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  if (!canPressSet) {
                    if (switchCooldownLabel) {
                      Alert.alert("Dragon cooldown", `Wait ${switchCooldownLabel} to switch companion.`);
                    }
                    return;
                  }
                  impactAsync(ImpactFeedbackStyle.Medium);
                  onSetActive(dragon.id);
                }}
                style={({ pressed }) => [
                  styles.setActiveBtn,
                  (!canPressSet || isActive) && styles.setActiveBtnMuted,
                  pressed && canPressSet && !isActive && styles.setActiveBtnPressed,
                ]}
              >
                <LinearGradient
                  colors={
                    isActive
                      ? [Colors.dark.gold + "44", Colors.dark.gold + "22"]
                      : canPressSet
                        ? [...Colors.gradients.purple]
                        : ["#333", "#222"]
                  }
                  style={styles.setActiveGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.setActiveLabel, isActive && { color: Colors.dark.gold }]}>
                    {isActive ? "Active companion" : "Set as Active"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </View>
        </ImageBackground>
      </View>
    </Animated.View>
  );
}

export default function DragonLairScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [cooldownTick, setCooldownTick] = useState(0);

  const streak = useGameStore((s) => s.streak);
  const dungeonKeys = useGameStore((s) => s.dungeonKeys);
  const gold = useGameStore((s) => s.gold);
  const purchaseDungeonKeyWithGold = useGameStore((s) => s.purchaseDungeonKeyWithGold);
  const addGold = useGameStore((s) => s.addGold);
  const addXP = useGameStore((s) => s.addXP);
  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);
  const activeDragonId = useGameStore((s) => s.activeDragonId);
  const dragonSwitchCooldownUntil = useGameStore((s) => s.dragonSwitchCooldownUntil);
  const consumables = useGameStore((s) => s.consumables);
  const purchaseElixirOfTime = useGameStore((s) => s.purchaseElixirOfTime);
  const setActiveDragon = useGameStore((s) => s.setActiveDragon);
  const resolveDungeonBattle = useGameStore((s) => s.resolveDungeonBattle);
  const devResetOnboarding = useGameStore((s) => s.devResetOnboarding);
  const triggerForceDailyFlow = useGameStore((s) => s.triggerForceDailyFlow);
  const resetDailyFlowStatus = useGameStore((s) => s.resetDailyFlowStatus);

  const resolveBattleForModal = useCallback(
    async (challengeId: string): Promise<BattleApiResult> => {
      const r = await resolveDungeonBattle(challengeId);
      if (!r.ok) return { ok: false, reason: r.reason };
      if (r.won && r.reward?.type === "item") {
        return { ok: true, won: true, chance: r.chance, reward: r.reward };
      }
      const gold =
        r.reward?.type === "gold" ? r.reward : { type: "gold" as const, amount: 0 };
      return { ok: true, won: false, chance: r.chance, reward: gold };
    },
    [resolveDungeonBattle],
  );

  const engineState = useGameStore(
    useShallow((s) => ({
      strengthXP: s.strengthXP,
      agilityXP: s.agilityXP,
      intelligenceXP: s.intelligenceXP,
      activeDragonId: s.activeDragonId,
      equippedOutfitId: s.equippedOutfitId,
      equippedRelicId: s.equippedRelicId,
    })),
  );

  const [battle, setBattle] = useState<{
    open: boolean;
    challengeId: DungeonChallengeId | null;
    dungeonName: string;
    bossName: string;
  }>({ open: false, challengeId: null, dungeonName: "", bossName: "" });
  const [victoryLoot, setVictoryLoot] = useState<{
    itemId: string;
    challengeId: DungeonChallengeId;
  } | null>(null);
  const [dungeonsGuideOpen, setDungeonsGuideOpen] = useState(false);
  const [dragonsGuideOpen, setDragonsGuideOpen] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const dragonsSectionAnim = useRef(new Animated.Value(0)).current;
  const dungeonsSectionAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0.2)).current;

  const cardWidth = useMemo(() => Math.min(Math.round(screenWidth * 0.72), 300), [screenWidth]);
  const cardHeight = useMemo(() => Math.round(cardWidth * PORTRAIT_CARD_HEIGHT_RATIO), [cardWidth]);
  const cardGap = 14;
  const snapInterval = cardWidth + cardGap;

  const unlockedCount = DRAGON_LIST.filter((d) => streak >= d.unlockStreak).length;

  const switchCooldownLabel = useMemo(
    () => formatSwitchCooldownRemaining(dragonSwitchCooldownUntil),
    [dragonSwitchCooldownUntil, cooldownTick],
  );

  useEffect(() => {
    const t = setInterval(() => setCooldownTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Animated.timing(dragonsSectionAnim, {
      toValue: 1,
      duration: 520,
      delay: 120,
      useNativeDriver: true,
    }).start();

    Animated.timing(dungeonsSectionAnim, {
      toValue: 1,
      duration: 560,
      delay: 280,
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
      ]),
    ).start();
  }, [headerAnim, dragonsSectionAnim, dungeonsSectionAnim, orbAnim]);

  const handleAddStreak = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    useGameStore.setState((s) => ({ streak: s.streak + 5 }));
  }, []);

  const handleResetStreak = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    useGameStore.setState({ streak: 0 });
  }, []);

  const handleDebugGold = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    addGold(500);
  }, [addGold]);

  const handleDebugKeys = useCallback((amount: number) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    useGameStore.setState((s) => ({ dungeonKeys: s.dungeonKeys + amount }));
  }, []);

  const handleDebugXP = useCallback(
    (stat: StatType, amount: number) => {
      impactAsync(ImpactFeedbackStyle.Light);
      addXP(stat, amount);
    },
    [addXP],
  );

  const handleDevResetOnboarding = useCallback(() => {
    Alert.alert(
      "Reset onboarding?",
      "Clears class, nickname, goals, and Sage choices locally and in your profile. You will return to the Sage wizard (step 1).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            impactAsync(ImpactFeedbackStyle.Heavy);
            devResetOnboarding();
            if (user?.id) {
              const snapshot = pickCloudGameState(useGameStore.getState());
              const { error } = await supabase
                .from("profiles")
                .update({
                  player_class: null,
                  sage_focus: "body",
                  game_state: snapshot,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
              if (error) console.warn("[dev] profile onboarding reset failed", error.message);
            }
            router.replace("/onboarding" as any);
          },
        },
      ],
    );
  }, [devResetOnboarding, user?.id, router]);

  const handleBuyKey = useCallback(() => {
    if (gold < DUNGEON_KEY_GOLD_PRICE) {
      notificationAsync(NotificationFeedbackType.Warning);
      Alert.alert("Not enough gold", `You need ${DUNGEON_KEY_GOLD_PRICE} 🪙 to buy a key.`);
      return;
    }
    impactAsync(ImpactFeedbackStyle.Light);
    const ok = purchaseDungeonKeyWithGold();
    if (ok) {
      notificationAsync(NotificationFeedbackType.Success);
    }
  }, [gold, purchaseDungeonKeyWithGold]);

  const handleBuyElixir = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    const ok = purchaseElixirOfTime();
    if (!ok) {
      notificationAsync(NotificationFeedbackType.Warning);
      Alert.alert("Not enough gold", `Elixir of Time costs ${ELIXIR_OF_TIME_GOLD_COST} 🪙.`);
    } else {
      notificationAsync(NotificationFeedbackType.Success);
    }
  }, [purchaseElixirOfTime]);

  const handleSetActiveDragon = useCallback(
    (id: DragonId) => {
      const out = setActiveDragon(id);
      if (!out.ok) {
        if (out.reason === "cooldown") {
          Alert.alert("Cooldown", "You can change your active dragon once every 24 hours.");
        } else if (out.reason === "already_active") {
          Alert.alert("Already active", "This dragon is already your companion.");
        }
      }
    },
    [setActiveDragon],
  );

  const openBattle = useCallback((c: DungeonChallengeConfig) => {
    if (dungeonKeys <= 0) {
      notificationAsync(NotificationFeedbackType.Warning);
      Alert.alert("No keys", "You need a dungeon key to fight.");
      return;
    }
    setBattle({
      open: true,
      challengeId: c.id,
      dungeonName: c.dungeonName,
      bossName: c.bossName,
    });
  }, [dungeonKeys]);

  const closeBattle = useCallback(() => {
    setBattle({ open: false, challengeId: null, dungeonName: "", bossName: "" });
  }, []);

  const handleBossVictory = useCallback(
    (itemId: string, challengeId: DungeonChallengeId) => {
      setBattle({ open: false, challengeId: null, dungeonName: "", bossName: "" });
      setVictoryLoot({ itemId, challengeId });
    },
    [],
  );

  const handleCollectLoot = useCallback(() => {
    setVictoryLoot(null);
  }, []);

  const canBuy = gold >= DUNGEON_KEY_GOLD_PRICE;
  const canBuyElixir = gold >= ELIXIR_OF_TIME_GOLD_COST;
  const dungeonsTranslateY = dungeonsSectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 20, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
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
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Dungeons & Dragons</Text>
          <Text style={styles.subtitle}>Trophy hall & forbidden depths</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: dragonsSectionAnim,
            transform: [
              {
                translateY: dragonsSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <SectionBanner
            title="Dragons"
            source={DRAGONS_BANNER_BG}
            onInfoPress={() => setDragonsGuideOpen(true)}
            infoAccessibilityLabel="Dragons guide"
            footerSlot={
              <>
                <SectionBannerCounter emoji="🔥" value={streak} label="day streak" />
                <SectionBannerCounter
                  emoji="🧊"
                  value={consumables?.elixirOfTime ?? 0}
                  label="freeze potions"
                />
              </>
            }
          />

          <Pressable
            onPress={handleBuyElixir}
            disabled={!canBuyElixir}
            style={({ pressed }) => [
              styles.elixirCta,
              !canBuyElixir && styles.elixirCtaDisabled,
              pressed && canBuyElixir && styles.elixirCtaPressed,
            ]}
          >
            <LinearGradient
              colors={canBuyElixir ? ["#1a3a4a", "#0d2838"] : ["#2a2a2a", "#1a1a1a"]}
              style={styles.elixirCtaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Snowflake size={22} color={canBuyElixir ? Colors.dark.cyan : Colors.dark.textMuted} />
              <View style={styles.elixirCtaMid}>
                <Text style={styles.elixirCtaTitle}>Buy Freeze Potion</Text>
                <Text style={styles.elixirCtaSub}>
                  Freeze a daily habit so your streak survives a missed day (use from a habit when needed).
                </Text>
              </View>
              <View style={styles.ctaPriceRow}>
                <Text style={[styles.elixirPrice, !canBuyElixir && styles.elixirPriceDisabled]}>
                  {ELIXIR_OF_TIME_GOLD_COST}
                </Text>
                <Coins
                  size={18}
                  color={canBuyElixir ? Colors.dark.gold : Colors.dark.textMuted}
                  strokeWidth={2.2}
                />
              </View>
            </LinearGradient>
          </Pressable>

          {switchCooldownLabel ? (
            <Text style={styles.cooldownBanner}>Next dragon switch in {switchCooldownLabel}</Text>
          ) : null}

          <Text style={styles.sectionHint}>
            {unlockedCount} / {DRAGON_LIST.length} guardians unlocked
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.dragonsCarouselContent}
            nestedScrollEnabled
          >
            {DRAGON_LIST.map((dragon, index) => (
              <View key={dragon.id} style={[styles.dragonCarouselItem, { width: cardWidth, marginRight: cardGap }]}>
                <PortraitDragonCard
                  dragon={dragon}
                  streak={streak}
                  activeDragonId={activeDragonId}
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
                  delay={180 + index * 100}
                  switchCooldownLabel={switchCooldownLabel}
                  onSetActive={handleSetActiveDragon}
                />
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          style={[
            styles.dungeonsBlock,
            {
              opacity: dungeonsSectionAnim,
              transform: [{ translateY: dungeonsTranslateY }],
            },
          ]}
        >
          <SectionBanner
            title="Dungeons"
            source={DUNGEONS_BANNER_BG}
            onInfoPress={() => setDungeonsGuideOpen(true)}
            infoAccessibilityLabel="Dungeons guide"
            footerSlot={
              <SectionBannerCounter emoji="🗝️" value={dungeonKeys} label="dungeon keys" />
            }
          />

          <Pressable
            onPress={handleBuyKey}
            disabled={!canBuy}
            style={({ pressed }) => [
              styles.keyCta,
              !canBuy && styles.keyCtaDisabled,
              pressed && canBuy && styles.keyCtaPressed,
            ]}
          >
            <LinearGradient
              colors={canBuy ? ["#3a2e1a", "#1f1810"] : ["#2a2a2a", "#1a1a1a"]}
              style={styles.keyCtaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Key size={22} color={canBuy ? Colors.dark.cyan : Colors.dark.textMuted} strokeWidth={2.2} />
              <View style={styles.keyCtaMid}>
                <Text style={styles.keyCtaTitle}>Buy dungeon key</Text>
                <Text style={styles.keyCtaSub}>One key — one boss fight. Your balance is shown above.</Text>
              </View>
              <View style={styles.ctaPriceRow}>
                <Text style={[styles.keyPrice, !canBuy && styles.keyPriceDisabled]}>
                  {DUNGEON_KEY_GOLD_PRICE}
                </Text>
                <Coins
                  size={18}
                  color={canBuy ? Colors.dark.gold : Colors.dark.textMuted}
                  strokeWidth={2.2}
                />
              </View>
            </LinearGradient>
          </Pressable>

          <Text style={styles.sectionHint}>Boss raids — portrait challenges · 1 key per fight</Text>

          <DungeonsSection
            hideTitle
            engineState={engineState}
            playerLevel={getPlayerLevel()}
            dungeonKeys={dungeonKeys}
            onFight={openBattle}
          />
        </Animated.View>

        {/* ── Daily Flow Testing ─────────────────────────────────────── */}
        <View style={[styles.debugSection, styles.dailyFlowDebugSection]}>
          <Text style={[styles.debugTitle, styles.dailyFlowDebugTitle]}>
            🌅 Daily Flow Testing
          </Text>
          <Text style={styles.dailyFlowDebugDesc}>
            Trigger and reset the two-screen daily login sequence.
          </Text>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Heavy);
              triggerForceDailyFlow();
            }}
            style={({ pressed }) => [
              styles.dailyFlowBtn,
              styles.dailyFlowBtnTrigger,
              pressed && styles.debugButtonPressed,
            ]}
            testID="debug-force-daily-flow"
          >
            <Text style={styles.dailyFlowBtnTextTrigger}>[ Force Trigger Daily Flow ]</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Medium);
              resetDailyFlowStatus();
              Alert.alert(
                "Daily Flow Reset",
                "Login status cleared. Reopen the app (or navigate away and back) to trigger the flow naturally.",
              );
            }}
            style={({ pressed }) => [
              styles.dailyFlowBtn,
              styles.dailyFlowBtnReset,
              pressed && styles.debugButtonPressed,
            ]}
            testID="debug-reset-daily-flow"
          >
            <Text style={styles.dailyFlowBtnTextReset}>[ Reset Daily Login Status ]</Text>
          </Pressable>
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
          <View style={styles.debugRow}>
            <Pressable
              onPress={handleDebugGold}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonGold,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-add-gold"
            >
              <Text style={styles.debugEmoji}>🪙</Text>
              <Text style={styles.debugButtonTextGold}>+500 Gold</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDebugKeys(1)}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonKeys,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-add-key"
            >
              <Text style={styles.debugEmoji}>🗝️</Text>
              <Text style={styles.debugButtonTextKeys}>+1 Key</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDebugKeys(5)}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonKeys,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-add-keys-5"
            >
              <Text style={styles.debugEmoji}>🗝️</Text>
              <Text style={styles.debugButtonTextKeys}>+5 Keys</Text>
            </Pressable>
          </View>
          <View style={styles.debugRow}>
            <Pressable
              onPress={() => handleDebugXP("strength", 100)}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonXpStr,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-xp-str"
            >
              <Text style={[styles.debugButtonTextXp, { color: Colors.dark.ruby }]}>+100 STR</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDebugXP("agility", 100)}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonXpAgi,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-xp-agi"
            >
              <Text style={[styles.debugButtonTextXp, { color: Colors.dark.emerald }]}>+100 AGI</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDebugXP("intelligence", 100)}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonXpInt,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-xp-int"
            >
              <Text style={[styles.debugButtonTextXp, { color: Colors.dark.cyan }]}>+100 INT</Text>
            </Pressable>
          </View>
          <View style={[styles.debugRow, styles.debugRowLast]}>
            <Pressable
              onPress={handleDevResetOnboarding}
              style={({ pressed }) => [
                styles.debugButton,
                styles.debugButtonOnboardingReset,
                pressed && styles.debugButtonPressed,
              ]}
              testID="debug-reset-onboarding"
            >
              <AlertTriangle size={18} color="#ff6b7a" strokeWidth={2.4} />
              <Text style={styles.debugButtonTextOnboardingReset}>Reset Onboarding</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <BattleSimulationModal
        visible={battle.open}
        challengeId={battle.challengeId}
        dungeonName={battle.dungeonName}
        bossName={battle.bossName}
        resolveDungeonBattle={resolveBattleForModal}
        onClose={closeBattle}
        onVictory={handleBossVictory}
      />

      {victoryLoot && (() => {
        const challenge = DUNGEON_CHALLENGES[victoryLoot.challengeId];
        return (
          <BossVictoryLootModal
            visible={true}
            bossName={challenge?.bossName ?? "Boss"}
            dungeonName={challenge?.dungeonName ?? "Dungeon"}
            accentColor={challenge?.accentColor ?? "#ffc845"}
            lootTable={challenge?.lootTable ?? []}
            wonItemId={victoryLoot.itemId}
            onCollect={handleCollectLoot}
          />
        );
      })()}

      <GuideInfoModal
        visible={dragonsGuideOpen}
        onClose={() => setDragonsGuideOpen(false)}
        title="Dragons Guide"
        body={DRAGONS_GUIDE_BODY}
      />
      <GuideInfoModal
        visible={dungeonsGuideOpen}
        onClose={() => setDungeonsGuideOpen(false)}
        title="Dungeons Guide"
        body={DUNGEONS_GUIDE_BODY}
      />
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
  },
  glowOrb: {
    position: "absolute" as const,
    top: 30,
    left: "18%" as const,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#ff6b3510",
  },
  glowOrb2: {
    position: "absolute" as const,
    top: 220,
    right: "8%" as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#45d4e808",
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  elixirCta: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.dark.cyan + "44",
  },
  elixirCtaDisabled: {
    opacity: 0.5,
  },
  elixirCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  elixirCtaGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  elixirCtaMid: {
    flex: 1,
    minWidth: 0,
  },
  elixirCtaTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  elixirCtaSub: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  ctaPriceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 6,
  },
  elixirPrice: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  elixirPriceDisabled: {
    color: Colors.dark.textMuted,
  },
  cooldownBanner: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 12,
  },
  dragonsCarouselContent: {
    paddingBottom: 8,
    paddingRight: 4,
  },
  dragonCarouselItem: {},
  portraitCardWrap: {
    position: "relative" as const,
  },
  activeEpicRing: {
    position: "absolute" as const,
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    borderWidth: 2,
    zIndex: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    ...Platform.select({ android: { elevation: 8 }, default: {} }),
  },
  portraitCardShell: {
    borderRadius: 20,
    overflow: "hidden" as const,
    backgroundColor: Colors.dark.background,
  },
  portraitImage: {
    width: "100%" as const,
    height: "100%" as const,
  },
  portraitImageInner: {
    resizeMode: "cover" as const,
  },
  dragonLockVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 2,
  },
  dragonLockReq: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center" as const,
    paddingHorizontal: 12,
  },
  portraitImageLockedSilhouette: {
    opacity: 0.38,
  },
  dragonUnlockedRoot: {
    flex: 1,
  },
  dragonTopGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: "44%" as const,
    zIndex: 1,
  },
  dragonTopTitles: {
    paddingTop: 12,
    paddingHorizontal: 12,
    zIndex: 2,
  },
  dragonUnlockedSpacer: {
    flex: 1,
  },
  portraitGradientBottom: {
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 28,
    justifyContent: "flex-end" as const,
  },
  portraitDragonName: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#fff",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  portraitDragonSub: {
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 0,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buffRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    justifyContent: "center" as const,
    marginBottom: 10,
  },
  buffChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(18, 14, 28, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  buffIconWrap: {
    width: 22,
    height: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buffText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#f8f6ff",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  setActiveBtn: {
    borderRadius: 12,
    overflow: "hidden" as const,
    alignSelf: "stretch" as const,
  },
  setActiveBtnMuted: {
    opacity: 0.85,
  },
  setActiveBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  setActiveGradient: {
    paddingVertical: 12,
    alignItems: "center" as const,
  },
  setActiveLabel: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  dungeonsBlock: {
    marginTop: 20,
  },
  keyCta: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
  },
  keyCtaDisabled: {
    opacity: 0.5,
  },
  keyCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  keyCtaGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  keyCtaMid: {
    flex: 1,
    minWidth: 0,
  },
  keyCtaTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  keyCtaSub: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  keyPrice: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  keyPriceDisabled: {
    color: Colors.dark.textMuted,
  },
  debugSection: {
    marginTop: 28,
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
    gap: 10,
    marginBottom: 10,
  },
  debugRowLast: {
    marginBottom: 0,
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
  debugButtonOnboardingReset: {
    backgroundColor: "#ff4d6a18",
    borderColor: "#ff4d6a66",
    borderWidth: 2,
  },
  debugButtonTextOnboardingReset: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#ff6b7a",
  },
  debugEmoji: {
    fontSize: 14,
  },
  debugButtonGold: {
    backgroundColor: Colors.dark.gold + "12",
    borderColor: Colors.dark.gold + "45",
  },
  debugButtonTextGold: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  debugButtonKeys: {
    backgroundColor: Colors.dark.cyan + "10",
    borderColor: Colors.dark.cyan + "40",
  },
  debugButtonTextKeys: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.cyan,
  },
  debugButtonXpStr: {
    backgroundColor: Colors.dark.ruby + "12",
    borderColor: Colors.dark.ruby + "40",
  },
  debugButtonXpAgi: {
    backgroundColor: Colors.dark.emerald + "12",
    borderColor: Colors.dark.emerald + "40",
  },
  debugButtonXpInt: {
    backgroundColor: Colors.dark.cyan + "12",
    borderColor: Colors.dark.cyan + "38",
  },
  debugButtonTextXp: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  dailyFlowDebugSection: {
    borderColor: Colors.dark.fire + "55",
    backgroundColor: Colors.dark.fireDark + "0a",
    gap: 10,
  },
  dailyFlowDebugTitle: {
    color: Colors.dark.fire,
  },
  dailyFlowDebugDesc: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    marginTop: -6,
    marginBottom: 2,
    fontStyle: "italic" as const,
  },
  dailyFlowBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
  },
  dailyFlowBtnTrigger: {
    backgroundColor: Colors.dark.fire + "14",
    borderColor: Colors.dark.fire + "88",
  },
  dailyFlowBtnReset: {
    backgroundColor: Colors.dark.purple + "10",
    borderColor: Colors.dark.purple + "66",
  },
  dailyFlowBtnTextTrigger: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.fire,
    letterSpacing: 0.4,
  },
  dailyFlowBtnTextReset: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.purple,
    letterSpacing: 0.4,
  },
});
