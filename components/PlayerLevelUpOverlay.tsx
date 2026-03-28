import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import { getCastleTier } from "@/constants/kingdomTiers";

type Props = {
  visible: boolean;
  level: number;
  onDismiss: () => void;
};

export default function PlayerLevelUpOverlay({ visible, level, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const titleScale = useRef(new Animated.Value(0.6)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  const tier = getCastleTier(level);

  useEffect(() => {
    if (!visible) {
      titleScale.setValue(0.6);
      titleOpacity.setValue(0);
      burst.setValue(0);
      return;
    }
    titleScale.setValue(0.6);
    titleOpacity.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.spring(titleScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(burst, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, titleScale, titleOpacity, burst]);

  const haloScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] });
  const haloOpacity = burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  const handleContinue = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.root}>
        <LinearGradient
          colors={["#080510", "#1a0f08", "#0c0618"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={["#f4ca7344", "transparent", "#6b21a822"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.15 }}
          end={{ x: 0.5, y: 0.85 }}
        />

        <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
          <Animated.Text
            style={[
              styles.levelUpTitle,
              {
                opacity: titleOpacity,
                transform: [{ scale: titleScale }],
              },
            ]}
          >
            LEVEL UP!
          </Animated.Text>

          <View style={styles.heroBlock}>
            <Animated.View
              style={[
                styles.radialHalo,
                {
                  opacity: haloOpacity,
                  transform: [{ scale: haloScale }],
                },
              ]}
            />
            <View style={styles.avatarPlate}>
              <Text style={styles.avatarEmoji}>🏰</Text>
            </View>
            <Text style={styles.avatarCaption}>Your stronghold stirs</Text>
          </View>

          <Text style={styles.levelLine}>You reached Level {level}</Text>

          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsTitle}>Realm standing</Text>
            <Text style={styles.rewardLine}>
              {tier.emoji} {tier.name}
            </Text>
            <Text style={styles.rewardSub}>{tier.desc}</Text>
            <View style={styles.rewardDivider} />
            <Text style={styles.rewardLineSmall}>+1 Chronicle rank · broader quest horizons</Text>
            <Text style={styles.rewardLineSmall}>STR · AGI · INT paths grow sharper</Text>
          </View>

          <View style={styles.ctaWrap}>
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [styles.ctaOuter, pressed && styles.ctaPressed]}
            >
              <LinearGradient
                colors={["#e8d4a8", "#c9952e", "#7a5208"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                <Text style={styles.ctaText}>[ Continue ]</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center" as const,
  },
  levelUpTitle: {
    fontSize: Platform.OS === "web" ? 42 : 38,
    fontWeight: "900" as const,
    color: Colors.dark.gold,
    letterSpacing: 3,
    textAlign: "center" as const,
    textShadowColor: "#2a1500cc",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
    marginBottom: 8,
  },
  heroBlock: {
    marginTop: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 200,
    width: "100%" as const,
  },
  radialHalo: {
    position: "absolute" as const,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.dark.gold,
  },
  avatarPlate: {
    width: 132,
    height: 132,
    borderRadius: 28,
    backgroundColor: Colors.dark.surface + "ee",
    borderWidth: 3,
    borderColor: Colors.dark.gold + "aa",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  avatarEmoji: {
    fontSize: 64,
  },
  avatarCaption: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 0.4,
  },
  levelLine: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: "900" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
    textShadowColor: "#00000066",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  rewardsCard: {
    marginTop: 22,
    width: "100%" as const,
    maxWidth: 340,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface + "aa",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "33",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  rewardsTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.6,
    color: Colors.dark.purple,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  rewardLine: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  rewardSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.dark.textSecondary,
  },
  rewardDivider: {
    height: 1,
    backgroundColor: Colors.dark.border + "88",
    marginVertical: 14,
  },
  rewardLineSmall: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textMuted,
    marginTop: 6,
  },
  ctaWrap: {
    marginTop: "auto" as const,
    width: "100%" as const,
    maxWidth: 360,
    paddingTop: 20,
  },
  ctaOuter: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 16,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaGrad: {
    paddingVertical: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#fff6d055",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900" as const,
    color: "#1a0f08",
    letterSpacing: 0.5,
  },
});
