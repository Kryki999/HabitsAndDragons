import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
  Easing,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { HelpCircle, ShieldOff, Sparkles, Sword } from "lucide-react-native";
import Colors from "@/constants/colors";
import { GEAR_ITEMS } from "@/constants/gameplayConfig";
import type { DungeonChallengeId } from "@/constants/gameplayConfig";
import { LootGlyph } from "@/lib/lootGlyph";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import {
  impactAsync,
  ImpactFeedbackStyle,
} from "@/lib/hapticsGate";

export type BattleApiResult =
  | { ok: true; won: true; chance?: number; reward: { type: "item"; itemId: string } }
  | { ok: true; won: false; chance?: number; reward: { type: "gold"; amount: number } }
  | { ok: false; reason?: string };

type Phase = "idle" | "tension" | "result";

type Props = {
  visible: boolean;
  challengeId: DungeonChallengeId | null;
  dungeonName: string;
  bossName: string;
  resolveDungeonBattle: (id: string) => Promise<BattleApiResult>;
  onClose: () => void;
};

export default function BattleSimulationModal({
  visible,
  challengeId,
  dungeonName,
  bossName,
  resolveDungeonBattle,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<BattleApiResult | null>(null);
  const swordL = useRef(new Animated.Value(0)).current;
  const swordR = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const goldBurst = useRef(new Animated.Value(0)).current;
  const hapticRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (hapticRef.current) {
      clearInterval(hapticRef.current);
      hapticRef.current = null;
    }
  }, []);

  const resetAnimations = useCallback(() => {
    swordL.setValue(0);
    swordR.setValue(0);
    pulse.setValue(1);
    goldBurst.setValue(0);
  }, [goldBurst, pulse, swordL, swordR]);

  useEffect(() => {
    if (!visible || !challengeId) {
      setPhase("idle");
      setResult(null);
      stopHeartbeat();
      resetAnimations();
      return;
    }

    setPhase("tension");
    setResult(null);
    resetAnimations();

    const clash = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(swordL, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(swordL, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(swordR, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(swordR, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    clash.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    let tick = 0;
    hapticRef.current = setInterval(() => {
      tick += 1;
      const style =
        tick % 3 === 0
          ? ImpactFeedbackStyle.Medium
          : tick % 3 === 1
            ? ImpactFeedbackStyle.Light
            : ImpactFeedbackStyle.Heavy;
      impactAsync(style);
    }, 320);

    let cancelled = false;
    (async () => {
      const res = await resolveDungeonBattle(challengeId);
      if (cancelled) return;
      stopHeartbeat();
      clash.stop();
      pulseLoop.stop();
      setResult(res);
      setPhase("result");

      if (res.ok && res.won) {
        impactAsync(ImpactFeedbackStyle.Heavy);
        goldBurst.setValue(0);
        Animated.spring(goldBurst, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }).start();
      } else if (res.ok && !res.won) {
        impactAsync(ImpactFeedbackStyle.Medium);
      }
    })();

    return () => {
      cancelled = true;
      stopHeartbeat();
      clash.stop();
      pulseLoop.stop();
    };
  }, [visible, challengeId, resolveDungeonBattle, goldBurst, pulse, resetAnimations, stopHeartbeat, swordL, swordR]);

  const handleClose = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const rotL = swordL.interpolate({
    inputRange: [0, 1],
    outputRange: ["-28deg", "12deg"],
  });
  const rotR = swordR.interpolate({
    inputRange: [0, 1],
    outputRange: ["28deg", "-12deg"],
  });
  const translateXL = swordL.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 8],
  });
  const translateXR = swordR.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });

  const winItem =
    result?.ok && result.won && result.reward.type === "item"
      ? GEAR_ITEMS[result.reward.itemId as keyof typeof GEAR_ITEMS]
      : null;
  const winAccent = winItem ? LOOT_RARITY_COLOR[winItem.rarity] : Colors.dark.gold;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.root}>
        {Platform.OS === "web" ? (
          <View style={[StyleSheet.absoluteFill, styles.webBackdrop]} />
        ) : (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={phase === "result" ? handleClose : undefined} />

        <View style={styles.sheet} pointerEvents="box-none">
          {phase === "tension" && (
            <LinearGradient colors={["#1a1028ee", "#0a0612f2"]} style={styles.card}>
              <Text style={styles.versusLabel}>{dungeonName}</Text>
              <Text style={styles.bossHuge}>{bossName}</Text>
              <Text style={styles.tensionHint}>Clash in progress…</Text>
              <View style={styles.clashRow}>
                <Animated.View
                  style={{
                    transform: [{ translateX: translateXL }, { rotate: rotL }],
                  }}
                >
                  <Sword size={56} color="#c9b8e8" strokeWidth={2.2} />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  <HelpCircle size={44} color={Colors.dark.gold} />
                </Animated.View>
                <Animated.View
                  style={{
                    transform: [{ translateX: translateXR }, { rotate: rotR }],
                  }}
                >
                  <View style={{ transform: [{ scaleX: -1 }] }}>
                    <Sword size={56} color="#9aa0ff" strokeWidth={2.2} />
                  </View>
                </Animated.View>
              </View>
            </LinearGradient>
          )}

          {phase === "result" && result?.ok === false && (
            <LinearGradient colors={["#2a2228f2", "#120a0cf2"]} style={styles.card}>
              <Text style={styles.failTitle}>Retreat</Text>
              <ShieldOff size={64} color="#8a7a82" strokeWidth={1.8} />
              <Text style={styles.failBoss}>{bossName}</Text>
              <Text style={styles.sageQuote}>
                The boss was too strong… but you survived. The Sage whispers: gather strength, then return.
              </Text>
              <Text style={styles.failReason}>
                {result.reason === "no_keys" ? "Not enough keys." : "The depths claimed this round."}
              </Text>
              <Pressable onPress={handleClose} style={styles.retreatBtn}>
                <Text style={styles.retreatBtnText}>Retreat</Text>
              </Pressable>
            </LinearGradient>
          )}

          {phase === "result" && result?.ok && result.won && winItem && (
            <Animated.View
              style={{
                transform: [
                  {
                    scale: goldBurst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
                opacity: goldBurst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              }}
            >
              <LinearGradient
                colors={["#3d2e10f2", "#1a1228fa", "#0d0814ff"]}
                style={[styles.card, styles.winCard]}
              >
                <LinearGradient
                  colors={[winAccent + "55", "transparent"]}
                  style={styles.winGlow}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
                <Sparkles size={28} color={Colors.dark.gold} />
                <Text style={styles.winTitle}>Victory</Text>
                <Text style={styles.winSub}>{dungeonName}</Text>
                <View style={[styles.lootHalo, { borderColor: winAccent + "88" }]}>
                  <LootGlyph icon={winItem.icon} size={52} color={winAccent} />
                </View>
                <Text style={styles.lootName}>{winItem.name}</Text>
                <Text style={[styles.lootRarity, { color: winAccent }]}>
                  {winItem.rarity.toUpperCase()}
                </Text>
                <Pressable onPress={handleClose} style={styles.collectBtn}>
                  <LinearGradient
                    colors={[...Colors.gradients.gold]}
                    style={styles.collectGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.collectText}>Collect</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          )}

          {phase === "result" && result?.ok && !result.won && (
            <LinearGradient colors={["#2a2428f5", "#141016ff"]} style={styles.card}>
              <ShieldOff size={58} color="#6a5a62" />
              <Text style={styles.failTitle}>Defeat</Text>
              <Text style={styles.failBoss}>{bossName}</Text>
              <Text style={styles.sageQuote}>
                The boss was too strong… but you survived. Take this consolation and train harder.
              </Text>
              <Text style={styles.consolationGold}>
                +{result.reward.amount}{" "}
                <Text style={styles.coinEmoji}>🪙</Text> gold recovered
              </Text>
              <Pressable onPress={handleClose} style={styles.retreatBtn}>
                <Text style={styles.retreatBtnText}>Retreat</Text>
              </Pressable>
            </LinearGradient>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webBackdrop: {
    backgroundColor: "rgba(6,4,10,0.92)",
  },
  sheet: {
    width: "100%" as const,
    maxWidth: 360,
  },
  card: {
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "44",
    overflow: "hidden" as const,
  },
  winCard: {
    position: "relative" as const,
  },
  winGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  versusLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  bossHuge: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  tensionHint: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 22,
  },
  clashRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    marginTop: 8,
  },
  failTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#a898a0",
    marginTop: 12,
    marginBottom: 8,
  },
  failBoss: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 14,
    textAlign: "center" as const,
  },
  sageQuote: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    marginBottom: 14,
  },
  failReason: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 18,
  },
  consolationGold: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    marginBottom: 20,
  },
  coinEmoji: {
    fontSize: 18,
  },
  retreatBtn: {
    alignSelf: "stretch" as const,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2a2428",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  retreatBtnText: {
    textAlign: "center" as const,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    fontSize: 16,
  },
  winTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    marginTop: 8,
    marginBottom: 4,
  },
  winSub: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginBottom: 18,
  },
  lootHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.dark.background + "cc",
    marginBottom: 14,
  },
  lootName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
  },
  lootRarity: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 20,
  },
  collectBtn: {
    alignSelf: "stretch" as const,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  collectGradient: {
    paddingVertical: 15,
    alignItems: "center" as const,
  },
  collectText: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#1a1228",
  },
});
