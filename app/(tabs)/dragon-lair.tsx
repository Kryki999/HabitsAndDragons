import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Snowflake,
  Crown,
  Lock,
  Shield,
  Plus,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Coins,
  DoorOpen,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { DUNGEON_KEY_GOLD_PRICE } from "@/lib/economy";
import { LootGlyph } from "@/lib/lootGlyph";
import type { StatType } from "@/types/game";
import { sortDungeonLootByRarity, type DungeonLootEntry, type LootRarity } from "@/types/dungeonLoot";
import { DUNGEONS, type DungeonData } from "@/constants/dungeons";
import LootDetailModal, { type LootModalPayload } from "@/components/LootDetailModal";

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
    icon: <Flame size={34} color="#fff" />,
    lockedIcon: <Flame size={34} color="#4a3a3a" />,
  },
  {
    id: "ice",
    name: "Ice Wyvern",
    subtitle: "Frost Sentinel",
    streakRequired: 20,
    colors: ["#45d4e8", "#1a6a8a"] as const,
    accentColor: "#45d4e8",
    icon: <Snowflake size={34} color="#fff" />,
    lockedIcon: <Snowflake size={34} color="#3a4a4a" />,
  },
  {
    id: "golden",
    name: "Golden Dragon",
    subtitle: "The Eternal Sovereign",
    streakRequired: 30,
    colors: ["#ffc845", "#cc8800"] as const,
    accentColor: "#ffc845",
    icon: <Crown size={34} color="#fff" />,
    lockedIcon: <Crown size={34} color="#4a4a3a" />,
  },
];

const LOOT_RARITY_COLOR: Record<LootRarity, string> = {
  common: "#9ca3af",
  uncommon: "#3dd68c",
  rare: "#45d4e8",
  epic: "#9b6dff",
  legendary: "#ffc845",
};

/** Stały „viewport” listy lootu (~3 wiersze); reszta przewijana — nie rozciąga karty. */
const DUNGEON_LOOT_SCROLL_MAX_HEIGHT = 210;

const LOOT_RARITY_LABEL: Record<LootRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

function formatLootRowPrimary(entry: DungeonLootEntry): string {
  if (entry.kind === "gold") {
    return `Gold · ${entry.goldMin}–${entry.goldMax}`;
  }
  return entry.name;
}

