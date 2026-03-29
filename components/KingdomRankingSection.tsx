import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import type { KingdomLeaderboardEntry } from "@/lib/kingdomLeaderboard";
import { sliceMyRankingWindow } from "@/lib/kingdomLeaderboard";
import type { PlayerClass } from "@/types/game";

const CLASS_COLOR: Record<PlayerClass, string> = {
  warrior: Colors.dark.ruby,
  hunter: Colors.dark.emerald,
  mage: Colors.dark.cyan,
  paladin: Colors.dark.gold,
};

const PODIUM_BORDER: Record<1 | 2 | 3, string> = {
  1: "#e6c66a",
  2: "#b8c4d4",
  3: "#c67c3a",
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "??";
}

export function KingdomRankedRow({
  rank,
  name,
  level,
  playerClass,
  medalTier,
  emphasized,
  onPress,
}: {
  rank: number;
  name: string;
  level: number;
  playerClass: PlayerClass;
  medalTier: 0 | 1 | 2 | 3;
  emphasized?: boolean;
  onPress: () => void;
}) {
  const classTint = CLASS_COLOR[playerClass] + "28";
  const borderMedal = medalTier !== 0 ? PODIUM_BORDER[medalTier] : "rgba(255,255,255,0.12)";

  return (
    <Pressable
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.rowOuter,
        emphasized && styles.rowOuterEmphasized,
        pressed && styles.rowPressed,
      ]}
    >
      <LinearGradient
        colors={
          emphasized
            ? ["rgba(46,36,22,0.95)", "rgba(24,18,14,0.98)"]
            : ["rgba(22,18,30,0.92)", "rgba(12,10,18,0.96)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rowGradient}
      >
        <View style={styles.rankSlot}>
          <Text
            style={[
              styles.rankText,
              medalTier === 1 && styles.rankGold,
              medalTier === 2 && styles.rankSilver,
              medalTier === 3 && styles.rankBronze,
            ]}
          >
            #{rank}
          </Text>
        </View>
        <View
          style={[
            styles.avatar,
            { backgroundColor: classTint, borderColor: borderMedal },
            medalTier !== 0 && styles.avatarPodium,
          ]}
        >
          <Text style={styles.avatarLetters}>{initialsFromName(name)}</Text>
        </View>
        <View style={styles.rowMid}>
          <Text style={styles.nickname} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.levelLine}>
            Lv. <Text style={styles.levelNum}>{level}</Text>
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

type TabKey = "top10" | "mine";

type Props = {
  entries: KingdomLeaderboardEntry[];
  onSelectEntry: (entry: KingdomLeaderboardEntry) => void;
};

export default function KingdomRankingSection({ entries, onSelectEntry }: Props) {
  const [tab, setTab] = useState<TabKey>("top10");
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [tab, fade]);

  const top10 = entries.slice(0, 10);
  const mineWindow = sliceMyRankingWindow(entries);

  const medalForTop10 = (rank: number): 0 | 1 | 2 | 3 => {
    if (rank === 1) return 1;
    if (rank === 2) return 2;
    if (rank === 3) return 3;
    return 0;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toggleTrack}>
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setTab("top10");
          }}
          style={({ pressed }) => [styles.toggleHalf, pressed && styles.togglePressed]}
        >
          {tab === "top10" ? (
            <LinearGradient
              colors={[Colors.dark.gold + "55", Colors.dark.gold + "18"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : null}
          {tab === "top10" ? <View style={styles.toggleUnderline} /> : null}
          <Text
            style={[
              styles.toggleLabel,
              tab !== "top10" && styles.toggleMuted,
              tab === "top10" && styles.toggleLabelLit,
            ]}
          >
            TOP 10
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setTab("mine");
          }}
          style={({ pressed }) => [styles.toggleHalf, pressed && styles.togglePressed]}
        >
          {tab === "mine" ? (
            <LinearGradient
              colors={[Colors.dark.gold + "55", Colors.dark.gold + "18"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : null}
          {tab === "mine" ? <View style={styles.toggleUnderline} /> : null}
          <Text
            style={[
              styles.toggleLabel,
              tab !== "mine" && styles.toggleMuted,
              tab === "mine" && styles.toggleLabelLit,
            ]}
          >
            MÓJ RANKING
          </Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.listWrap, { opacity: fade }]}>
        {tab === "top10" ? (
          <View style={styles.listInner}>
            {top10.map((e) => (
              <KingdomRankedRow
                key={e.id}
                rank={e.rank}
                name={e.name}
                level={e.level}
                playerClass={e.playerClass}
                medalTier={medalForTop10(e.rank)}
                emphasized={e.isPlayer}
                onPress={() => onSelectEntry(e)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.listInner}>
            {mineWindow.map((e) => (
              <KingdomRankedRow
                key={e.id}
                rank={e.rank}
                name={e.name}
                level={e.level}
                playerClass={e.playerClass}
                medalTier={medalForTop10(e.rank)}
                emphasized={e.isPlayer}
                onPress={() => onSelectEntry(e)}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  toggleTrack: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(212,175,106,0.35)",
    backgroundColor: "rgba(8,6,14,0.92)",
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  toggleHalf: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  toggleUnderline: {
    position: "absolute",
    bottom: 4,
    left: "12%" as const,
    right: "12%" as const,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.dark.gold,
    opacity: 0.95,
  },
  togglePressed: {
    opacity: 0.92,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.dark.gold,
    letterSpacing: 1,
  },
  toggleMuted: {
    color: Colors.dark.textMuted,
    fontWeight: "700",
  },
  toggleLabelLit: {
    textShadowColor: "rgba(230, 198, 106, 0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  listWrap: {
    minHeight: 200,
  },
  listInner: {},
  rowOuter: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(30,26,40,0.95)",
    marginBottom: 8,
  },
  rowOuterEmphasized: {
    borderColor: Colors.dark.gold + "aa",
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  rowPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  rowGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  rankSlot: {
    width: 40,
    alignItems: "center",
  },
  rankText: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.dark.textSecondary,
  },
  rankGold: {
    color: "#e6c66a",
  },
  rankSilver: {
    color: "#c8cdd6",
  },
  rankBronze: {
    color: "#c67c3a",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPodium: {
    borderWidth: 3,
  },
  avatarLetters: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.dark.text,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  nickname: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  levelLine: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textMuted,
  },
  levelNum: {
    color: Colors.dark.gold,
    fontWeight: "900",
  },
});
