import React, { useEffect, useRef, useCallback, useState } from "react";
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
import { MapPin, Send, Crown, Skull, Shield, Flame } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";

interface FriendData {
  id: string;
  name: string;
  level: number;
  streak: number;
  streakLost: boolean;
  castleEmoji: string;
  className: string;
  classColor: string;
}

const MOCK_FRIENDS: FriendData[] = [
  {
    id: "arthur",
    name: "Arthur",
    level: 5,
    streak: 12,
    streakLost: false,
    castleEmoji: "🏰",
    className: "Warrior",
    classColor: Colors.dark.ruby,
  },
  {
    id: "lancelot",
    name: "Lancelot",
    level: 2,
    streak: 0,
    streakLost: true,
    castleEmoji: "🏚️",
    className: "Hunter",
    classColor: Colors.dark.emerald,
  },
];

function PlayerKingdomCard({ delay }: { delay: number }) {
  const { gold, streak, getPlayerLevel, playerClass } = useGameStore();
  const playerLevel = getPlayerLevel();
  const entryAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(entryAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const classLabel = playerClass ? playerClass.charAt(0).toUpperCase() + playerClass.slice(1) : 'Adventurer';

  return (
    <Animated.View
      style={[
        styles.kingdomCard,
        {
          opacity: entryAnim,
          transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}
    >
      <Animated.View style={[styles.kingdomGlow, { opacity: glowAnim }]} />
      <View style={styles.kingdomInner}>
        <View style={styles.kingdomHeader}>
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>YOU</Text>
          </View>
          <View style={[styles.classBadge, { backgroundColor: Colors.dark.gold + '15', borderColor: Colors.dark.gold + '30' }]}>
            <Text style={[styles.classBadgeText, { color: Colors.dark.gold }]}>{classLabel}</Text>
          </View>
        </View>

        <View style={styles.kingdomRow}>
          <View style={styles.kingdomCastleArea}>
            <Text style={styles.kingdomCastleEmoji}>🏰</Text>
          </View>
          <View style={styles.kingdomInfo}>
            <Text style={styles.kingdomName}>Your Kingdom</Text>
            <View style={styles.kingdomStats}>
              <View style={styles.kingdomStatChip}>
                <Crown size={12} color={Colors.dark.gold} />
                <Text style={styles.kingdomStatValue}>Lvl {playerLevel}</Text>
              </View>
              <View style={styles.kingdomStatChip}>
                <Text style={styles.kingdomStatEmoji}>🔥</Text>
                <Text style={[styles.kingdomStatValue, { color: Colors.dark.fire }]}>{streak}</Text>
              </View>
              <View style={styles.kingdomStatChip}>
                <Text style={styles.kingdomStatEmoji}>🪙</Text>
                <Text style={[styles.kingdomStatValue, { color: Colors.dark.gold }]}>{gold}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      <View style={[styles.kingdomBottom, { backgroundColor: Colors.dark.gold + '40' }]} />
    </Animated.View>
  );
}

function FriendCard({
  friend,
  delay,
}: {
  friend: FriendData;
  delay: number;
}) {
  const entryAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const [signalSent, setSignalSent] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(entryAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSendSignal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSignalSent(true);
    Alert.alert("📨 Smoke Signal Sent!", `You sent a smoke signal to ${friend.name}!`);
    setTimeout(() => setSignalSent(false), 3000);
  }, [friend.name]);

  const handlePressIn = useCallback(() => {
    Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: entryAnim,
        transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      }}
    >
      <Animated.View
        style={[
          styles.friendCard,
          {
            transform: [{ translateY: pressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }],
          },
        ]}
      >
        <View style={[styles.friendInner, friend.streakLost && { borderColor: Colors.dark.ruby + '30' }]}>
          <View style={styles.friendRow}>
            <View style={styles.friendCastleArea}>
              <Text style={styles.friendCastleEmoji}>{friend.castleEmoji}</Text>
              {friend.streakLost && (
                <View style={styles.skullBadge}>
                  <Skull size={10} color={Colors.dark.ruby} />
                </View>
              )}
            </View>
            <View style={styles.friendInfo}>
              <View style={styles.friendNameRow}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <View style={[styles.friendClassBadge, { backgroundColor: friend.classColor + '15' }]}>
                  <Text style={[styles.friendClassText, { color: friend.classColor }]}>{friend.className}</Text>
                </View>
              </View>
              <View style={styles.friendStats}>
                <Text style={styles.friendStatText}>
                  <Text style={{ color: Colors.dark.gold }}>Lvl {friend.level}</Text>
                </Text>
                {friend.streakLost ? (
                  <Text style={[styles.friendStatText, { color: Colors.dark.ruby }]}>
                    💀 Streak Lost
                  </Text>
                ) : (
                  <Text style={styles.friendStatText}>
                    🔥 <Text style={{ color: Colors.dark.fire }}>{friend.streak}</Text>
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleSendSignal}
              style={[
                styles.signalButton,
                signalSent && { backgroundColor: Colors.dark.emerald + '20', borderColor: Colors.dark.emerald + '40' },
              ]}
              testID={`send-signal-${friend.id}`}
            >
              <Send size={14} color={signalSent ? Colors.dark.emerald : Colors.dark.gold} />
              <Text style={[styles.signalText, signalSent && { color: Colors.dark.emerald }]}>
                {signalSent ? 'Sent!' : 'Signal'}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.friendBottom, { backgroundColor: friend.streakLost ? Colors.dark.ruby + '30' : Colors.dark.border }]} />
      </Animated.View>
    </Animated.View>
  );
}

