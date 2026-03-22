import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  Sparkles,
  Flame,
  Scroll,
  Star,
  MessageCircle,
  Lock,
  Settings,
  Wine,
  FlaskConical,
  Dices,
} from "lucide-react-native";
import { impactAsync, selectionAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { getEpicQuestById, EPIC_QUEST_DEFINITIONS } from "@/constants/epicQuests";
import { GOLD_SAGE_EPIC_REROLL } from "@/lib/economy";
import LifeGoalModal from "@/components/LifeGoalModal";

const SAGE_QUOTES = [
  {
    text: "Smoka, którego musisz pokonać, nie ma poza jaskinią — to nawyk, przed którym uciekasz.",
    author: "Starszy Mędrzec",
  },
  {
    text: "Prawdziwą bitwę wojownik stacza każdego ranka, w ciszy zanim obudzi się świat.",
    author: "Mistrz Kael",
  },
  {
    text: "Konsekwencja to zaklęcie, które zamienia chłopów w królów.",
    author: "Arcymag Cierń",
  },
];

const CHAT_MESSAGES = [
  {
    sender: "sage",
    text: "Witaj ponownie, śmiały poszukiwaczu. Gwiazdy szepczą o twojej podróży…",
  },
  {
    sender: "sage",
    text: "Ukończ Epicki Quest poniżej, by zdobyć bonusowe złoto. Mędrzec patrzy i nagradza odważnych.",
  },
  {
    sender: "sage",
    text: "Pamiętaj: każdy odhaczony nawyk to zaklęcie rzucane na chaos przeciętności.",
  },
];

function SageMessage({ message, delay }: { message: { sender: string; text: string }; delay: number }) {
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(entryAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.chatBubble,
        {
          opacity: entryAnim,
          transform: [
            { translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
            { scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        },
      ]}
    >
      <View style={styles.chatBubbleAccent} />
      <Text style={styles.chatBubbleText}>{message.text}</Text>
    </Animated.View>
  );
}

export default function SageScreen() {
  const { width: winW } = useWindowDimensions();
  const pricingCardWidth = Math.min(winW * 0.82, 320);
  const insets = useSafeAreaInsets();
  const gold = useGameStore((s) => s.gold);
  const claimSageEpicQuestReward = useGameStore((s) => s.claimSageEpicQuestReward);
  const ensureSageEpicState = useGameStore((s) => s.ensureSageEpicState);
  const paySageEpicReroll = useGameStore((s) => s.paySageEpicReroll);
  const selectSageEpicQuest = useGameStore((s) => s.selectSageEpicQuest);
  const sageEpicQuestClaimedToday = useGameStore((s) => s.sageEpicQuestClaimedToday);
  const sageEpicQuestId = useGameStore((s) => s.sageEpicQuestId);
  const sageEpicRerollPendingIds = useGameStore((s) => s.sageEpicRerollPendingIds);
  const sageEpicRerollsUsedToday = useGameStore((s) => s.sageEpicRerollsUsedToday);

  const [questCompleted, setQuestCompleted] = useState(false);
  const [lifeGoalOpen, setLifeGoalOpen] = useState(false);
  const [currentQuote] = useState(() => SAGE_QUOTES[Math.floor(Math.random() * SAGE_QUOTES.length)]);

  useEffect(() => {
    ensureSageEpicState();
  }, [ensureSageEpicState]);

  useEffect(() => {
    if (sageEpicQuestClaimedToday) setQuestCompleted(true);
  }, [sageEpicQuestClaimedToday]);

  const currentQuest = useMemo(() => {
    const q = getEpicQuestById(sageEpicQuestId);
    return q ?? EPIC_QUEST_DEFINITIONS[0]!;
  }, [sageEpicQuestId]);

  const pendingQuests = useMemo(() => {
    if (!sageEpicRerollPendingIds?.length) return [];
    return sageEpicRerollPendingIds
      .map((id) => getEpicQuestById(id))
      .filter(Boolean) as typeof EPIC_QUEST_DEFINITIONS;
  }, [sageEpicRerollPendingIds]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0.5)).current;
  const questPulseAnim = useRef(new Animated.Value(1)).current;
  const rewardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0.45, duration: 1600, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(questPulseAnim, { toValue: 1.02, duration: 1800, useNativeDriver: true }),
        Animated.timing(questPulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleCompleteQuest = useCallback(() => {
    if (questCompleted || sageEpicQuestClaimedToday) return;
    impactAsync(ImpactFeedbackStyle.Heavy);

    setQuestCompleted(true);
    claimSageEpicQuestReward(currentQuest.stat, 20);

    Animated.spring(rewardAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();

    const statLabel = currentQuest.stat.charAt(0).toUpperCase() + currentQuest.stat.slice(1);
    Alert.alert(
      "⚡ Epicki Quest ukończony!",
      `+50 złota 🪙\n+20 ${statLabel} XP\n\nMędrzec jest zadowolony z twojej determinacji.`,
    );
  }, [questCompleted, sageEpicQuestClaimedToday, claimSageEpicQuestReward, currentQuest.stat]);

  const handleReroll = useCallback(() => {
    if (sageEpicQuestClaimedToday) {
      Alert.alert("Nie można zmienić", "Nagrody za dzisiejszy quest zostały już odebrane.");
      return;
    }
    if (sageEpicRerollsUsedToday >= 1) {
      Alert.alert("Limit wyczerpany", "Możesz zmienić Epicki Quest tylko raz dziennie.");
      return;
    }
    if (gold < GOLD_SAGE_EPIC_REROLL) {
      Alert.alert("Za mało złota", `Potrzebujesz ${GOLD_SAGE_EPIC_REROLL} złota, by wylosować nowe propozycje.`);
      return;
    }
    impactAsync(ImpactFeedbackStyle.Medium);
    const ok = paySageEpicReroll();
    if (!ok) {
      Alert.alert("Nie udało się", "Spróbuj ponownie za chwilę.");
    }
  }, [
    sageEpicQuestClaimedToday,
    sageEpicRerollsUsedToday,
    gold,
    paySageEpicReroll,
  ]);

  const handlePickQuest = useCallback(
    (id: string) => {
      impactAsync(ImpactFeedbackStyle.Light);
      selectSageEpicQuest(id);
    },
    [selectSageEpicQuest],
  );

  const handlePremiumCta = useCallback(() => {
    Alert.alert("Wkrótce dostępne!", "Subskrypcja Legendarny Bohater pojawi się w kolejnej aktualizacji.");
  }, []);

  const rerollDisabled =
    sageEpicQuestClaimedToday ||
    sageEpicRerollsUsedToday >= 1 ||
    gold < GOLD_SAGE_EPIC_REROLL ||
    (sageEpicRerollPendingIds?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.sage]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.mysticalOrb1, { opacity: sparkleAnim }]} />
      <Animated.View
        style={[
          styles.mysticalOrb2,
          { opacity: sparkleAnim.interpolate({ inputRange: [0.45, 1], outputRange: [0.25, 0.75] }) },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Animated.View
          style={[
            styles.headerRow,
            {
              opacity: headerAnim,
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <LinearGradient colors={["#3d2418", "#2a1810"]} style={styles.tavernEmblem}>
              <Wine size={26} color="#e8a060" />
            </LinearGradient>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>Tawerna Mędrca</Text>
              <View style={styles.subtitleRow}>
                <FlaskConical size={12} color={Colors.dark.textMuted} />
                <Text style={styles.subtitle}>Eliksiry, świece i starożytne mapy</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => {
              selectionAsync();
              setLifeGoalOpen(true);
            }}
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
            accessibilityLabel="Ustawienia i personalizacja"
          >
            <LinearGradient colors={["#2a2038", "#1a1528"]} style={styles.settingsBtnInner}>
              <Settings size={22} color={Colors.dark.gold} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <MessageCircle size={14} color={Colors.dark.purple} />
            <Text style={styles.chatHeaderText}>RADY MĘDRCA</Text>
          </View>
          <View style={styles.chatWindow}>
            {CHAT_MESSAGES.map((msg, i) => (
              <SageMessage key={i} message={msg} delay={200 + i * 180} />
            ))}
            <SageMessage
              message={{
                sender: "sage",
                text: `„${currentQuote.text}” — ${currentQuote.author}`,
              }}
              delay={200 + CHAT_MESSAGES.length * 180}
            />
          </View>

          <View style={styles.lockedInputOuter}>
            <LinearGradient colors={["#2a1a10", "#1f1528"]} style={styles.lockedInputGlow}>
              <View style={styles.lockedInputRow}>
                <Lock size={18} color={Colors.dark.gold} />
                <Text style={styles.lockedInputPlaceholder}>Napisz wiadomość do Mędrca…</Text>
              </View>
              <Text style={styles.lockedHint}>
                Wymaga subskrypcji Premium, by rozmawiać z Mędrcem
              </Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.questSection}>
          <View style={styles.questHeader}>
            <Star size={14} color={Colors.dark.gold} />
            <Text style={styles.questHeaderText}>EPICKI QUEST — DZIŚ</Text>
          </View>

          {pendingQuests.length > 0 ? (
            <View style={styles.pickSection}>
              <Text style={styles.pickTitle}>Wybierz nowe zadanie</Text>
              <Text style={styles.pickSub}>Jedno z trzech — stanie się twoim Epickim Questem na dziś.</Text>
              {pendingQuests.map((q) => (
                <Pressable
                  key={q.id}
                  onPress={() => handlePickQuest(q.id)}
                  style={({ pressed }) => [styles.pickCard, pressed && styles.pickCardPressed]}
                >
                  <LinearGradient
                    colors={["#2a1f3d", "#1e1830"]}
                    style={styles.pickCardInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.pickEmoji}>{q.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickText}>{q.text}</Text>
                      <Text style={styles.pickStat}>
                        +20 {q.stat.charAt(0).toUpperCase() + q.stat.slice(1)} XP
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : (
            <Animated.View style={[styles.questCard, { transform: [{ scale: questCompleted ? 1 : questPulseAnim }] }]}>
              <LinearGradient
                colors={questCompleted ? ["#1a2a1a", "#1a2a1a"] : ["#2a1f3d", "#362a50"]}
                style={styles.questCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.questTop}>
                  <Text style={styles.questEmoji}>{currentQuest.emoji}</Text>
                  <View style={styles.questInfo}>
                    <Text style={styles.questTitle}>{currentQuest.text}</Text>
                    <View style={styles.questRewards}>
                      <View style={styles.questRewardChip}>
                        <Text style={styles.questRewardEmoji}>🪙</Text>
                        <Text style={styles.questRewardText}>+50 złota</Text>
                      </View>
                      <View style={styles.questRewardChip}>
                        <Flame size={11} color={Colors.dark.fire} />
                        <Text style={[styles.questRewardText, { color: Colors.dark.fire }]}>
                          +20{" "}
                          {currentQuest.stat.charAt(0).toUpperCase() + currentQuest.stat.slice(1)} XP
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {questCompleted && (
                  <Animated.View
                    style={[
                      styles.completedBanner,
                      {
                        opacity: rewardAnim,
                        transform: [{ scale: rewardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                      },
                    ]}
                  >
                    <Text style={styles.completedText}>⚡ QUEST UKOŃCZONY ⚡</Text>
                  </Animated.View>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          {pendingQuests.length === 0 && (
            <Pressable
              onPress={handleCompleteQuest}
              disabled={questCompleted}
              testID="complete-epic-quest"
            >
              <View style={[styles.completeBtn, questCompleted && styles.completeBtnDone]}>
                {questCompleted ? (
                  <View style={styles.completeBtnInner}>
                    <Text style={[styles.completeBtnText, { color: Colors.dark.emerald }]}>
                      ✓ Nagrody odebrane
                    </Text>
                  </View>
                ) : (
                  <>
                    <LinearGradient
                      colors={[...Colors.gradients.gold]}
                      style={styles.completeBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Scroll size={18} color="#1a1228" />
                      <Text style={styles.completeBtnText}>Ukończ Epicki Quest</Text>
                    </LinearGradient>
                    <View style={styles.completeBtnBottom} />
                  </>
                )}
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={handleReroll}
            disabled={rerollDisabled || pendingQuests.length > 0}
            style={({ pressed }) => [
              styles.rerollBtn,
              (rerollDisabled || pendingQuests.length > 0) && styles.rerollBtnDisabled,
              pressed && !rerollDisabled && pendingQuests.length === 0 && styles.rerollBtnPressed,
            ]}
          >
            <LinearGradient
              colors={
                rerollDisabled || pendingQuests.length > 0
                  ? ["#2a2535", "#1e1a28"]
                  : ["#4a3520", "#2d2018"]
              }
              style={styles.rerollInner}
            >
              <Dices size={18} color={rerollDisabled ? Colors.dark.textMuted : Colors.dark.gold} />
              <Text
                style={[
                  styles.rerollText,
                  (rerollDisabled || pendingQuests.length > 0) && { color: Colors.dark.textMuted },
                ]}
              >
                Zmień zadanie ({GOLD_SAGE_EPIC_REROLL} 🪙)
              </Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.rerollHint}>Max 1 zmiana dziennie · najpierw wybierz propozycję, jeśli jest aktywna</Text>
        </View>

        <View style={styles.soonBanner}>
          <Sparkles size={16} color={Colors.dark.textMuted} />
          <Text style={styles.soonText}>
            Zaplecze Mędrca (Sklep & Koło Fortuny) — Wkrótce otwarcie!
          </Text>
        </View>

        <Text style={styles.pricingSectionTitle}>Plany</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={pricingCardWidth + 14}
          snapToAlignment="start"
          contentContainerStyle={styles.pricingCarousel}
        >
          <LinearGradient
            colors={["#1e1a28", "#16121f"]}
            style={[styles.planCard, styles.planCardCarousel, { width: pricingCardWidth }]}
          >
            <Text style={styles.planName}>Darmowy Odkrywca</Text>
            <Text style={styles.planPrice}>0 zł</Text>
            <View style={styles.planBullets}>
              <Text style={styles.planBullet}>• Podstawowy tracker nawyków</Text>
              <Text style={styles.planBullet}>• Bazowe zadania i progresja</Text>
              <Text style={styles.planBullet}>• Epicki Quest (jeden dziennie)</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={["#2d2048", "#1e1438"]}
            style={[styles.planCard, styles.planCardPremium, styles.planCardCarousel, { width: pricingCardWidth }]}
          >
            <View style={styles.premiumBadgeRow}>
              <View style={{ flex: 1 }} />
              <LinearGradient colors={[...Colors.gradients.purple]} style={styles.premiumBadgeInline}>
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </LinearGradient>
            </View>
            <Text style={styles.planNamePremium}>Legendarny Bohater</Text>
            <Text style={styles.planPricePremium}>Wkrótce</Text>
            <View style={styles.planBullets}>
              <Text style={styles.planBulletLight}>✦ Spersonalizowany Trener AI</Text>
              <Text style={styles.planBulletLight}>✦ Nielimitowany czat z Mędrcem</Text>
              <Text style={styles.planBulletLight}>✦ Analityka nawyków</Text>
            </View>
            <Pressable onPress={handlePremiumCta} style={styles.ctaPremium}>
              <LinearGradient colors={[...Colors.gradients.gold]} style={styles.ctaPremiumGrad}>
                <Text style={styles.ctaPremiumText}>Wybierz Premium</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </ScrollView>

      <LifeGoalModal visible={lifeGoalOpen} onClose={() => setLifeGoalOpen(false)} />
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
  mysticalOrb1: {
    position: "absolute" as const,
    top: 80,
    right: 20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#6b2d4a18",
  },
  mysticalOrb2: {
    position: "absolute" as const,
    bottom: 220,
    left: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2d5a4a12",
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    marginBottom: 22,
  },
  headerLeft: {
    flexDirection: "row" as const,
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  tavernEmblem: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#5c3d2818",
    ...Platform.select({
      ios: {
        shadowColor: "#e8a060",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  headerTitles: {
    flex: 1,
    justifyContent: "center" as const,
  },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  subtitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    flex: 1,
  },
  settingsBtn: {
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  settingsBtnPressed: {
    opacity: 0.85,
  },
  settingsBtnInner: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
  },
  chatSection: {
    marginBottom: 20,
  },
  chatHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  chatHeaderText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
  },
  chatWindow: {
    marginBottom: 12,
  },
  chatBubble: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: "relative" as const,
    overflow: "hidden" as const,
    marginLeft: 4,
  },
  chatBubbleAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.dark.purple + "90",
  },
  chatBubbleText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 21,
    paddingLeft: 6,
  },
  lockedInputOuter: {
    borderRadius: 16,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  lockedInputGlow: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "55",
  },
  lockedInputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    opacity: 0.75,
  },
  lockedInputPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
  },
  lockedHint: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.dark.gold,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  questSection: {
    gap: 10,
    marginBottom: 20,
  },
  questHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  questHeaderText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
  },
  pickSection: {
    gap: 10,
  },
  pickTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  pickSub: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  pickCard: {
    borderRadius: 14,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "35",
  },
  pickCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  pickCardInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    gap: 12,
  },
  pickEmoji: {
    fontSize: 32,
  },
  pickText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  pickStat: {
    fontSize: 12,
    color: Colors.dark.gold,
    marginTop: 4,
    fontWeight: "600" as const,
  },
  questCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "30",
  },
  questCardGradient: {
    padding: 18,
  },
  questTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  questEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  questRewards: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  questRewardChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  questRewardEmoji: {
    fontSize: 12,
  },
  questRewardText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
  },
  completedBanner: {
    marginTop: 14,
    alignItems: "center" as const,
    paddingVertical: 8,
    backgroundColor: Colors.dark.emerald + "15",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "30",
  },
  completedText: {
    fontSize: 13,
    fontWeight: "900" as const,
    color: Colors.dark.emerald,
    letterSpacing: 1.5,
  },
  rerollBtn: {
    borderRadius: 14,
    overflow: "hidden" as const,
    marginTop: 4,
  },
  rerollBtnDisabled: {
    opacity: 0.65,
  },
  rerollBtnPressed: {
    opacity: 0.9,
  },
  rerollInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    gap: 10,
  },
  rerollText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  rerollHint: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
  },
  completeBtn: {
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  completeBtnDone: {
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "30",
    backgroundColor: Colors.dark.emerald + "08",
    borderRadius: 14,
  },
  completeBtnInner: {
    paddingVertical: 16,
    alignItems: "center" as const,
  },
  completeBtnGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    gap: 10,
  },
  completeBtnText: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#1a1228",
    letterSpacing: 0.5,
  },
  completeBtnBottom: {
    height: 5,
    backgroundColor: Colors.dark.goldDark,
  },
  soonBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#0d081220",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    opacity: 0.72,
    marginBottom: 24,
  },
  soonText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    lineHeight: 20,
  },
  pricingSectionTitle: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: "center" as const,
  },
  pricingCarousel: {
    paddingBottom: 8,
    paddingHorizontal: 4,
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
  },
  planCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 220,
  },
  planCardCarousel: {
    marginRight: 14,
  },
  planCardPremium: {
    borderColor: Colors.dark.purple + "66",
    paddingTop: 12,
  },
  premiumBadgeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 22,
    marginBottom: 6,
  },
  premiumBadgeInline: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: "900" as const,
    color: "#fff",
    letterSpacing: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  planNamePremium: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  planPricePremium: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    marginBottom: 10,
  },
  planBullets: {
    gap: 6,
  },
  planBullet: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  planBulletLight: {
    fontSize: 11,
    color: "#d4c4e8",
    lineHeight: 17,
  },
  ctaPremium: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  ctaPremiumGrad: {
    paddingVertical: 12,
    alignItems: "center" as const,
  },
  ctaPremiumText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#1a1228",
  },
});
