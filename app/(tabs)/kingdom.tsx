import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Shirt, Sparkles, Trophy, UserPlus } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { REALM_MOCK_HEROES } from "@/constants/realmMockHeroes";
import type { RealmMockHero } from "@/constants/realmMockHeroes";
import { useGameStore } from "@/store/gameStore";
import type { PlayerClass } from "@/types/game";
import RarityItemSlot from "@/components/RarityItemSlot";
import LootDetailModal, { type LootModalPayload } from "@/components/LootDetailModal";
import { resolveLootItemById } from "@/lib/itemCatalog";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { getLevelFromXP } from "@/lib/playerLevel";
import SectionBanner from "@/components/SectionBanner";

const KINGDOM_BANNER_BG = require("@/assets/images/kingdom_bg.png");
import KingdomRankingSection, { KingdomRankedRow } from "@/components/KingdomRankingSection";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import {
  buildKingdomLeaderboard,
  entryToProfileSubject,
  type KingdomProfileSubject,
} from "@/lib/kingdomLeaderboard";

type FriendRow = {
  user_id: string;
  player_id: string | null;
  player_class: PlayerClass | null;
  game_state: {
    streak?: number;
    strengthXP?: number;
    agilityXP?: number;
    intelligenceXP?: number;
  } | null;
};

type AllyHero = RealmMockHero & { totalXP: number };

const CLASS_LABEL: Record<PlayerClass, string> = {
  warrior: "Warrior",
  hunter: "Hunter",
  mage: "Mage",
  paladin: "Paladin",
};

const CLASS_COLOR: Record<PlayerClass, string> = {
  warrior: Colors.dark.ruby,
  hunter: Colors.dark.emerald,
  mage: Colors.dark.cyan,
  paladin: Colors.dark.gold,
};

