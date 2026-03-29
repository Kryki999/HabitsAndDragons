import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import type { KingdomProfileSubject } from "@/lib/kingdomLeaderboard";
import type { PlayerClass } from "@/types/game";
import { getBaseBackgroundForLevel } from "@/constants/kingdomVisuals";

const CLASS_LABEL: Record<PlayerClass, string> = {
  warrior: "Warrior",
  hunter: "Hunter",
  mage: "Mage",
  paladin: "Paladin",
};

const CLASS_COLOR: Record<PlayerClass, string> = {
  warrior: Colors.dark.ruby,
  hunter: Colors.dark.emerald,
  mage: Colors.dark.cyan,
  paladin: Colors.dark.gold,
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "??";
}

function formatXP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

type Props = {
  visible: boolean;
  onClose: () => void;
  subject: KingdomProfileSubject | null;
};

export default function PlayerProfileModal({ visible, onClose, subject }: Props) {
  const { width, height } = useWindowDimensions();
  const maxW = Math.min(width - 24, 400);
  const maxH = Math.min(height * 0.88, 620);

  const open = visible && subject !== null;
  const s = subject;

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {s ? (
          <Pressable
            style={[styles.sheet, { maxWidth: maxW, maxHeight: maxH }]}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient
              colors={["#2a1f18", "#1a1410", "#0e0c0a"]}
              style={styles.sheetGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <View style={styles.sheetBorderOuter}>
                <View style={styles.sheetBorderInner}>
                  <View style={styles.header}>
                    <Text style={styles.wantedLabel}>Realm record</Text>
                    <Pressable
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        onClose();
                      }}
                      style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                    >
                      <X size={22} color={Colors.dark.textMuted} strokeWidth={2.4} />
                    </Pressable>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollBody}
                    bounces={false}
                  >
                    <View style={[styles.avatarRing, { borderColor: CLASS_COLOR[s.playerClass] + "aa" }]}>
                      <LinearGradient
                        colors={["#1c1624", "#120e18"]}
                        style={styles.avatarInner}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.avatarInitials}>{initialsFromName(s.name)}</Text>
                      </LinearGradient>
                    </View>

                    <Text style={styles.name} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <Text style={[styles.classLine, { color: CLASS_COLOR[s.playerClass] }]}>
                      {CLASS_LABEL[s.playerClass]}
                    </Text>

                    <View style={styles.statRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Level</Text>
                        <Text style={styles.statValue}>{s.level}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Streak</Text>
                        <Text style={[styles.statValue, { color: Colors.dark.fire }]}>{s.streak}</Text>
                      </View>
                    </View>

                    <Text style={styles.sectionLabel}>Fortress</Text>
                    <View style={styles.castlePreview}>
                      <Image
                        source={getBaseBackgroundForLevel(s.level)}
                        style={styles.castleImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.85)"]}
                        style={styles.castleVeil}
                      />
                      <Text style={styles.castleCaption}>By tier of stronghold</Text>
                    </View>

                    <View style={styles.xpPanel}>
                      <Text style={styles.xpLabel}>Total experience</Text>
                      <Text style={styles.xpValue}>{formatXP(s.totalXP)} XP</Text>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  sheet: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#5c4a32",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  sheetGradient: {
    padding: 3,
  },
  sheetBorderOuter: {
    borderWidth: 2,
    borderColor: "#8b7355",
    borderRadius: 12,
    overflow: "hidden",
  },
  sheetBorderInner: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    backgroundColor: "#141018",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(92,74,50,0.45)",
  },
  wantedLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.dark.gold,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface + "cc",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  scrollBody: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 16,
    alignItems: "center",
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    padding: 3,
    marginBottom: 12,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 4,
  },
  classLine: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
    width: "100%",
    justifyContent: "center",
  },
  statBox: {
    flex: 1,
    maxWidth: 140,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.dark.gold,
  },
  sectionLabel: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  castlePreview: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2a2438",
    backgroundColor: "#08060c",
  },
  castleImage: {
    width: "100%",
    height: "100%",
  },
  castleVeil: {
    ...StyleSheet.absoluteFillObject,
  },
  castleCaption: {
    position: "absolute",
    bottom: 8,
    left: 10,
    right: 10,
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  xpPanel: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(20,16,28,0.92)",
    borderWidth: 1,
    borderColor: Colors.dark.purple + "44",
    alignItems: "center",
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.dark.cyan,
  },
});
