import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Flame, Scroll, Star, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { StatType } from "@/types/game";

const EPIC_QUESTS = [
  { text: "Take a 3-minute Cold Shower", emoji: "🧊", stat: "strength" as StatType },
  { text: "Write 500 words of creative fiction", emoji: "✍️", stat: "intelligence" as StatType },
  { text: "Do 50 jumping jacks right now", emoji: "🦘", stat: "agility" as StatType },
  { text: "Meditate in silence for 5 minutes", emoji: "🧘", stat: "intelligence" as StatType },
  { text: "Sprint for 30 seconds at full speed", emoji: "⚡", stat: "agility" as StatType },
  { text: "Hold a plank for 90 seconds", emoji: "💪", stat: "strength" as StatType },
  { text: "Read 20 pages of a book in one sitting", emoji: "📖", stat: "intelligence" as StatType },
  { text: "Do 30 burpees without stopping", emoji: "🔥", stat: "strength" as StatType },
];

const SAGE_QUOTES = [
  { text: "The dragon you must slay is not outside the cave — it is the habit you refuse to face.", author: "The Elder Sage" },
  { text: "A warrior's true battle is fought each morning, in the silence before the world wakes.", author: "Master Kael" },
  { text: "Consistency is the spell that turns peasants into kings.", author: "Archmage Thorn" },
  { text: "The path to power is paved with small, daily victories.", author: "Oracle Seraphine" },
  { text: "Even the mightiest oak was once a seed that refused to quit.", author: "Druid Eldara" },
];

const CHAT_MESSAGES = [
  { sender: "sage", text: "Welcome back, brave adventurer. The stars have whispered of your journey..." },
  { sender: "sage", text: "Complete the Epic Quest below to earn great rewards. The Sage watches and rewards the bold." },
  { sender: "sage", text: "Remember: every habit completed is a spell cast against the chaos of mediocrity." },
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
  const { addGold, addXP, gold } = useGameStore();
  const [questCompleted, setQuestCompleted] = useState(false);
  const [currentQuest] = useState(() => EPIC_QUESTS[Math.floor(Math.random() * EPIC_QUESTS.length)]);
  const [currentQuote] = useState(() => SAGE_QUOTES[Math.floor(Math.random() * SAGE_QUOTES.length)]);

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
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(questPulseAnim, { toValue: 1.02, duration: 1800, useNativeDriver: true }),
        Animated.timing(questPulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleCompleteQuest = useCallback(() => {
    if (questCompleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setQuestCompleted(true);
    addGold(50);
    addXP(currentQuest.stat, 20);

    Animated.spring(rewardAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();

    const statLabel = currentQuest.stat.charAt(0).toUpperCase() + currentQuest.stat.slice(1);
    Alert.alert(
      "⚡ Epic Quest Complete!",
      `+50 Gold 🪙\n+20 ${statLabel} XP\n\nThe Sage is pleased with your resolve.`
    );
  }, [questCompleted, addGold, addXP, currentQuest.stat]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.sage]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.mysticalOrb1, { opacity: sparkleAnim }]} />
      <Animated.View style={[styles.mysticalOrb2, { opacity: sparkleAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0.3, 0.8] }) }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <View style={styles.sageEmblem}>
            <LinearGradient
              colors={[...Colors.gradients.purple]}
              style={styles.sageEmblemGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>The Sage</Text>
          <Text style={styles.subtitle}>Tavern of Wisdom</Text>
        </Animated.View>

        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <MessageCircle size={14} color={Colors.dark.purple} />
            <Text style={styles.chatHeaderText}>SAGE'S COUNSEL</Text>
          </View>
          {CHAT_MESSAGES.map((msg, i) => (
            <SageMessage key={i} message={msg} delay={300 + i * 200} />
          ))}
        </View>

        <Animated.View
          style={[
            styles.quoteCard,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.quoteAccent} />
          <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {currentQuote.author}</Text>
        </Animated.View>

        <View style={styles.questSection}>
          <View style={styles.questHeader}>
            <Star size={14} color={Colors.dark.gold} />
            <Text style={styles.questHeaderText}>EPIC DAILY QUEST</Text>
          </View>

          <Animated.View style={[styles.questCard, { transform: [{ scale: questCompleted ? 1 : questPulseAnim }] }]}>
            <LinearGradient
              colors={questCompleted ? ['#1a2a1a', '#1a2a1a'] : ['#2a1f3d', '#362a50']}
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
                      <Text style={styles.questRewardText}>+50 Gold</Text>
                    </View>
                    <View style={styles.questRewardChip}>
                      <Flame size={11} color={Colors.dark.fire} />
                      <Text style={[styles.questRewardText, { color: Colors.dark.fire }]}>
                        +20 {currentQuest.stat.charAt(0).toUpperCase() + currentQuest.stat.slice(1)} XP
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
                  <Text style={styles.completedText}>⚡ QUEST COMPLETE ⚡</Text>
                </Animated.View>
              )}
            </LinearGradient>
          </Animated.View>

          <Pressable
            onPress={handleCompleteQuest}
            disabled={questCompleted}
            testID="complete-epic-quest"
          >
            <View style={[styles.completeBtn, questCompleted && styles.completeBtnDone]}>
              {questCompleted ? (
                <View style={styles.completeBtnInner}>
                  <Text style={[styles.completeBtnText, { color: Colors.dark.emerald }]}>
                    ✓ Rewards Claimed
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
                    <Text style={styles.completeBtnText}>Complete Epic Quest</Text>
                  </LinearGradient>
                  <View style={styles.completeBtnBottom} />
                </>
              )}
            </View>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  mysticalOrb1: {
    position: "absolute" as const,
    top: 60,
    right: 30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.purple + "10",
  },
  mysticalOrb2: {
    position: "absolute" as const,
    bottom: 200,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.cyan + "0a",
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 24,
  },
  sageEmblem: {
    marginBottom: 12,
    borderRadius: 22,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  sageEmblemGradient: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  chatSection: {
    marginBottom: 20,
  },
  chatHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  chatHeaderText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
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
    marginLeft: 8,
  },
  chatBubbleAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.dark.purple + "80",
  },
  chatBubbleText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 21,
    paddingLeft: 6,
  },
  quoteCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  quoteAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.dark.gold,
  },
  quoteText: {
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 24,
    fontStyle: "italic" as const,
    paddingLeft: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 10,
    textAlign: "right" as const,
  },
  questSection: {
    gap: 12,
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
});
