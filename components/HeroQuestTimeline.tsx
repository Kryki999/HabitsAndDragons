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

// ─── Shared Progress Bar ──────────────────────────────────────────────────────

function QuestProgressBar({ progress, accent }: { progress: number; accent: string }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, fillAnim]);

  return (
    <View style={progressStyles.track}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            backgroundColor: accent,
            width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.border + "88",
    overflow: "hidden",
    marginTop: 8,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});

// ─── Hint Modal ───────────────────────────────────────────────────────────────

function HintModal({
  quest,
  onClose,
}: {
  quest: HeroQuestDefinition | null;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <Modal visible={quest != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={hintStyles.backdrop} onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={hintStyles.sheet} pointerEvents="box-none">
        <LinearGradient
          colors={["#241838", "#140e22"]}
          style={hintStyles.card}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={hintStyles.header}>
            <Text style={hintStyles.title}>{quest?.title}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [hintStyles.close, pressed && hintStyles.closePressed]}
              hitSlop={10}
            >
              <X size={22} color={Colors.dark.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={hintStyles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={hintStyles.body}>{quest?.hint}</Text>
          </ScrollView>
          {quest?.navigateTo ? (
            <Pressable
              onPress={() => {
                const q = quest;
                onClose();
                if (q?.navigateTo) router.push(q.navigateTo as Href);
              }}
              style={({ pressed }) => [hintStyles.goBtn, pressed && hintStyles.goBtnPressed]}
            >
              <Text style={hintStyles.goBtnText}>Przejdź teraz</Text>
              <ArrowRight size={18} color={Colors.dark.gold} />
            </Pressable>
          ) : (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [hintStyles.dismissBtn, pressed && hintStyles.dismissBtnPressed]}
            >
              <Text style={hintStyles.dismissText}>Rozumiem</Text>
            </Pressable>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const hintStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    maxHeight: "72%",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "33",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  close: { padding: 4 },
  closePressed: { opacity: 0.8 },
  scroll: { maxHeight: 220 },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
    fontWeight: "600" as const,
  },
  goBtn: {
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
  goBtnPressed: { opacity: 0.9 },
  goBtnText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  dismissBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dismissBtnPressed: { opacity: 0.88 },
  dismissText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
  },
});

// ─── Daily Ritual Row ─────────────────────────────────────────────────────────
// Layout: [axis node + line] | [icon] [title / progress bar] [chevron]

function DailyQuestRow({
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
    if (!readyToClaim) { pulseRing.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseRing, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [readyToClaim, pulseRing]);

  const runCelebration = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.03, friction: 4, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleClaim = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const ok = onClaim(def);
    if (ok) { notificationAsync(NotificationFeedbackType.Success); runCelebration(); }
  }, [def, onClaim, runCelebration]);

  const nodeOuterStyle = [
    styles.nodeOuter,
    claimed && styles.nodeOuterClaimed,
    readyToClaim && styles.nodeOuterReady,
    !objectiveComplete && !claimed && styles.nodeOuterIdle,
  ];

  const progress = claimed ? 1 : objectiveComplete ? 1 : 0;

  return (
    <View style={styles.row}>
      {/* Axis */}
      <View style={styles.axisColumn}>
        <View style={styles.nodeStack}>
          {readyToClaim ? (
            <Animated.View
              style={[
                styles.nodeGlowRing,
                {
                  borderColor: accentColor,
                  opacity: pulseRing.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] }),
                  transform: [{ scale: pulseRing.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.18] }) }],
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
        {!isLast ? (
          <View style={[styles.axisLine, { backgroundColor: accentColor + "55" }]} />
        ) : (
          <View style={styles.axisLineEnd} />
        )}
      </View>

      {/* Card */}
      <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={claimed
            ? [Colors.dark.surface + "88", Colors.dark.background + "cc"]
            : [Colors.dark.surface + "ee", Colors.dark.background + "ee"]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {readyToClaim ? (
            // Claim CTA replaces the normal row when ready
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
                <Text style={styles.questIcon}>{def.icon}</Text>
                <View style={styles.claimCtaContent}>
                  <Text style={styles.claimCtaTitle}>{def.title}</Text>
                  <Text style={styles.claimCtaReward}>+{def.rewardGold} gold · odbierz nagrodę</Text>
                </View>
                <ChevronRight size={22} color="#1a1228" strokeWidth={2.8} />
              </LinearGradient>
            </Pressable>
          ) : claimed ? (
            <View style={styles.claimedRow}>
              <Text style={[styles.questIcon, { opacity: 0.5 }]}>{def.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { opacity: 0.55 }]}>{def.title}</Text>
                <QuestProgressBar progress={1} accent={Colors.dark.emerald} />
              </View>
              <View style={styles.claimedBadge}>
                <Check size={14} color={Colors.dark.emerald} strokeWidth={2.5} />
              </View>
            </View>
          ) : (
            // Normal daily row
            <Pressable
              onPress={() => {
                if (def.navigateTo) {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onNavigate(def);
                } else {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onOpenHint(def);
                }
              }}
              style={styles.normalRow}
            >
              <Text style={styles.questIcon}>{def.icon}</Text>
              <View style={styles.questContent}>
                <Text style={styles.cardTitle}>{def.title}</Text>
                <QuestProgressBar progress={progress} accent={accentColor} />
              </View>
              <ChevronRight size={20} color={Colors.dark.gold + "cc"} strokeWidth={2.2} />
            </Pressable>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ─── Epic Milestone Row ───────────────────────────────────────────────────────
// Layout: no axis | [icon] [title / progress bar] [hint button]

function EpicMilestoneRow({
  row,
  onClaim,
  onOpenHint,
  accentColor,
}: {
  row: RowModel;
  onClaim: (def: HeroQuestDefinition) => boolean;
  onOpenHint: (def: HeroQuestDefinition) => void;
  accentColor: string;
}) {
  const { def, objectiveComplete, claimed } = row;
  const readyToClaim = objectiveComplete && !claimed;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseRing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!readyToClaim) { pulseRing.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseRing, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [readyToClaim, pulseRing]);

  const runCelebration = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.04, friction: 4, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleClaim = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const ok = onClaim(def);
    if (ok) { notificationAsync(NotificationFeedbackType.Success); runCelebration(); }
  }, [def, onClaim, runCelebration]);

  // Progress calculation from tiered data
  const tierTarget = def.tiers?.[def.tierIndex ?? 0] ?? 1;
  const tierCurrent = def.tierProgress ?? 0;
  const progress = claimed ? 1 : Math.min(1, tierCurrent / tierTarget);
  const tierLabel = def.tiers
    ? `${tierCurrent} / ${tierTarget}`
    : objectiveComplete
      ? "Gotowe"
      : "W toku";

  return (
    <Animated.View style={[styles.epicCardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={claimed
          ? [Colors.dark.surface + "66", Colors.dark.background + "cc"]
          : readyToClaim
            ? [accentColor + "22", Colors.dark.background + "ee"]
            : [Colors.dark.surface + "dd", Colors.dark.background + "ee"]}
        style={[styles.epicCardGradient, readyToClaim && { borderColor: accentColor + "88" }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {readyToClaim ? (
          // Full-width claim CTA
          <Pressable
            onPress={handleClaim}
            style={({ pressed }) => [styles.epicClaimRow, pressed && styles.epicClaimRowPressed]}
          >
            <Text style={styles.questIcon}>{def.icon}</Text>
            <View style={styles.questContent}>
              <Text style={[styles.cardTitle, { color: accentColor }]}>{def.title}</Text>
              <Text style={styles.epicTierLabel}>Tier ukończony — odbierz nagrodę!</Text>
            </View>
            <LinearGradient
              colors={[accentColor + "cc", accentColor + "88"]}
              style={styles.epicClaimChip}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={14} color="#fff" strokeWidth={2.4} />
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.epicNormalRow}>
            {/* Icon */}
            <View style={[styles.epicIconWrap, claimed && { opacity: 0.5 }]}>
              <Text style={styles.questIcon}>{def.icon}</Text>
            </View>

            {/* Content */}
            <View style={styles.questContent}>
              <Text style={[styles.cardTitle, claimed && { opacity: 0.55 }]}>{def.title}</Text>
              <QuestProgressBar progress={progress} accent={claimed ? Colors.dark.emerald : accentColor} />
              <Text style={styles.epicTierLabel}>{claimed ? "Tier ukończony ✓" : tierLabel}</Text>
            </View>

            {/* Right: hint or claimed check */}
            {claimed ? (
              <View style={styles.claimedBadge}>
                <Check size={14} color={Colors.dark.emerald} strokeWidth={2.5} />
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onOpenHint(def);
                }}
                style={({ pressed }) => [styles.hintBtn, pressed && styles.hintBtnPressed]}
                accessibilityLabel="Hint"
              >
                <HelpCircle size={18} color={Colors.dark.textSecondary} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

type SectionProps = {
  sectionTitle: string;
  sectionSubtitle: string;
  rows: RowModel[];
  onClaim: (def: HeroQuestDefinition) => boolean;
  accentColor: string;
};

function DailySection({ sectionTitle, sectionSubtitle, rows, onClaim, accentColor }: SectionProps) {
  const router = useRouter();
  const [hintQuest, setHintQuest] = useState<HeroQuestDefinition | null>(null);

  const onNavigate = useCallback(
    (def: HeroQuestDefinition) => { if (def.navigateTo) router.push(def.navigateTo as Href); },
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
        <DailyQuestRow
          key={row.def.id}
          row={row}
          isLast={index === rows.length - 1}
          onClaim={onClaim}
          onOpenHint={setHintQuest}
          onNavigate={onNavigate}
          accentColor={accentColor}
        />
      ))}

      <HintModal quest={hintQuest} onClose={() => setHintQuest(null)} />
    </View>
  );
}

function EpicSection({ sectionTitle, sectionSubtitle, rows, onClaim, accentColor }: SectionProps) {
  const [hintQuest, setHintQuest] = useState<HeroQuestDefinition | null>(null);

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

      {rows.map((row) => (
        <View key={row.def.id} style={styles.epicRowWrap}>
          <EpicMilestoneRow
            row={row}
            onClaim={onClaim}
            onOpenHint={setHintQuest}
            accentColor={accentColor}
          />
        </View>
      ))}

      <HintModal quest={hintQuest} onClose={() => setHintQuest(null)} />
    </View>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

type Props = {
  dailyRows: RowModel[];
  epicRows: RowModel[];
  onClaimDaily: (def: HeroQuestDefinition) => boolean;
  onClaimEpic: (def: HeroQuestDefinition) => boolean;
  dailyResetCountdown: string;
};

export default function HeroQuestTimeline({
  dailyRows,
  epicRows,
  onClaimDaily,
  onClaimEpic,
  dailyResetCountdown,
}: Props) {
  const dailyAccent = Colors.dark.gold;
  const epicAccent = "#9b6cff";

  return (
    <View style={styles.timelineRoot}>
      <DailySection
        sectionTitle="Codzienne rytuały"
        sectionSubtitle={`Odświeżenie za ${dailyResetCountdown} (h:mm) — dostępne zawsze 4 rytuały dziennie.`}
        rows={dailyRows}
        onClaim={onClaimDaily}
        accentColor={dailyAccent}
      />
      <View style={styles.sectionSpacer} />
      <EpicSection
        sectionTitle="Epickie kamienie milowe"
        sectionSubtitle="System warstwowy — każdy cel rośnie po odebraniu nagrody."
        rows={epicRows}
        onClaim={onClaimEpic}
        accentColor={epicAccent}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AXIS_W = 36;

const styles = StyleSheet.create({
  timelineRoot: { width: "100%" },
  section: { marginBottom: 4 },
  sectionSpacer: { height: 28 },
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
  sectionHeaderText: { flex: 1 },
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

  // ── Daily row ──
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
  nodeOuterIdle: { opacity: 0.9 },
  nodeOuterReady: { borderColor: Colors.dark.gold + "aa" },
  nodeOuterClaimed: { borderColor: Colors.dark.emerald + "88" },
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
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border + "99",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },

  // Normal daily row inner layout
  normalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  questIcon: {
    fontSize: 28,
  },
  questContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.1,
  },

  // Claim CTA (daily)
  claimCta: { overflow: "hidden" },
  claimCtaPressed: { opacity: 0.93 },
  claimCtaGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  claimCtaContent: { flex: 1 },
  claimCtaTitle: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#1a1228",
  },
  claimCtaReward: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#1a1228",
    opacity: 0.7,
    marginTop: 2,
  },

  // Claimed (daily)
  claimedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  claimedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.emerald + "18",
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "44",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Epic rows ──
  epicRowWrap: {
    marginBottom: 12,
  },
  epicCardWrap: {
    width: "100%",
  },
  epicCardGradient: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.dark.border + "99",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  epicNormalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  epicIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "88",
    borderWidth: 1,
    borderColor: Colors.dark.border + "66",
  },
  epicTierLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
  },
  epicClaimRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  epicClaimRowPressed: {
    opacity: 0.93,
  },
  epicClaimChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hint button
  hintBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  hintBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