export default function MapScreen() {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 0.5, duration: 3000, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0.2, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.gradients.map]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.glowOrb1, { opacity: orbAnim }]} />
      <Animated.View style={[styles.glowOrb2, { opacity: orbAnim }]} />

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
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.mapEmblem}>
            <LinearGradient
              colors={[...Colors.gradients.emerald]}
              style={styles.mapEmblemGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MapPin size={26} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Realm Map</Text>
          <Text style={styles.subtitle}>Kingdoms of your allies</Text>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Shield size={14} color={Colors.dark.gold} />
          <Text style={styles.sectionTitle}>YOUR KINGDOM</Text>
        </View>
        <PlayerKingdomCard delay={200} />

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Flame size={14} color={Colors.dark.fire} />
          <Text style={styles.sectionTitle}>ALLIES & RIVALS</Text>
        </View>
        {MOCK_FRIENDS.map((friend, index) => (
          <FriendCard
            key={friend.id}
            friend={friend}
            delay={400 + index * 150}
          />
        ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>More adventurers will appear as your realm grows...</Text>
        </View>
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
  glowOrb1: {
    position: "absolute" as const,
    top: 60,
    left: "15%",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.dark.emerald + "08",
  },
  glowOrb2: {
    position: "absolute" as const,
    bottom: 200,
    right: "10%",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.gold + "06",
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 28,
  },
  mapEmblem: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.emerald,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  mapEmblemGradient: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
  },
  kingdomCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
    position: "relative" as const,
    marginBottom: 4,
  },
  kingdomGlow: {
    position: "absolute" as const,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    backgroundColor: Colors.dark.gold + "08",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "15",
  },
  kingdomInner: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: Colors.dark.gold + "30",
  },
  kingdomHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  youBadge: {
    backgroundColor: Colors.dark.gold + "20",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: Colors.dark.gold,
    letterSpacing: 1.5,
  },
  classBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  kingdomRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  kingdomCastleArea: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.dark.background,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "25",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  kingdomCastleEmoji: {
    fontSize: 30,
  },
  kingdomInfo: {
    flex: 1,
    marginLeft: 14,
  },
  kingdomName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  kingdomStats: {
    flexDirection: "row" as const,
    gap: 12,
  },
  kingdomStatChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  kingdomStatEmoji: {
    fontSize: 12,
  },
  kingdomStatValue: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  kingdomBottom: {
    height: 5,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  friendCard: {
    borderRadius: 14,
    overflow: "hidden" as const,
    marginBottom: 12,
  },
  friendInner: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.border,
  },
  friendRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  friendCastleArea: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  friendCastleEmoji: {
    fontSize: 24,
  },
  skullBadge: {
    position: "absolute" as const,
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.ruby + "40",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  friendClassBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  friendClassText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  friendStats: {
    flexDirection: "row" as const,
    gap: 14,
  },
  friendStatText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  signalButton: {
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "30",
    backgroundColor: Colors.dark.gold + "08",
    gap: 2,
  },
  signalText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    letterSpacing: 0.3,
  },
  friendBottom: {
    height: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  footerNote: {
    alignItems: "center" as const,
    marginTop: 24,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
  },
});
