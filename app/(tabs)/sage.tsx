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
  TextInput,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  Scroll,
  Star,
  Send,
  SlidersHorizontal,
  FlaskConical,
  Dices,
  Coins,
  Check,
  HelpCircle,
} from "lucide-react-native";
import { impactAsync, selectionAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { getEpicQuestById, EPIC_QUEST_DEFINITIONS } from "@/constants/epicQuests";
import { GOLD_SAGE_EPIC_REROLL } from "@/lib/economy";
import LifeGoalModal from "@/components/LifeGoalModal";
import { fetchSageReply } from "@/lib/sageLlm";
import type { SageChatMessage } from "@/types/game";

const QUEST_BG = require("@/assets/images/quest_bg.png");
const WANDERER_PLAN_IMG = require("@/assets/images/wanderer.png");
const DRAGONLORD_PLAN_IMG = require("@/assets/images/dragonlord.png");

const HERO_HEIGHT = 268;
/** Bufor nad klipsem — animacja translateY (±6) nie zostawia pustki przy suficie karty. */
const HERO_FLOAT_OVERLAP = 8;

function TypingOracle() {
  const dot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);
  const opacity = dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <View style={styles.typingBubble}>
      <View style={styles.chatBubbleAccent} />
      <Text style={styles.typingMain}>The Sage gazes into the crystal orb</Text>
      <Animated.Text style={[styles.typingDots, { opacity }]}>• • •</Animated.Text>
    </View>
  );
}

function ChatBubble({ message }: { message: SageChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.chatBubbleWrap, isUser && styles.chatBubbleWrapUser]}>
      <View style={[styles.chatBubble, isUser && styles.chatBubbleUser]}>
        {!isUser && <View style={styles.chatBubbleAccent} />}
        <Text style={[styles.chatBubbleText, isUser && styles.chatBubbleTextUser]}>{message.text}</Text>
      </View>
      {message.createdAt ? (
        <Text style={[styles.chatMeta, isUser && styles.chatMetaUser]}>
          {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      ) : null}
    </View>
  );
}

