import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Castle, Crown, Flame, Shirt, Sparkles, Trophy } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { REALM_MOCK_HEROES, type RealmMockHero } from "@/constants/realmMockHeroes";
import { useGameStore } from "@/store/gameStore";
import type { PlayerClass } from "@/types/game";
import RarityItemSlot from "@/components/RarityItemSlot";
import LootDetailModal, { type LootModalPayload } from "@/components/LootDetailModal";
import { resolveLootItemById } from "@/lib/itemCatalog";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";

const CLASS_LABEL: Record<PlayerClass, string> = {
  warrior: "Warrior",
  hunter: "Hunter",
  mage: "Mage",
};

const CLASS_COLOR: Record<PlayerClass, string> = {
  warrior: Colors.dark.ruby,
  hunter: Colors.dark.emerald,
  mage: Colors.dark.cyan,
};

function computePlayerRank(playerStreak: number): number {
  const combined = [
    { streak: playerStreak, isPlayer: true },
    ...REALM_MOCK_HEROES.map((h) => ({ streak: h.streak, isPlayer: false })),
  ];
  combined.sort((a, b) => b.streak - a.streak);
  return combined.findIndex((r) => r.isPlayer) + 1;
}

function RealmPlayerSticky({
  rank,
  streak,
  level,
  classLabel,
  classColor,
  outfitId,
  relicId,
  onInspectItem,
}: {
  rank: number;
  streak: number;
  level: number;
  classLabel: string;
  classColor: string;
  outfitId: string | null;
  relicId: string | null;
  onInspectItem: (itemId: string) => void;
}) {
  const entryAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.spring(entryAnim, {
      toValue: 1,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, [entryAnim, pulse]);

  return (
    <Animated.View
      style={[
        styles.stickyInner,
        {
          opacity: entryAnim,
          transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <Animated.View style={[styles.stickyGlow, { opacity: pulse }]} />
      <LinearGradient
        colors={["#1e1830", "#151020", "#120e1c"]}
        style={styles.stickyCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.stickyHeaderRow}>
          <View style={styles.youRankPill}>
            <Trophy size={13} color={Colors.dark.gold} />
            <Text style={styles.youRankText}>#{rank}</Text>
          </View>
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>YOU</Text>
          </View>
          <View style={[styles.classBadge, { borderColor: classColor + "55", backgroundColor: classColor + "12" }]}>
            <Text style={[styles.classBadgeText, { color: classColor }]}>{classLabel}</Text>
          </View>
        </View>

        <View style={styles.stickyStatsRow}>
          <View style={styles.statChip}>
            <Crown size={14} color={Colors.dark.gold} />
            <Text style={styles.statChipVal}>Lv.{level}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statChipVal, { color: Colors.dark.fire }]}>{streak}</Text>
          </View>
        </View>

        <Text style={styles.gearLabel}>Your loadout</Text>
        <View style={styles.gearRow}>
          <View style={styles.gearCol}>
            <View style={styles.gearColHead}>
              <Shirt size={14} color={Colors.dark.gold} />
              <Text style={styles.gearColTitle}>Outfit</Text>
            </View>
            <RarityItemSlot itemId={outfitId} size={64} emptyLabel="—" />
          </View>
          <View style={styles.gearCol}>
            <View style={styles.gearColHead}>
              <Sparkles size={14} color={Colors.dark.purple} />
              <Text style={styles.gearColTitle}>Relic</Text>
            </View>
            <RarityItemSlot itemId={relicId} size={64} emptyLabel="—" />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function RealmRivalRow({
  hero,
  rank,
  onInspectItem,
}: {
  hero: RealmMockHero;
  rank: number;
  onInspectItem: (itemId: string) => void;
}) {
  const entryAnim = useRef(new Animated.Value(0)).current;
  const classColor = CLASS_COLOR[hero.playerClass];
  const classLabel = CLASS_LABEL[hero.playerClass];

  useEffect(() => {
    Animated.spring(entryAnim, {
      toValue: 1,
      friction: 8,
      tension: 48,
      useNativeDriver: true,
    }).start();
  }, [entryAnim]);

  return (
    <Animated.View style={{ opacity: entryAnim }}>
      <View style={styles.rivalCard}>
        <LinearGradient
          colors={[Colors.dark.surface + "ff", Colors.dark.background + "ee"]}
          style={styles.rivalGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.rankCol}>
            <Text style={styles.rankNum}>#{rank}</Text>
          </View>
          <View style={styles.rivalMid}>
            <View style={styles.rivalNameRow}>
              <Text style={styles.rivalName} numberOfLines={1}>
                {hero.name}
              </Text>
              <View style={[styles.miniClass, { backgroundColor: classColor + "18" }]}>
                <Text style={[styles.miniClassText, { color: classColor }]}>{classLabel}</Text>
              </View>
            </View>
            <View style={styles.rivalMeta}>
              <Text style={styles.rivalMetaText}>
                Lv.<Text style={{ color: Colors.dark.gold, fontWeight: "800" }}>{hero.level}</Text>
              </Text>
              <Text style={styles.streakSep}>·</Text>
              <Text style={styles.rivalMetaText}>
                🔥 <Text style={{ color: Colors.dark.fire, fontWeight: "800" }}>{hero.streak}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.rivalGear}>
            <RarityItemSlot
              itemId={hero.outfitItemId}
              size={44}
              emptyLabel="—"
              onPress={
                hero.outfitItemId
                  ? () => {
                      onInspectItem(hero.outfitItemId!);
                    }
                  : undefined
              }
            />
            <RarityItemSlot
              itemId={hero.relicItemId}
              size={44}
              emptyLabel="—"
              onPress={
                hero.relicItemId
                  ? () => {
                      onInspectItem(hero.relicItemId!);
                    }
                  : undefined
              }
            />
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export default function KingdomScreen() {
  const insets = useSafeAreaInsets();
  const streak = useGameStore((s) => s.streak);
  const playerClass = useGameStore((s) => s.playerClass);
  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);
  const equippedOutfitId = useGameStore((s) => s.equippedOutfitId);
  const equippedRelicId = useGameStore((s) => s.equippedRelicId);

  const [lootPayload, setLootPayload] = useState<LootModalPayload | null>(null);

  const openLootItem = useCallback((itemId: string) => {
    const entry = resolveLootItemById(itemId);
    if (!entry) return;
    impactAsync(ImpactFeedbackStyle.Light);
    setLootPayload({ type: "item", entry });
  }, []);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0.2)).current;

  const level = getPlayerLevel();
  const classLabel = playerClass ? CLASS_LABEL[playerClass] : "Adventurer";
  const classColor = playerClass ? CLASS_COLOR[playerClass] : Colors.dark.gold;

  const sortedHeroes = useMemo(
    () => [...REALM_MOCK_HEROES].sort((a, b) => b.streak - a.streak),
    [],
  );

  const playerRank = useMemo(() => computePlayerRank(streak), [streak]);

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 0.5, duration: 3200, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0.2, duration: 3200, useNativeDriver: true }),
      ]),
    ).start();
  }, [headerAnim, orbAnim]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.map]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Animated.View style={[styles.glowOrb1, { opacity: orbAnim }]} />
      <Animated.View style={[styles.glowOrb2, { opacity: orbAnim }]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 28) }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={[styles.stickyWrap, { paddingTop: insets.top + 10, backgroundColor: Colors.dark.background }]}>
          <RealmPlayerSticky
            rank={playerRank}
            streak={streak}
            level={level}
            classLabel={classLabel}
            classColor={classColor}
            outfitId={equippedOutfitId}
            relicId={equippedRelicId}
            onInspectItem={openLootItem}
          />
        </View>

        <Animated.View
          style={[
            styles.headerBlock,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <LinearGradient
              colors={[Colors.dark.emerald + "cc", "#1a4a38"]}
              style={styles.kingdomEmblem}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Castle size={24} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.heroTitle}>Kingdom</Text>
              <Text style={styles.heroSubtitle}>Top Heroes · Mock leaderboard</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.sectionBar}>
          <Flame size={15} color={Colors.dark.fire} />
          <Text style={styles.sectionTitle}>Top Heroes</Text>
        </View>

        {sortedHeroes.map((hero, i) => (
          <RealmRivalRow key={hero.id} hero={hero} rank={i + 1} onInspectItem={openLootItem} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            The mist hides countless banners… Friends & live ranks are coming in a future age.
          </Text>
        </View>
      </ScrollView>

      <LootDetailModal
        visible={lootPayload !== null}
        payload={lootPayload}
        onClose={() => setLootPayload(null)}
        accentHint={
          lootPayload?.type === "item" ? LOOT_RARITY_COLOR[lootPayload.entry.rarity] : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  stickyWrap: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "66",
  },
  stickyInner: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
  },
  stickyGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.gold + "10",
    borderRadius: 18,
  },
  stickyCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "35",
  },
  stickyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  youRankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.background + "cc",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "40",
  },
  youRankText: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.dark.gold,
    letterSpacing: 0.5,
  },
  youBadge: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.dark.gold + "22",
    paddingVertical: 4,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.dark.gold,
    letterSpacing: 2,
  },
  classBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  stickyStatsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statEmoji: {
    fontSize: 14,
  },
  statChipVal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  gearLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  gearRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  gearCol: {
    alignItems: "center",
    gap: 8,
  },
  gearColHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gearColTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerBlock: {
    marginTop: 18,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  kingdomEmblem: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.emerald,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.dark.text,
    letterSpacing: 0.4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  rivalCard: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  rivalGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  rankCol: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.dark.gold,
  },
  rivalMid: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
  },
  rivalNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  rivalName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  miniClass: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniClassText: {
    fontSize: 9,
    fontWeight: "800",
  },
  rivalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rivalMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  streakSep: {
    color: Colors.dark.textMuted,
    fontSize: 12,
  },
  rivalGear: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  glowOrb1: {
    position: "absolute",
    top: 80,
    left: "8%",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.dark.emerald + "0a",
  },
  glowOrb2: {
    position: "absolute",
    bottom: 120,
    right: "5%",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.gold + "08",
  },
  footer: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 300,
  },
});
