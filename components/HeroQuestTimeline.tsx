import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { ArrowRight, Check, ChevronRight, HelpCircle, Sparkles, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import type { HeroQuestDefinition } from "@/constants/heroQuestSystem";
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from "@/lib/hapticsGate";

type RowModel = {
  def: HeroQuestDefinition;
  objectiveComplete: boolean;
  claimed: boolean;
};

type SectionProps = {
  sectionTitle: string;
  sectionSubtitle: string;
  rows: RowModel[];
  onClaim: (def: HeroQuestDefinition) => boolean;
  accentColor: string;
};

function statShort(stat: string): string {
  if (stat === "strength") return "STR";
  if (stat === "agility") return "AGI";
  return "INT";
}

function QuestRow({
  row,
  isLast,
  onClaim,
  onOpenHint,
  onNavigate,
  accentColor,
}: {
  row: RowModel;
  isLast: boolean;
  onClaim: (def: HeroQuestDefinition) => boolean;
  onOpenHint: (def: HeroQuestDefinition) => void;
  onNavigate: (def: HeroQuestDefinition) => void;
  accentColor: string;
}) {
  const { def, objectiveComplete, claimed } = row;
  const readyToClaim = objectiveComplete && !claimed;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseRing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!readyToClaim) {
      pulseRing.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseRing, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [readyToClaim, pulseRing]);

  const runClaimCelebration = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.04, friction: 4, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleClaim = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const ok = onClaim(def);
    if (ok) {
      notificationAsync(NotificationFeedbackType.Success);
      runClaimCelebration();
    }
  }, [def, onClaim, runClaimCelebration]);

  const nodeOuterStyle = [
    styles.nodeOuter,
    claimed && styles.nodeOuterClaimed,
    readyToClaim && styles.nodeOuterReady,
    !objectiveComplete && !claimed && styles.nodeOuterIdle,
  ];

  return (
    <View style={styles.row}>
      <View style={styles.axisColumn}>
        <View style={styles.nodeStack}>
          {readyToClaim ? (
            <Animated.View
              style={[
                styles.nodeGlowRing,
                {
                  borderColor: accentColor,
                  opacity: pulseRing.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] }),
                  transform: [
                    {
                      scale: pulseRing.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.18] }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
          <View style={nodeOuterStyle}>
            {claimed ? (
              <LinearGradient colors={[Colors.dark.gold + "cc", Colors.dark.goldDark + "dd"]} style={styles.nodeInnerFill}>
                <Check size={14} color="#1a1228" strokeWidth={3} />
              </LinearGradient>
            ) : readyToClaim ? (
              <LinearGradient colors={[accentColor + "99", accentColor + "44"]} style={styles.nodeInnerFill}>
                <Sparkles size={14} color={Colors.dark.gold} strokeWidth={2.4} />
              </LinearGradient>
            ) : (
              <View style={styles.nodeInnerHollow} />
            )}
          </View>
        </View>
        {!isLast ? <View style={[styles.axisLine, { backgroundColor: accentColor + "55" }]} /> : <View style={styles.axisLineEnd} />}
      </View>

      <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={
            claimed
              ? [Colors.dark.surface + "88", Colors.dark.background + "cc"]
              : [Colors.dark.surface + "ee", Colors.dark.background + "ee"]
          }
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>{def.title}</Text>
              <Text style={styles.cardDesc}>{def.description}</Text>
            </View>
          </View>

          <View style={styles.rewardRow}>
            <Text style={styles.rewardTextGold}>+{def.rewardGold} gold</Text>
            {def.rewardXP ? (
              <Text style={styles.rewardTextMuted}>
                +{def.rewardXP.amount} XP · {statShort(def.rewardXP.stat)}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            {claimed ? (
              <View style={styles.claimedPill}>
                <Check size={16} color={Colors.dark.emerald} strokeWidth={2.5} />
                <Text style={styles.claimedPillText}>Nagroda odebrana</Text>
              </View>
            ) : readyToClaim ? (
              <Pressable
                onPress={handleClaim}
                style={({ pressed }) => [styles.claimCta, pressed && styles.claimCtaPressed]}
              >
                <LinearGradient
                  colors={[...Colors.gradients.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.claimCtaGrad}
                >
                  <Text style={styles.claimCtaText}>Odbierz nagrodę</Text>
                  <ChevronRight size={18} color="#1a1228" strokeWidth={2.8} />
                </LinearGradient>
              </Pressable>
            ) : (
              <>
                {def.navigateTo ? (
                  <Pressable
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      onNavigate(def);
                    }}
                    style={({ pressed }) => [styles.iconAction, pressed && styles.iconActionPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Przejdź do zadania"
                  >
                    <ArrowRight size={18} color={Colors.dark.gold} strokeWidth={2.4} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    onOpenHint(def);
                  }}
                  style={({ pressed }) => [styles.iconAction, pressed && styles.iconActionPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Podpowiedź"
                >
                  <HelpCircle size={18} color={Colors.dark.textSecondary} strokeWidth={2.2} />
                </Pressable>
              </>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

function QuestSection({ sectionTitle, sectionSubtitle, rows, onClaim, accentColor }: SectionProps) {
  const router = useRouter();
  const [hintQuest, setHintQuest] = useState<HeroQuestDefinition | null>(null);

  const onNavigate = useCallback(
    (def: HeroQuestDefinition) => {
      if (!def.navigateTo) return;
      router.push(def.navigateTo as Href);
    },
    [router],
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: accentColor }]} />
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <Text style={styles.sectionSubtitle}>{sectionSubtitle}</Text>
        </View>
      </View>

      {rows.map((row, index) => (
        <QuestRow
          key={row.def.id}
          row={row}
          isLast={index === rows.length - 1}
          onClaim={onClaim}
          onOpenHint={setHintQuest}
          onNavigate={onNavigate}
          accentColor={accentColor}
        />
      ))}

      <Modal visible={hintQuest != null} transparent animationType="fade" onRequestClose={() => setHintQuest(null)}>
        <Pressable style={styles.hintBackdrop} onPress={() => setHintQuest(null)}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        <View style={styles.hintSheet} pointerEvents="box-none">
          <LinearGradient
            colors={["#241838", "#140e22"]}
            style={styles.hintCard}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <View style={styles.hintHeader}>
              <Text style={styles.hintTitle}>{hintQuest?.title}</Text>
              <Pressable
                onPress={() => setHintQuest(null)}
                style={({ pressed }) => [styles.hintClose, pressed && styles.hintClosePressed]}
                hitSlop={10}
              >
                <X size={22} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.hintScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.hintBody}>{hintQuest?.hint}</Text>
            </ScrollView>
            {hintQuest?.navigateTo ? (
              <Pressable
                onPress={() => {
                  const q = hintQuest;
                  setHintQuest(null);
                  if (q?.navigateTo) router.push(q.navigateTo as Href);
                }}
                style={({ pressed }) => [styles.hintGoBtn, pressed && styles.hintGoBtnPressed]}
              >
                <Text style={styles.hintGoBtnText}>Przejdź teraz</Text>
                <ArrowRight size={18} color={Colors.dark.gold} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setHintQuest(null)}
                style={({ pressed }) => [styles.hintDismiss, pressed && styles.hintDismissPressed]}
              >
                <Text style={styles.hintDismissText}>Rozumiem</Text>
              </Pressable>
            )}
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

type Props = {
  dailyRows: RowModel[];
  epicRows: RowModel[];
  onClaimDaily: (def: HeroQuestDefinition) => boolean;
  onClaimEpic: (def: HeroQuestDefinition) => boolean;
};

export default function HeroQuestTimeline({ dailyRows, epicRows, onClaimDaily, onClaimEpic }: Props) {
  const dailyAccent = Colors.dark.gold;
  const epicAccent = "#9b6cff";

  return (
    <View style={styles.timelineRoot}>
      <QuestSection
        sectionTitle="Codzienne rytuały"
        sectionSubtitle="Odświeżane co wschód słońca — wracaj, by splątać kolejny węzeł."
        rows={dailyRows}
        onClaim={onClaimDaily}
        accentColor={dailyAccent}
      />
      <View style={styles.sectionSpacer} />
      <QuestSection
        sectionTitle="Epickie kamienie milowe"
        sectionSubtitle="Jednorazowe ścieżki inicjacji — raz zdobyte, na zawsze w kronice."
        rows={epicRows}
        onClaim={onClaimEpic}
        accentColor={epicAccent}
      />
    </View>
  );
}

const AXIS_W = 36;

const styles = StyleSheet.create({
  timelineRoot: {
    width: "100%",
  },
  section: {
    marginBottom: 4,
  },
  sectionSpacer: {
    height: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  sectionAccent: {
    width: 4,
    marginTop: 4,
    minHeight: 36,
    borderRadius: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.dark.textMuted,
    fontWeight: "600" as const,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  axisColumn: {
    width: AXIS_W,
    alignItems: "center",
  },
  nodeStack: {
    width: AXIS_W,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeGlowRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  nodeOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.dark.border + "cc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "ee",
  },
  nodeOuterIdle: {
    opacity: 0.9,
  },
  nodeOuterReady: {
    borderColor: Colors.dark.gold + "aa",
  },
  nodeOuterClaimed: {
    borderColor: Colors.dark.emerald + "88",
  },
  nodeInnerFill: {
    width: "100%",
    height: "100%",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeInnerHollow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.textMuted + "55",
  },
  axisLine: {
    flex: 1,
    width: 2,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 1,
    opacity: 0.85,
  },
  axisLineEnd: {
    width: 2,
    flex: 1,
    minHeight: 8,
  },
  cardWrap: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
  },
  cardGradient: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border + "99",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  cardTop: {
    marginBottom: 10,
  },
  cardTitleBlock: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.2,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.dark.textSecondary,
    fontWeight: "600" as const,
  },
  rewardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  rewardTextGold: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 0.2,
  },
  rewardTextMuted: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 0.2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minHeight: 48,
  },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  iconActionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  claimCta: {
    alignSelf: "stretch",
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  claimCtaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  claimCtaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  claimCtaText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#1a1228",
    letterSpacing: 0.3,
  },
  claimedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.emerald + "18",
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "44",
  },
  claimedPillText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.emerald,
  },
  hintBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  hintSheet: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  hintCard: {
    borderRadius: 22,
    padding: 18,
    maxHeight: "72%",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "33",
  },
  hintHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  hintTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  hintClose: {
    padding: 4,
  },
  hintClosePressed: {
    opacity: 0.8,
  },
  hintScroll: {
    maxHeight: 220,
  },
  hintBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
    fontWeight: "600" as const,
  },
  hintGoBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.gold + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "55",
  },
  hintGoBtnPressed: {
    opacity: 0.9,
  },
  hintGoBtnText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  hintDismiss: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  hintDismissPressed: {
    opacity: 0.88,
  },
  hintDismissText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
  },
});