export default function SageScreen() {
  const { width: winW } = useWindowDimensions();
  const pricingStackVertical = winW < 440;
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
  const sageChatMessages = useGameStore((s) => s.sageChatMessages);
  const appendSageChatMessage = useGameStore((s) => s.appendSageChatMessage);
  const playerClass = useGameStore((s) => s.playerClass);
  const streak = useGameStore((s) => s.streak);
  const sageFocus = useGameStore((s) => s.sageFocus);
  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);

  const [questCompleted, setQuestCompleted] = useState(false);
  const [lifeGoalOpen, setLifeGoalOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSageReplying, setIsSageReplying] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

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
  const upgradePulseAnim = useRef(new Animated.Value(1)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(upgradePulseAnim, { toValue: 1.035, duration: 1000, useNativeDriver: true }),
        Animated.timing(upgradePulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
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

    Alert.alert(
      "⚡ Epic Quest completed!",
      "+50 gold 🪙\n+20 XP\n\nThe Sage approves your resolve.",
    );
  }, [questCompleted, sageEpicQuestClaimedToday, claimSageEpicQuestReward, currentQuest]);

  const handleReroll = useCallback(() => {
    if (sageEpicQuestClaimedToday) {
      Alert.alert("Cannot reroll", "Today's quest reward was already claimed.");
      return;
    }
    if (sageEpicRerollsUsedToday >= 1) {
      Alert.alert("Reroll limit reached", "You can reroll the Epic Quest once per day.");
      return;
    }
    if (gold < GOLD_SAGE_EPIC_REROLL) {
      Alert.alert("Not enough gold", `You need ${GOLD_SAGE_EPIC_REROLL} gold to reroll.`);
      return;
    }
    impactAsync(ImpactFeedbackStyle.Medium);
    const ok = paySageEpicReroll();
    if (!ok) {
      Alert.alert("Action failed", "Please try again in a moment.");
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
    Alert.alert("Coming soon", "Legendary Hero subscription will arrive in a future update.");
  }, []);

  const scrollChatToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollChatToEnd();
  }, [sageChatMessages.length, isSageReplying, scrollChatToEnd]);

  const handleSendSageMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isSageReplying) return;
    selectionAsync();
    setChatInput("");
    appendSageChatMessage({ role: "user", text: trimmed });
    setIsSageReplying(true);
    try {
      const messages = useGameStore.getState().sageChatMessages;
      const level = getPlayerLevel();
      const { text } = await fetchSageReply(messages, {
        playerClass,
        level,
        streak,
        sageFocus,
      });
      appendSageChatMessage({ role: "sage", text });
    } finally {
      setIsSageReplying(false);
    }
  }, [
    chatInput,
    isSageReplying,
    appendSageChatMessage,
    getPlayerLevel,
    playerClass,
    streak,
    sageFocus,
  ]);

  const rerollDisabled =
    sageEpicQuestClaimedToday ||
    sageEpicRerollsUsedToday >= 1 ||
    gold < GOLD_SAGE_EPIC_REROLL ||
    (sageEpicRerollPendingIds?.length ?? 0) > 0;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.sage]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[
          styles.mysticalOrb1,
          { opacity: sparkleAnim, top: HERO_HEIGHT + 48 },
        ]}
      />
      <Animated.View
        style={[
          styles.mysticalOrb2,
          { opacity: sparkleAnim.interpolate({ inputRange: [0.45, 1], outputRange: [0.25, 0.75] }) },
        ]}
      />

      <ScrollView
        ref={chatScrollRef}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 0, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onContentSizeChange={scrollChatToEnd}
      >
        <Animated.View
          style={[
            styles.sageConversationShell,
            { width: winW, marginHorizontal: -20, opacity: headerAnim },
          ]}
        >
          <View style={styles.heroParallaxClip}>
            <Animated.View
              style={[styles.heroFloatLayer, { transform: [{ translateY: floatAnim }] }]}
            >
              <View style={styles.heroImageWrap}>
                <Image
                  source={require("@/assets/images/sage_tavern_bg.png")}
                  style={styles.heroImage}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "transparent",
                    "rgba(13,10,20,0.35)",
                    "rgba(13,10,20,0.75)",
                    Colors.dark.surface + "ee",
                  ]}
                  locations={[0, 0.35, 0.72, 1]}
                  style={styles.heroFade}
                />
              </View>
            </Animated.View>
          </View>

          <View style={styles.heroChromeOverlay} pointerEvents="box-none">
            <Pressable
              onPress={() => {
                selectionAsync();
                setLifeGoalOpen(true);
              }}
              style={({ pressed }) => [
                styles.heroSettingsBtn,
                { top: 4 },
                pressed && styles.settingsBtnPressed,
              ]}
              accessibilityLabel="Personalization and life goals"
              hitSlop={10}
            >
              <LinearGradient colors={["rgba(26,18,40,0.92)", "#1a1528"]} style={styles.settingsBtnInner}>
                <SlidersHorizontal size={22} color={Colors.dark.gold} strokeWidth={2.2} />
              </LinearGradient>
            </Pressable>
            <View style={styles.heroCaption} pointerEvents="none">
              <Text style={styles.heroTitle}>Sage Tavern</Text>
              <View style={styles.heroSubtitleRow}>
                <FlaskConical size={12} color={Colors.dark.textMuted} />
                <Text style={styles.heroSubtitle} numberOfLines={2}>
                  Elixirs, candles and ancient maps
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sageChatBody}>
            <ScrollView
              style={styles.chatWindowScroll}
              contentContainerStyle={styles.chatWindow}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {sageChatMessages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isSageReplying ? <TypingOracle /> : null}
            </ScrollView>

            <View style={styles.chatInputOuter}>
              <LinearGradient colors={["#2a1a10", "#1f1528"]} style={styles.chatInputGlow}>
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatTextInput}
                    placeholder="Write a message to the Sage..."
                    placeholderTextColor={Colors.dark.textMuted}
                    value={chatInput}
                    onChangeText={setChatInput}
                    editable={!isSageReplying}
                    multiline
                    maxLength={2000}
                    returnKeyType="default"
                    blurOnSubmit={false}
                  />
                  <Pressable
                    onPress={handleSendSageMessage}
                    disabled={isSageReplying || !chatInput.trim()}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      (isSageReplying || !chatInput.trim()) && styles.sendBtnDisabled,
                      pressed && !(isSageReplying || !chatInput.trim()) && styles.sendBtnPressed,
                    ]}
                    accessibilityLabel="Send message"
                  >
                    <LinearGradient
                      colors={
                        isSageReplying || !chatInput.trim()
                          ? ["#2a2535", "#1e1a28"]
                          : [...Colors.gradients.gold]
                      }
                      style={styles.sendBtnInner}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Send
                        size={20}
                        color={isSageReplying || !chatInput.trim() ? Colors.dark.textMuted : "#1a1228"}
                      />
                    </LinearGradient>
                  </Pressable>
                </View>
                <Text style={styles.chatInputHint}>Send and receive a short guidance reply.</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.sectionCard, styles.questSection]}>
          <View style={styles.questHeader}>
            <Star size={14} color={Colors.dark.gold} />
            <Text style={styles.questHeaderText}>EPIC QUEST — TODAY</Text>
          </View>

          {pendingQuests.length > 0 ? (
            <View style={styles.pickSection}>
              <Text style={styles.pickTitle}>Choose a new quest</Text>
              <Text style={styles.pickSub}>Pick one of three offers for today.</Text>
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
                      <Text style={styles.pickStat}>+20 XP</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : (
            <Animated.View style={[styles.questCard, { transform: [{ scale: questCompleted ? 1 : questPulseAnim }] }]}>
              <Image
                source={QUEST_BG}
                style={styles.questHeaderImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
                accessibilityRole="image"
                accessibilityLabel="Epic quest scroll illustration"
              />
              <LinearGradient
                colors={
                  questCompleted
                    ? ["#152a1c", "#0f1f14", "#0c1810"]
                    : ["#1e1830", "#161222", "#120e1c"]
                }
                style={styles.questBody}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <View style={styles.questCardInner}>
                  <View style={styles.questTop}>
                    <Text style={styles.questEmoji}>{currentQuest.emoji}</Text>
                    <View style={styles.questInfo}>
                      <Text style={styles.questTitle}>{currentQuest.text}</Text>
                      <Pressable
                        onPress={() => Alert.alert("Sage Lore", currentQuest.lore)}
                        style={({ pressed }) => [styles.loreBtn, pressed && styles.loreBtnPressed]}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Read quest lore"
                      >
                        <HelpCircle size={30} color={Colors.dark.gold} strokeWidth={2.6} />
                      </Pressable>
                      <View style={styles.questRewards}>
                        <View style={styles.questRewardChip}>
                          <Coins size={13} color={Colors.dark.gold} strokeWidth={2.2} />
                          <Text style={styles.questRewardText}>+50 gold</Text>
                        </View>
                        <View style={styles.questRewardChip}>
                          <Flame size={11} color={Colors.dark.fire} />
                          <Text style={[styles.questRewardText, { color: Colors.dark.fire }]}>+20 XP</Text>
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
                      <Text style={styles.completedText}>⚡ QUEST COMPLETED ⚡</Text>
                    </Animated.View>
                  )}

                  {pendingQuests.length === 0 && (
                    <Pressable
                      onPress={handleCompleteQuest}
                      disabled={questCompleted}
                      testID="complete-epic-quest"
                      style={styles.questCtaWrap}
                    >
                      {questCompleted ? (
                        <View style={[styles.completeBtn, styles.completeBtnDone]}>
                          <View style={styles.completeBtnInner}>
                            <Text style={[styles.completeBtnText, { color: Colors.dark.emerald }]}>✓ Rewards claimed</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.completeBtn}>
                          <LinearGradient
                            colors={[...Colors.gradients.gold]}
                            style={styles.completeBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Scroll size={18} color="#1a1228" />
                            <Text style={styles.completeBtnText}>Complete Epic Quest</Text>
                          </LinearGradient>
                          <View style={styles.completeBtnBottom} />
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
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
                Reroll quest
              </Text>
              <View style={styles.rerollGoldRow}>
                <Text
                  style={[
                    styles.rerollGoldAmount,
                    (rerollDisabled || pendingQuests.length > 0) && { color: Colors.dark.textMuted },
                  ]}
                >
                  {GOLD_SAGE_EPIC_REROLL}
                </Text>
                <Coins
                  size={20}
                  color={rerollDisabled || pendingQuests.length > 0 ? Colors.dark.textMuted : Colors.dark.gold}
                  strokeWidth={2.4}
                />
              </View>
            </LinearGradient>
          </Pressable>
          <Text style={styles.rerollHint}>Max 1 reroll per day · finish pending pick first</Text>
        </View>

        <View style={styles.pricingSectionHeader}>
          <Text style={styles.pricingSectionTitle}>Choose your path</Text>
          <Text style={styles.pricingSectionSub}>Whimsical power — clear tiers</Text>
        </View>

        <View style={styles.pricingCardsRow}>
          <View
            style={[
              styles.pricingRowBleed,
              pricingStackVertical && styles.pricingRowBleedStack,
            ]}
          >
            {/* Free — Wanderer */}
            <View
              style={[
                styles.saasCard,
                styles.saasCardFree,
                !pricingStackVertical && styles.saasCardRow,
              ]}
            >
              <View style={styles.saasCardHeaderFrame}>
                <Image
                  source={WANDERER_PLAN_IMG}
                  style={styles.saasCardHeaderImageFill}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View style={styles.saasCardBody}>
                <Text style={styles.saasEyebrowMuted}>Mortal</Text>
                <Text style={styles.saasTitleFree}>WANDERER</Text>
                <Text style={styles.saasPriceLine}>$0 · free forever</Text>
                <View style={styles.saasFeatureBlock}>
                  <View style={styles.saasFeatureRow}>
                    <Check size={18} color={Colors.dark.gold + "cc"} strokeWidth={2.6} />
                    <Text style={styles.saasFeatureTextFree}>Unlimited habits & quests</Text>
                  </View>
                  <View style={styles.saasFeatureRow}>
                    <Check size={18} color={Colors.dark.gold + "cc"} strokeWidth={2.6} />
                    <Text style={styles.saasFeatureTextFree}>Standard dungeons & progression</Text>
                  </View>
                  <View style={styles.saasFeatureRow}>
                    <Check size={18} color={Colors.dark.gold + "cc"} strokeWidth={2.6} />
                    <Text style={styles.saasFeatureTextFree}>3 Sage chats / day</Text>
                  </View>
                  <View style={styles.saasFeatureRow}>
                    <Check size={18} color={Colors.dark.gold + "cc"} strokeWidth={2.6} />
                    <Text style={styles.saasFeatureTextFree}>One Epic Quest daily</Text>
                  </View>
                </View>
                <View style={styles.saasCurrentPlanBtn}>
                  <Text style={styles.saasCurrentPlanBtnText}>Your current plan</Text>
                </View>
              </View>
            </View>

            {/* Premium — Dragonlord */}
            <LinearGradient
              colors={[Colors.dark.gold, Colors.dark.purple, Colors.dark.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.saasCard,
                styles.saasPremiumRing,
                !pricingStackVertical && styles.saasCardRow,
              ]}
            >
              <View style={styles.saasPremiumClip}>
                  <View style={styles.saasCardHeaderFrame}>
                    <Image
                      source={DRAGONLORD_PLAN_IMG}
                      style={styles.saasCardHeaderImageFill}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                  </View>
                <LinearGradient
                  colors={["#221a38", "#161022", "#0f0c18"]}
                  style={styles.saasCardBodyPremium}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                >
                  <Text style={styles.saasEyebrowGold}>Ascended</Text>
                  <Text style={styles.saasTitlePremium}>DRAGONLORD</Text>
                  <Text style={styles.saasTaglinePremium}>Pełna moc grymuaru</Text>
                  <Text style={styles.saasComingSoon}>Coming soon</Text>

                  <View style={styles.saasFeatureBlockPremium}>
                    <View style={styles.saasFeatureRow}>
                      <Check size={20} color={Colors.dark.gold} strokeWidth={3} />
                      <Text style={styles.saasFeatureTextPremium}>Unlimited Sage wisdom</Text>
                    </View>
                    <View style={styles.saasFeatureRow}>
                      <Check size={20} color={Colors.dark.gold} strokeWidth={3} />
                      <Text style={styles.saasFeatureTextPremium}>+15% epic drop rate</Text>
                    </View>
                    <View style={styles.saasFeatureRow}>
                      <Check size={20} color={Colors.dark.gold} strokeWidth={3} />
                      <Text style={styles.saasFeatureTextPremium}>Custom task sorting</Text>
                    </View>
                    <View style={styles.saasFeatureRow}>
                      <Check size={20} color={Colors.dark.gold} strokeWidth={3} />
                      <Text style={styles.saasFeatureTextPremium}>Weekly freeze potion</Text>
                    </View>
                    <View style={styles.saasFeatureRow}>
                      <Check size={20} color={Colors.dark.gold} strokeWidth={3} />
                      <Text style={styles.saasFeatureTextPremium}>Golden ranking name</Text>
                    </View>
                  </View>

                  <Animated.View style={{ transform: [{ scale: upgradePulseAnim }], width: "100%" as const }}>
                    <Pressable onPress={handlePremiumCta} style={styles.saasUpgradeBtn}>
                      <LinearGradient colors={[...Colors.gradients.gold]} style={styles.saasUpgradeBtnGrad}>
                        <Text style={styles.saasUpgradeBtnText}>Upgrade now</Text>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                </LinearGradient>
              </View>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>

      <LifeGoalModal visible={lifeGoalOpen} onClose={() => setLifeGoalOpen(false)} />
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
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
  heroParallaxClip: {
    height: HERO_HEIGHT,
    overflow: "hidden" as const,
    backgroundColor: Colors.dark.surface,
  },
  heroChromeOverlay: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    height: HERO_HEIGHT,
    zIndex: 10,
  },
  heroFloatLayer: {
    marginTop: -HERO_FLOAT_OVERLAP,
    height: HERO_HEIGHT + HERO_FLOAT_OVERLAP,
  },
  sageConversationShell: {
    position: "relative" as const,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border + "77",
    backgroundColor: Colors.dark.surface + "99",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.42,
        shadowRadius: 22,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  sageChatBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.dark.surface + "aa",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  heroImageWrap: {
    width: "100%" as const,
    height: HERO_HEIGHT + HERO_FLOAT_OVERLAP,
    position: "relative" as const,
    backgroundColor: Colors.dark.background,
  },
  heroImage: {
    width: "100%" as const,
    height: HERO_HEIGHT + HERO_FLOAT_OVERLAP,
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSettingsBtn: {
    position: "absolute" as const,
    right: 16,
    zIndex: 4,
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  heroCaption: {
    position: "absolute" as const,
    left: 16,
    right: 72,
    bottom: 14,
    zIndex: 3,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroSubtitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(240,230,211,0.88)",
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
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
  chatWindowScroll: {
    maxHeight: 300,
    marginBottom: 12,
  },
  chatWindow: {
    paddingRight: 2,
  },
  chatBubbleWrap: {
    marginBottom: 10,
    maxWidth: "92%",
    alignSelf: "flex-start",
  },
  chatBubbleWrapUser: {
    alignSelf: "flex-end",
  },
  chatBubble: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: "relative" as const,
    overflow: "hidden" as const,
    marginLeft: 0,
  },
  chatBubbleUser: {
    backgroundColor: "#2a2038",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderColor: Colors.dark.gold + "44",
    marginRight: 0,
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
  chatBubbleTextUser: {
    paddingLeft: 0,
  },
  chatMeta: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    marginTop: 4,
    marginLeft: 6,
  },
  chatMetaUser: {
    marginLeft: 0,
    marginRight: 6,
    textAlign: "right" as const,
    alignSelf: "flex-end",
  },
  typingBubble: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.dark.purple + "55",
    position: "relative" as const,
    overflow: "hidden" as const,
    maxWidth: "92%",
  },
  typingMain: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontStyle: "italic" as const,
    paddingLeft: 6,
    marginBottom: 6,
  },
  typingDots: {
    fontSize: 18,
    color: Colors.dark.gold,
    paddingLeft: 6,
    letterSpacing: 4,
  },
  chatInputOuter: {
    borderRadius: 16,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  chatInputGlow: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "55",
  },
  chatInputRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 10,
  },
  chatTextInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 15,
    color: Colors.dark.text,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#120a14",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendBtn: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  sendBtnDisabled: {
    opacity: 0.85,
  },
  sendBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  sendBtnInner: {
    width: 46,
    height: 46,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chatInputHint: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
  },
  questSection: {
    gap: 10,
    marginBottom: 20,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border + "66",
    backgroundColor: Colors.dark.surface + "66",
    padding: 12,
    marginBottom: 16,
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
    borderWidth: 2,
    borderColor: Colors.dark.gold + "44",
  },
  questHeaderImage: {
    width: "100%" as const,
    height: 148,
    backgroundColor: "#0a0814",
  },
  questBody: {
    width: "100%" as const,
  },
  questCardInner: {
    padding: 18,
    position: "relative" as const,
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
    paddingRight: 62,
  },
  loreBtn: {
    position: "absolute" as const,
    right: -4,
    top: -4,
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(212, 175, 106, 0.1)",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
  },
  loreBtnPressed: {
    opacity: 0.82,
    backgroundColor: "rgba(212, 175, 106, 0.16)",
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
    flexWrap: "wrap" as const,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  rerollText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  rerollGoldRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  rerollGoldAmount: {
    fontSize: 16,
    fontWeight: "900" as const,
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
  questCtaWrap: {
    marginTop: 14,
  },
  pricingSectionHeader: {
    alignItems: "center" as const,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  pricingSectionTitle: {
    fontSize: 15,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: "center" as const,
  },
  pricingSectionSub: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    marginBottom: 0,
    fontStyle: "italic" as const,
  },
  pricingCardsRow: {
    marginBottom: 20,
  },
  pricingRowBleed: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    gap: 24,
  },
  pricingRowBleedStack: {
    flexDirection: "column" as const,
    gap: 30,
  },
  saasCard: {
    borderRadius: 20,
    overflow: "hidden" as const,
  },
  saasCardRow: {
    flex: 1,
    minWidth: 0,
  },
  saasCardFree: {
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    backgroundColor: "#100c18",
    minHeight: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  saasCardHeaderFrame: {
    width: "100%" as const,
    height: 212,
    backgroundColor: "#0a0814",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  saasCardHeaderImageFill: {
    width: "100%" as const,
    height: "100%" as const,
  },
  saasCardBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    backgroundColor: "#14101c",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexGrow: 1,
  },
  saasEyebrowMuted: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 2.2,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  saasTitleFree: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  saasPriceLine: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 18,
    fontWeight: "600" as const,
  },
  saasFeatureBlock: {
    gap: 12,
    marginBottom: 20,
  },
  saasFeatureBlockPremium: {
    gap: 14,
    marginBottom: 22,
    flexGrow: 1,
  },
  saasFeatureRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  saasFeatureTextFree: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    fontWeight: "600" as const,
  },
  saasCurrentPlanBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  saasCurrentPlanBtnText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 0.5,
  },
  saasPremiumRing: {
    borderRadius: 22,
    padding: 3,
    minHeight: 440,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.purple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  saasPremiumClip: {
    borderRadius: 20,
    overflow: "hidden" as const,
    backgroundColor: "#0c0818",
    position: "relative" as const,
    flex: 1,
  },
  saasCardBodyPremium: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.gold + "28",
  },
  saasEyebrowGold: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 2.2,
    textTransform: "uppercase" as const,
    marginBottom: 4,
    opacity: 0.95,
  },
  saasTitlePremium: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  saasTaglinePremium: {
    fontSize: 13,
    color: "#c4b8dc",
    marginBottom: 6,
    fontWeight: "600" as const,
  },
  saasComingSoon: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    marginBottom: 18,
  },
  saasFeatureTextPremium: {
    flex: 1,
    fontSize: 14,
    color: "#ebe4f5",
    lineHeight: 21,
    fontWeight: "600" as const,
  },
  saasUpgradeBtn: {
    marginTop: 6,
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 2,
    borderColor: Colors.dark.gold + "cc",
  },
  saasUpgradeBtnGrad: {
    paddingVertical: 18,
    alignItems: "center" as const,
  },
  saasUpgradeBtnText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#1a1228",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
});
