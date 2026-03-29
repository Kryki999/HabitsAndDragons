import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  GestureResponderEvent,
} from "react-native";
import { Tabs } from "expo-router";
import { Home, Trophy, Castle, Sparkles, Coins, Mail, Settings as SettingsIcon, User } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/providers/AuthProvider";
import CircularProgress from "@/components/CircularProgress";
import MailboxModal from "@/components/MailboxModal";
import SettingsModal from "@/components/SettingsModal";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import CelebrationOverlayHost from "@/components/CelebrationOverlayHost";

type TabIconProps = {
  color: string;
  focused: boolean;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
};

function TabIcon({ color, focused, icon: Icon, label }: TabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const glowAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.85,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: focused ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.tabIconContainer}>
      <Animated.View
        style={[
          styles.tabGlow,
          {
            opacity: glowAnim,
            backgroundColor: color + "15",
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: "center" as const,
        }}
      >
        <Icon size={22} color={color} />
        <Text
          style={[
            styles.tabLabel,
            { color, fontWeight: focused ? ("700" as const) : ("500" as const) },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

function TabsWithTopBar() {
  const insets = useSafeAreaInsets();
  const gold = useGameStore((s) => s.gold);
  const streak = useGameStore((s) => s.streak);
  const heroDisplayName = useGameStore((s) => s.heroDisplayName);
  const getPlayerLevel = useGameStore((s) => s.getPlayerLevel);
  const getCurrentLevelXP = useGameStore((s) => s.getCurrentLevelXP);
  const getXPForNextLevel = useGameStore((s) => s.getXPForNextLevel);
  const { user, playerId, signOut } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const playerLevel = getPlayerLevel();
  const currentLevelXP = getCurrentLevelXP();
  const xpForNext = getXPForNextLevel();
  const xpProgress = xpForNext > 0 ? currentLevelXP / xpForNext : 0;

  const hudPlayerName = (heroDisplayName?.trim() || user?.email?.split("@")[0]?.trim() || "Wayfarer").slice(0, 48);

  return (
    <View style={styles.shell}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.topBarRow}>
          <Pressable
            style={({ pressed }) => [styles.hudLeft, pressed && styles.hudLeftPressed]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setProfileOpen(true);
            }}
          >
            <CircularProgress
              progress={xpProgress}
              size={40}
              strokeWidth={3}
              color={Colors.dark.gold}
              backgroundColor={Colors.dark.border}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>🧙‍♂️</Text>
              </View>
            </CircularProgress>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                {hudPlayerName}
              </Text>
              <Text style={styles.playerLevelText}>Lv.{playerLevel}</Text>
            </View>
          </Pressable>

          <View style={styles.hudStatsCluster}>
            <View style={styles.hudStatItem}>
              <Coins color={Colors.dark.gold} size={15} strokeWidth={2.2} />
              <Text style={styles.hudStatValueGold}>{gold}</Text>
            </View>
            <View style={styles.hudStatItem}>
              <Text style={styles.hudStatEmoji}>🔥</Text>
              <Text style={styles.hudStatValueFire}>{streak}</Text>
            </View>
          </View>

          <View style={styles.hudRight}>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setMailboxOpen(true);
              }}
            >
              <Mail color={Colors.dark.text} size={20} />
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setSettingsOpen(true);
              }}
            >
              <SettingsIcon color={Colors.dark.text} size={20} />
            </Pressable>
          </View>
        </View>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: Colors.dark.background,
            borderBottomWidth: 0,
            ...Platform.select({
              ios: {
                shadowColor: "transparent",
              },
              android: {
                elevation: 0,
              },
              default: {},
            }),
          },
          headerTitleStyle: {
            color: Colors.dark.text,
            fontWeight: "800" as const,
            fontSize: 18,
          },
          headerShadowVisible: false,
          tabBarActiveTintColor: Colors.dark.tabActive,
          tabBarInactiveTintColor: Colors.dark.tabInactive,
          tabBarStyle: {
            backgroundColor: Colors.dark.tabBar,
            borderTopWidth: 1,
            borderTopColor: Colors.dark.tabBarBorder,
            height: Platform.OS === "ios" ? 88 : 68,
            paddingTop: 6,
            paddingBottom: Platform.OS === "ios" ? 28 : 8,
          },
          tabBarShowLabel: false,
          tabBarButton: ({ style, children, onPress, ...rest }) => (
            <Pressable
              onPress={(e) => {
                impactAsync(ImpactFeedbackStyle.Light);
                if (onPress) {
                  (onPress as (e: GestureResponderEvent) => void)(e);
                }
              }}
              style={[style as any, { flex: 1 }]}
            >
              {children}
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Castle",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={Home} color={color} focused={focused} label="Castle" />
            ),
          }}
        />
        <Tabs.Screen
          name="dragon-lair"
          options={{
            title: "D&D",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={Trophy} color={color} focused={focused} label="D&D" />
            ),
          }}
        />
        <Tabs.Screen
          name="hero"
          options={{
            title: "Hero",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={User} color={color} focused={focused} label="Hero" />
            ),
          }}
        />
        <Tabs.Screen
          name="kingdom"
          options={{
            title: "Kingdom",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={Castle} color={color} focused={focused} label="Kingdom" />
            ),
          }}
        />
        <Tabs.Screen
          name="sage"
          options={{
            title: "Mędrzec",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={Sparkles} color={color} focused={focused} label="Mędrzec" />
            ),
          }}
        />
      </Tabs>

      <MailboxModal visible={mailboxOpen} onClose={() => setMailboxOpen(false)} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PlayerProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        email={user?.email ?? null}
        playerId={playerId}
        level={playerLevel}
        onSignOut={signOut}
      />

      <CelebrationOverlayHost />
    </View>
  );
}

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <TabsWithTopBar />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  topBar: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 0,
    backgroundColor: Colors.dark.background,
  },
  topBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  tabIconContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 60,
    height: 48,
  },
  hudLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  hudLeftPressed: {
    opacity: 0.9,
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 18,
  },
  playerInfo: {
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "800" as const,
    marginBottom: 0,
    maxWidth: "100%",
  },
  playerLevelText: {
    color: Colors.dark.gold,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  hudRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.ruby,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceLight,
  },
  hudStatsCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    flexShrink: 0,
    paddingHorizontal: 4,
  },
  hudStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hudStatEmoji: {
    fontSize: 13,
  },
  hudStatValueGold: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    fontVariant: ["tabular-nums"] as ("tabular-nums")[],
  },
  hudStatValueFire: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.fire,
    fontVariant: ["tabular-nums"] as ("tabular-nums")[],
  },
  tabGlow: {
    position: "absolute" as const,
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.5,
  },
});