function DragonCard({
  dragon,
  streak,
  delay,
  compact,
  cardWidth,
}: {
  dragon: DragonData;
  streak: number;
  delay: number;
  compact: boolean;
  cardWidth: number;
}) {
  const unlocked = streak >= dragon.streakRequired;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    if (unlocked && !compact) {
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
        ]),
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [unlocked, compact, glowAnim, pulseAnim]);

  const progress = Math.min(streak / dragon.streakRequired, 1);

  const c = compact;
  const iconSize = c ? 74 : 88;
  const iconRadius = iconSize / 2;
  const iconGlyphSize = c ? 34 : 34;

  return (
    <Animated.View
      style={[
        styles.dragonCardWrap,
        { width: cardWidth },
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      {unlocked && !c && (
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
          c ? styles.cardInnerCompact : styles.cardInner,
          c && styles.dragonCardCompactBoost,
          unlocked
            ? { borderColor: dragon.accentColor + "50" }
            : { borderColor: Colors.dark.border },
        ]}
      >
        <View style={[styles.dragonIconArea, c && styles.dragonIconAreaCompact]}>
          {unlocked ? (
            <LinearGradient
              colors={[...dragon.colors]}
              style={[
                styles.dragonIconCircle,
                {
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconRadius,
                },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {React.cloneElement(dragon.icon as React.ReactElement<{ size?: number }>, {
                size: iconGlyphSize,
              })}
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.dragonIconCircleLocked,
                {
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconRadius,
                },
              ]}
            >
              {React.cloneElement(dragon.lockedIcon as React.ReactElement<{ size?: number }>, {
                size: iconGlyphSize,
              })}
              <View style={styles.lockOverlay}>
                <Lock size={c ? 16 : 20} color="#8a7a6a" />
              </View>
            </View>
          )}
        </View>

        <Text
          style={[
            c ? styles.dragonNameCompact : styles.dragonName,
            c && styles.dragonNameCompactLarge,
            !unlocked && { color: Colors.dark.textMuted },
          ]}
          numberOfLines={1}
        >
          {dragon.name}
        </Text>
        <Text
          style={[
            c ? styles.dragonSubtitleCompact : styles.dragonSubtitle,
            unlocked && { color: dragon.accentColor + "bb" },
          ]}
          numberOfLines={1}
        >
          {dragon.subtitle}
        </Text>

        {unlocked ? (
          <View
            style={[
              c ? styles.activeBadgeCompact : styles.activeBadge,
              { backgroundColor: dragon.accentColor + "20", borderColor: dragon.accentColor + "50" },
            ]}
          >
            <Shield size={c ? 10 : 12} color={dragon.accentColor} />
            <Text style={[c ? styles.activeBadgeTextCompact : styles.activeBadgeText, { color: dragon.accentColor }]}>
              Guardian Active
            </Text>
          </View>
        ) : (
          <View style={[styles.lockedSection, c && styles.lockedSectionCompact]}>
            <View style={[styles.progressBarBg, c && styles.progressBarBgCompact]}>
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
            <Text style={c ? styles.requirementTextCompact : styles.requirementText}>
              Requires {dragon.streakRequired} 🔥 Streak
            </Text>
            <Text style={c ? styles.progressTextCompact : styles.progressText}>
              {streak} / {dragon.streakRequired}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function DungeonCard({
  dungeon,
  cardWidth,
  delay,
  canEnter,
  onEnter,
  onLootEntryPress,
}: {
  dungeon: DungeonData;
  cardWidth: number;
  delay: number;
  canEnter: boolean;
  onEnter: (id: string) => void;
  onLootEntryPress: (entry: DungeonLootEntry) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconSize = 58;
  const iconRadius = 29;

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

  const sortedLoot = useMemo(
    () => sortDungeonLootByRarity(dungeon.lootTable),
    [dungeon.lootTable],
  );

  return (
    <Animated.View
      style={[
        styles.dragonCardWrap,
        { width: cardWidth },
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.cardInnerCompact,
          styles.dungeonCardInner,
          { borderColor: dungeon.accentColor + "55" },
        ]}
      >
        <View style={styles.dragonIconAreaCompact}>
          <LinearGradient
            colors={[...dungeon.colors]}
            style={[
              styles.dragonIconCircle,
              {
                width: iconSize,
                height: iconSize,
                borderRadius: iconRadius,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {React.cloneElement(dungeon.icon as React.ReactElement<{ size?: number }>, {
              size: 28,
            })}
          </LinearGradient>
        </View>

        <Text style={[styles.dragonNameCompact, styles.dungeonCardTitleText]} numberOfLines={2}>
          {dungeon.name}
        </Text>
        <Text
          style={[
            styles.dragonSubtitleCompact,
            styles.dungeonCardTitleText,
            { color: dungeon.accentColor + "cc" },
          ]}
          numberOfLines={2}
        >
          {dungeon.subtitle}
        </Text>

        <View style={styles.dungeonLootBox}>
          <Text style={[styles.dungeonLootHeading, { color: dungeon.accentColor + "dd" }]}>
            Loot table
          </Text>
          <View
            style={[
              styles.dungeonLootScrollOuter,
              {
                height: DUNGEON_LOOT_SCROLL_MAX_HEIGHT,
                minHeight: DUNGEON_LOOT_SCROLL_MAX_HEIGHT,
                maxHeight: DUNGEON_LOOT_SCROLL_MAX_HEIGHT,
              },
            ]}
          >
            <ScrollView
              style={styles.dungeonLootScroll}
              contentContainerStyle={styles.dungeonLootScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator={sortedLoot.length > 3}
              keyboardShouldPersistTaps="handled"
            >
              {sortedLoot.map((entry) => {
                const r = entry.rarity;
                const rCol = LOOT_RARITY_COLOR[r];
                const glyph = entry.kind === "gold" ? "coins" : entry.icon;
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => onLootEntryPress(entry)}
                    style={({ pressed }) => [styles.lootRow, pressed && styles.lootRowPressed]}
                  >
                    <View style={[styles.lootRowIconWrap, { borderColor: rCol + "44" }]}>
                      <LootGlyph icon={glyph} size={19} color={entry.kind === "gold" ? Colors.dark.gold : rCol} />
                    </View>
                    <View style={styles.lootRowMid}>
                      <Text style={styles.lootRowTitle} numberOfLines={2}>
                        {formatLootRowPrimary(entry)}
                      </Text>
                      <View style={styles.lootRowMeta}>
                        <Text style={[styles.lootRowRarity, { color: rCol }]}>
                          {entry.kind === "gold" ? "Currency" : "Item"} · {LOOT_RARITY_LABEL[r]}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.dungeonCardSpacer} />

        <Pressable
          onPress={() => onEnter(dungeon.id)}
          disabled={!canEnter}
          style={({ pressed }) => [
            styles.dungeonEnterOuter,
            !canEnter && styles.dungeonEnterOuterDisabled,
            pressed && canEnter && styles.dungeonEnterPressed,
          ]}
        >
          <LinearGradient
            colors={canEnter ? [...Colors.gradients.gold] : ["#444", "#333"]}
            style={styles.dungeonEnterGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <DoorOpen size={17} color={canEnter ? "#1a1228" : "#666"} />
            <Text style={[styles.dungeonEnterLabel, !canEnter && styles.enterBtnTextDisabled]}>
              Enter (1 Key)
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function DragonLairScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const streak = useGameStore((s) => s.streak);
  const dungeonKeys = useGameStore((s) => s.dungeonKeys);
  const gold = useGameStore((s) => s.gold);
  const purchaseDungeonKeyWithGold = useGameStore((s) => s.purchaseDungeonKeyWithGold);
  const consumeDungeonKeyForRun = useGameStore((s) => s.consumeDungeonKeyForRun);
  const addGold = useGameStore((s) => s.addGold);
  const addXP = useGameStore((s) => s.addXP);

  const [lootModal, setLootModal] = useState<{
    payload: LootModalPayload;
    accent: string;
  } | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const dragonsSectionAnim = useRef(new Animated.Value(0)).current;
  const dungeonsSectionAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0.2)).current;

  const unlockedCount = DRAGONS.filter((d) => streak >= d.streakRequired).length;

  const cardWidth = useMemo(() => Math.round(screenWidth * 0.78), [screenWidth]);
  const cardGap = 14;
  const snapInterval = cardWidth + cardGap;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    useGameStore.setState((s) => ({ streak: s.streak + 5 }));
  }, []);

  const handleResetStreak = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    useGameStore.setState({ streak: 0 });
  }, []);

  const handleDebugGold = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addGold(500);
  }, [addGold]);

  const handleDebugKeys = useCallback((amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useGameStore.setState((s) => ({ dungeonKeys: s.dungeonKeys + amount }));
  }, []);

  const handleDebugXP = useCallback(
    (stat: StatType, amount: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      addXP(stat, amount);
    },
    [addXP],
  );

  const handleEnterDungeon = useCallback(
    (dungeonId: string) => {
      if (dungeonKeys <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const ok = consumeDungeonKeyForRun();
      if (!ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const dungeonMeta = DUNGEONS.find((d) => d.id === dungeonId);
      const dungeonName = dungeonMeta?.name ?? "the dungeon";
      const table = dungeonMeta?.lootTable ?? [];
      const rolled = table[Math.floor(Math.random() * Math.max(table.length, 1))];
      let body: string;
      if (rolled?.kind === "gold") {
        const amt =
          Math.floor(Math.random() * (rolled.goldMax - rolled.goldMin + 1)) + rolled.goldMin;
        body = `You cleared ${dungeonName} and salvaged ${amt} gold!`;
      } else if (rolled?.kind === "item") {
        body = `You cleared ${dungeonName} and discovered ${rolled.name}!`;
      } else {
        body = `You cleared ${dungeonName}!`;
      }
      Alert.alert("Dungeon Cleared", `${body}\n\n(Loot system preview.)`, [
        { text: "Claim", style: "default" },
      ]);
    },
    [dungeonKeys, consumeDungeonKeyForRun],
  );

  const handleBuyKey = useCallback(() => {
    if (gold < DUNGEON_KEY_GOLD_PRICE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Not enough gold", `You need ${DUNGEON_KEY_GOLD_PRICE} 🪙 to buy a key.`);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = purchaseDungeonKeyWithGold();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [gold, purchaseDungeonKeyWithGold]);

  const canEnter = dungeonKeys > 0;
  const canBuy = gold >= DUNGEON_KEY_GOLD_PRICE;

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
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 40 },
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
          <View style={styles.headerEmblem}>
            <LinearGradient
              colors={[...Colors.gradients.purple]}
              style={styles.headerEmblemGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={26} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Dragons & Dungeons</Text>
          <Text style={styles.subtitle}>Trophy hall & forbidden depths</Text>
        </Animated.View>

        {/* —— Section: Dragons —— */}
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
          <View style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Dragons</Text>
          </View>

          <Text style={styles.sectionHint}>
            {unlockedCount} / {DRAGONS.length} guardians unlocked
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
            {DRAGONS.map((dragon, index) => (
              <View key={dragon.id} style={[styles.dragonCarouselItem, { width: cardWidth, marginRight: cardGap }]}>
                <DragonCard
                  dragon={dragon}
                  streak={streak}
                  delay={180 + index * 100}
                  compact
                  cardWidth={cardWidth}
                />
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* —— Section: Dungeons —— */}
        <Animated.View
          style={[
            styles.dungeonsBlock,
            {
              opacity: dungeonsSectionAnim,
              transform: [
                {
                  translateY: dungeonsSectionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.dungeonsTopRow}>
            <View style={styles.keysPill}>
              <Text style={styles.keysEmoji}>🗝️</Text>
              <Text style={styles.keysValue}>{dungeonKeys}</Text>
              <Text style={styles.keysLabel}>keys</Text>
            </View>
            <Pressable
              onPress={handleBuyKey}
              disabled={!canBuy}
              style={({ pressed }) => [
                styles.buyKeyBtnInline,
                !canBuy && styles.buyKeyBtnInlineDisabled,
                pressed && canBuy && styles.buyKeyBtnInlinePressed,
              ]}
            >
              <Coins size={17} color={canBuy ? Colors.dark.gold : Colors.dark.textMuted} />
              <Text
                style={[styles.buyKeyTextInline, !canBuy && styles.buyKeyTextInlineDisabled]}
                numberOfLines={1}
              >
                Buy Key ({DUNGEON_KEY_GOLD_PRICE})
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Dungeons</Text>
          </View>

          <Text style={styles.sectionHint}>Swipe to browse — each run costs 1 key</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.dragonsCarouselContent}
            nestedScrollEnabled
          >
            {DUNGEONS.map((dungeon, index) => (
              <View
                key={dungeon.id}
                style={[styles.dragonCarouselItem, { width: cardWidth, marginRight: cardGap }]}
              >
                <DungeonCard
                  dungeon={dungeon}
                  cardWidth={cardWidth}
                  delay={200 + index * 90}
                  canEnter={canEnter}
                  onEnter={handleEnterDungeon}
                  onLootEntryPress={(entry) => {
                    Haptics.selectionAsync();
                    setLootModal({
                      payload:
                        entry.kind === "item"
                          ? { type: "item", entry }
                          : { type: "gold", entry },
                      accent: dungeon.accentColor,
                    });
                  }}
                />
              </View>
            ))}
          </ScrollView>
        </Animated.View>

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
          <View style={[styles.debugRow, styles.debugRowLast]}>
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
        </View>
      </ScrollView>

      <LootDetailModal
        visible={lootModal !== null}
        payload={lootModal?.payload ?? null}
        accentHint={lootModal?.accent}
        onClose={() => setLootModal(null)}
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
    marginBottom: 22,
  },
  headerEmblem: {
    marginBottom: 10,
    borderRadius: 20,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: "#9b6dff",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
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
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  streakPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    marginBottom: 8,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.fire + "35",
    gap: 8,
  },
  streakEmoji: {
    fontSize: 17,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.fire,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
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
  dragonCardWrap: {
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
  cardInnerCompact: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center" as const,
    borderWidth: 1.5,
  },
  dragonCardCompactBoost: {
    minHeight: 308,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  dragonNameCompactLarge: {
    fontSize: 17,
    letterSpacing: 0.2,
  },
  dragonIconArea: {
    marginBottom: 16,
  },
  dragonIconAreaCompact: {
    marginBottom: 10,
  },
  dragonIconCircle: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  dragonIconCircleLocked: {
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
    width: 26,
    height: 26,
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
  dragonNameCompact: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.2,
    maxWidth: "100%",
  },
  dragonSubtitle: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  dragonSubtitleCompact: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 2,
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
  activeBadgeCompact: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  activeBadgeTextCompact: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  lockedSection: {
    alignItems: "center" as const,
    marginTop: 14,
    width: "100%" as const,
  },
  lockedSectionCompact: {
    marginTop: 10,
  },
  progressBarBg: {
    width: "70%" as const,
    height: 6,
    backgroundColor: Colors.dark.background,
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: 10,
  },
  progressBarBgCompact: {
    width: "85%" as const,
    height: 5,
    marginBottom: 6,
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
  requirementTextCompact: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textMuted,
  },
  progressText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  progressTextCompact: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginTop: 2,
    fontWeight: "500" as const,
  },
  dungeonsBlock: {
    marginTop: 28,
  },
  dungeonsTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 10,
    marginBottom: 12,
  },
  keysPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexShrink: 0,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.cyan + "35",
    gap: 8,
  },
  keysEmoji: {
    fontSize: 17,
  },
  keysValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.cyan,
  },
  keysLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  buyKeyBtnInline: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "45",
  },
  buyKeyBtnInlineDisabled: {
    opacity: 0.42,
  },
  buyKeyBtnInlinePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  buyKeyTextInline: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    textAlign: "center" as const,
  },
  buyKeyTextInlineDisabled: {
    color: Colors.dark.textMuted,
  },
  dungeonCardInner: {
    height: 438,
    width: "100%" as const,
    justifyContent: "space-between" as const,
    flexShrink: 0,
  },
  dungeonLootBox: {
    alignSelf: "stretch" as const,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: Colors.dark.background + "ee",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  dungeonLootScrollOuter: {
    alignSelf: "stretch" as const,
    width: "100%" as const,
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden" as const,
  },
  dungeonLootScroll: {
    flex: 1,
  },
  dungeonLootScrollContent: {
    gap: 6,
    paddingBottom: 2,
  },
  dungeonLootHeading: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 0,
    textAlign: "center" as const,
  },
  lootRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface + "80",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  lootRowPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  lootRowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
  },
  lootRowMid: {
    flex: 1,
    minWidth: 0,
  },
  lootRowTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    lineHeight: 16,
  },
  lootRowMeta: {
    marginTop: 2,
  },
  lootRowRarity: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  dungeonCardTitleText: {
    textAlign: "center" as const,
    alignSelf: "stretch" as const,
  },
  dungeonCardSpacer: {
    flexGrow: 1,
    minHeight: 4,
  },
  dungeonEnterOuter: {
    width: "100%" as const,
    borderRadius: 12,
    overflow: "hidden" as const,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  dungeonEnterOuterDisabled: {
    opacity: 0.48,
  },
  dungeonEnterPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  dungeonEnterGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dungeonEnterLabel: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#1a1228",
    letterSpacing: 0.2,
  },
  enterBtnTextDisabled: {
    color: "#888",
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
});