function RealmPlayerCard({
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
        styles.playerCardInner,
        {
          opacity: entryAnim,
          transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <Animated.View style={[styles.playerCardGlow, { opacity: pulse }]} />
      <LinearGradient
        colors={["#1e1830", "#151020", "#120e1c"]}
        style={styles.playerCardSurface}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.playerCardHeaderRow}>
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

        <View style={styles.playerCardStatsRow}>
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
            <RarityItemSlot
              itemId={outfitId}
              size={64}
              emptyLabel="—"
              onPress={outfitId ? () => onInspectItem(outfitId) : undefined}
            />
          </View>
          <View style={styles.gearCol}>
            <View style={styles.gearColHead}>
              <Sparkles size={14} color={Colors.dark.purple} />
              <Text style={styles.gearColTitle}>Relic</Text>
            </View>
            <RarityItemSlot
              itemId={relicId}
              size={64}
              emptyLabel="—"
              onPress={relicId ? () => onInspectItem(relicId) : undefined}
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function KingdomScreen() {
  const insets = useSafeAreaInsets();
  const { user, playerId } = useAuth();
  const streak = useGameStore((s) => s.streak);
  const playerClass = useGameStore((s) => s.playerClass);
  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);
  const strengthXP = useGameStore((s) => s.strengthXP);
  const agilityXP = useGameStore((s) => s.agilityXP);
  const intelligenceXP = useGameStore((s) => s.intelligenceXP);
  const equippedOutfitId = useGameStore((s) => s.equippedOutfitId);
  const equippedRelicId = useGameStore((s) => s.equippedRelicId);

  const [lootPayload, setLootPayload] = useState<LootModalPayload | null>(null);
  const [friendPlayerId, setFriendPlayerId] = useState("");
  const [friendBusy, setFriendBusy] = useState(false);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [profileSubject, setProfileSubject] = useState<KingdomProfileSubject | null>(null);

  const openLootItem = useCallback((itemId: string) => {
    const entry = resolveLootItemById(itemId);
    if (!entry) return;
    impactAsync(ImpactFeedbackStyle.Light);
    setLootPayload({ type: "item", entry });
  }, []);

  const orbAnim = useRef(new Animated.Value(0.2)).current;

  const level = getPlayerLevel();
  const classLabel = playerClass ? CLASS_LABEL[playerClass] : "Adventurer";
  const classColor = playerClass ? CLASS_COLOR[playerClass] : Colors.dark.gold;
  const totalXP = strengthXP + agilityXP + intelligenceXP;
  const displayName = playerId?.trim() || "Traveler";

  const leaderboard = useMemo(
    () =>
      buildKingdomLeaderboard(
        {
          name: displayName,
          level,
          streak,
          playerClass,
          totalXP,
        },
        REALM_MOCK_HEROES,
      ),
    [displayName, level, streak, playerClass, totalXP],
  );

  const playerRankDisplay = leaderboard.find((e) => e.isPlayer)?.rank ?? 1;

  const mappedFriends = useMemo<AllyHero[]>(() => {
    return friends.map((f) => {
      const gs = f.game_state ?? {};
      const txp =
        (gs.strengthXP ?? 0) + (gs.agilityXP ?? 0) + (gs.intelligenceXP ?? 0);
      const lvl = getLevelFromXP(txp);
      return {
        id: `friend_${f.user_id}`,
        name: f.player_id ?? "Unknown",
        playerClass: f.player_class ?? "warrior",
        level: lvl,
        streak: gs.streak ?? 0,
        outfitItemId: null,
        relicItemId: null,
        totalXP: txp,
      };
    });
  }, [friends]);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    const { data: links, error: linkErr } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (linkErr) {
      console.warn("[kingdom] friendships fetch failed", linkErr.message);
      return;
    }
    const ids = new Set<string>();
    for (const l of links ?? []) {
      const other = l.requester_id === user.id ? l.addressee_id : l.requester_id;
      if (other && other !== user.id) ids.add(other);
    }
    if (ids.size === 0) {
      setFriends([]);
      return;
    }
    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, player_id, player_class, game_state")
      .in("user_id", [...ids]);
    if (profErr) {
      console.warn("[kingdom] profiles fetch failed", profErr.message);
      return;
    }
    setFriends((profs as FriendRow[]) ?? []);
  }, [user?.id]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 0.5, duration: 3200, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0.2, duration: 3200, useNativeDriver: true }),
      ]),
    ).start();
  }, [orbAnim]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleAddFriend = useCallback(async () => {
    if (!user?.id || !friendPlayerId.trim() || friendBusy) return;
    setFriendBusy(true);
    const targetPlayerId = friendPlayerId.trim().toUpperCase();
    const { data: friend, error: friendErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("player_id", targetPlayerId)
      .maybeSingle();
    if (friendErr || !friend?.user_id) {
      Alert.alert("Not found", "No player exists with that Player ID.");
      setFriendBusy(false);
      return;
    }
    if (friend.user_id === user.id) {
      Alert.alert("This is your account", "You cannot add yourself.");
      setFriendBusy(false);
      return;
    }
    const { error } = await supabase.from("friendships").upsert(
      {
        requester_id: user.id,
        addressee_id: friend.user_id,
        status: "accepted",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "requester_id,addressee_id" },
    );
    if (error) {
      Alert.alert("Error", error.message);
      setFriendBusy(false);
      return;
    }
    setFriendPlayerId("");
    await loadFriends();
    setFriendBusy(false);
  }, [friendBusy, friendPlayerId, loadFriends, user?.id]);

  const openProfile = useCallback((s: KingdomProfileSubject) => {
    setProfileSubject(s);
  }, []);

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 28) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.playerCardWrap}>
          <RealmPlayerCard
            rank={playerRankDisplay}
            streak={streak}
            level={level}
            classLabel={classLabel}
            classColor={classColor}
            outfitId={equippedOutfitId}
            relicId={equippedRelicId}
            onInspectItem={openLootItem}
          />
        </View>

        <View style={styles.socialCard}>
          <Text style={styles.socialTitle}>Add friend</Text>
          <View style={styles.socialRow}>
            <TextInput
              style={styles.socialInput}
              value={friendPlayerId}
              onChangeText={setFriendPlayerId}
              placeholder="Friend Player ID"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="characters"
              editable={!friendBusy}
            />
            <Pressable
              onPress={handleAddFriend}
              disabled={friendBusy || !friendPlayerId.trim()}
              style={({ pressed }) => [
                styles.addFriendBtn,
                (friendBusy || !friendPlayerId.trim()) && styles.addFriendBtnDisabled,
                pressed && !(friendBusy || !friendPlayerId.trim()) && styles.addFriendBtnPressed,
              ]}
            >
              <UserPlus size={16} color={Colors.dark.gold} strokeWidth={2.2} />
              <Text style={styles.addFriendBtnLabel}>Add Friend</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.alliesHeading}>Allies</Text>
        {mappedFriends.length > 0 ? (
          mappedFriends.map((hero, i) => (
            <KingdomRankedRow
              key={hero.id}
              rank={i + 1}
              name={hero.name}
              level={hero.level}
              playerClass={hero.playerClass}
              medalTier={0}
              onPress={() =>
                openProfile({
                  name: hero.name,
                  level: hero.level,
                  streak: hero.streak,
                  playerClass: hero.playerClass,
                  totalXP: hero.totalXP,
                })
              }
            />
          ))
        ) : (
          <Text style={styles.noFriendsText}>No allies in your kingdom yet. Add your first friend.</Text>
        )}

        <SectionBanner title="Kingdom" source={KINGDOM_BANNER_BG} />

        <KingdomRankingSection
          entries={leaderboard}
          onSelectEntry={(e) => openProfile(entryToProfileSubject(e))}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mock rivals fill the board—your true banner rises with every streak you keep.
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

      <PlayerProfileModal
        visible={profileSubject !== null}
        subject={profileSubject}
        onClose={() => setProfileSubject(null)}
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
  playerCardWrap: {
    marginBottom: 16,
  },
  playerCardInner: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
  },
  playerCardGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.gold + "10",
    borderRadius: 18,
  },
  playerCardSurface: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "35",
  },
  playerCardHeaderRow: {
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
  playerCardStatsRow: {
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
  alliesHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 4,
  },
  socialCard: {
    marginTop: 0,
    marginBottom: 18,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    backgroundColor: Colors.dark.surface + "cc",
  },
  socialTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  socialInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.background + "dd",
    color: Colors.dark.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  addFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "66",
    backgroundColor: Colors.dark.surface,
  },
  addFriendBtnLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.dark.gold,
  },
  addFriendBtnPressed: {
    opacity: 0.9,
  },
  addFriendBtnDisabled: {
    opacity: 0.42,
  },
  noFriendsText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontStyle: "italic",
    marginBottom: 10,
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
