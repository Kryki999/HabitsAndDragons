import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { LootGlyph } from "@/lib/lootGlyph";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { LootGoldEntry, LootIconId, LootItemEntry, LootRarity } from "@/types/dungeonLoot";

export type LootModalPayload =
  | { type: "item"; entry: LootItemEntry }
  | { type: "gold"; entry: LootGoldEntry };

const RARITY_LABEL: Record<LootRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const RARITY_COLOR: Record<LootRarity, string> = {
  common: "#9ca3af",
  uncommon: "#3dd68c",
  rare: "#45d4e8",
  epic: "#9b6dff",
  legendary: "#ffc845",
};

interface LootDetailModalProps {
  visible: boolean;
  onClose: () => void;
  payload: LootModalPayload | null;
  accentHint?: string;
}

export default function LootDetailModal({ visible, onClose, payload, accentHint }: LootDetailModalProps) {
  const { width } = useWindowDimensions();
  const modalWidth = Math.min(width - 48, 360);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      scale.setValue(0.94);
    }
  }, [visible, fade, scale]);

  if (!visible || !payload) {
    return null;
  }

  const rarity = payload.entry.rarity;
  const rColor = RARITY_COLOR[rarity];
  const icon: LootIconId = payload.type === "item" ? payload.entry.icon : "coins";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdropPress} onPress={onClose}>
          <Animated.View style={[styles.backdropTint, { opacity: fade }]} />
        </Pressable>

        <View style={styles.centerWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheetOuter,
              { width: modalWidth, opacity: fade, transform: [{ scale }] },
            ]}
          >
          <LinearGradient
            colors={["#2a1f42", "#1a1228", "#120c1c"]}
            style={styles.sheetGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={[rColor + "55", "transparent"]}
              style={styles.sheetGlowTop}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={12}
              accessibilityLabel="Close"
            >
              <X size={20} color={Colors.dark.textMuted} />
            </Pressable>

            <View style={[styles.iconHalo, { borderColor: rColor + "66", shadowColor: rColor }]}>
              <LinearGradient
                colors={[rColor + "35", Colors.dark.surface + "cc"]}
                style={styles.iconHaloInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LootGlyph icon={icon} size={40} color={payload.type === "gold" ? Colors.dark.gold : accentHint ?? rColor} />
              </LinearGradient>
            </View>

            <View style={[styles.rarityPill, { borderColor: rColor + "88", backgroundColor: rColor + "18" }]}>
              <Text style={[styles.rarityText, { color: rColor }]}>{RARITY_LABEL[rarity]}</Text>
            </View>

            <Text style={styles.title}>{payload.entry.name}</Text>

            {payload.type === "item" ? (
              <Text style={styles.cosmeticTag}>Cosmetic — no combat stats</Text>
            ) : (
              <Text style={styles.cosmeticTag}>Gold pool — currency, not gear</Text>
            )}

            <Text style={styles.body}>
              {payload.entry.description}
            </Text>

            {payload.type === "gold" && (
              <View style={styles.goldRollCard}>
                <LinearGradient
                  colors={[Colors.dark.gold + "25", Colors.dark.gold + "08"]}
                  style={styles.goldRollInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <LootGlyph icon="coins" size={22} color={Colors.dark.gold} />
                  <View style={styles.goldRollTextCol}>
                    <Text style={styles.goldRollLabel}>Possible gold drop</Text>
                    <Text style={styles.goldRollRange}>
                      {payload.entry.goldMin} – {payload.entry.goldMax}{" "}
                      <Text style={styles.goldEmoji}>🪙</Text>
                    </Text>
                    <Text style={styles.goldRollHint}>Rolled when this gold pool drops from a dungeon clear.</Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            <Pressable onPress={onClose} style={styles.dismissBtn}>
              <Text style={styles.dismissText}>Close</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 24,
  },
  sheetOuter: {
    borderRadius: 22,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "55",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  sheetGradient: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: "center" as const,
  },
  sheetGlowTop: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface + "99",
  },
  iconHalo: {
    marginTop: 8,
    marginBottom: 14,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...Platform.select({
      ios: { shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
      default: {},
    }),
  },
  iconHaloInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rarityPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  cosmeticTag: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    marginBottom: 14,
  },
  goldRollCard: {
    alignSelf: "stretch" as const,
    marginBottom: 8,
    borderRadius: 14,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "35",
  },
  goldRollInner: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    padding: 14,
  },
  goldRollTextCol: {
    flex: 1,
  },
  goldRollLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  goldRollRange: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  goldEmoji: {
    fontSize: 16,
  },
  goldRollHint: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  dismissBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
  },
});
