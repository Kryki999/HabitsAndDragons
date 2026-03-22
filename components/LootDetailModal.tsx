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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { LootGlyph } from "@/lib/lootGlyph";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import { sellPriceForRarity } from "@/lib/inventoryEconomy";
import { useGameStore } from "@/store/gameStore";
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

const RARITY_COLOR = LOOT_RARITY_COLOR;

interface LootDetailModalProps {
  visible: boolean;
  onClose: () => void;
  payload: LootModalPayload | null;
  accentHint?: string;
  /** Ustawione tylko z plecaka — wtedy Sell / Equip / Unequip. */
  itemInventoryIndex?: number;
}

export default function LootDetailModal({
  visible,
  onClose,
  payload,
  accentHint,
  itemInventoryIndex,
}: LootDetailModalProps) {
  const { width } = useWindowDimensions();
  const modalWidth = Math.min(width - 48, 360);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  const sellInventoryItemAtIndex = useGameStore((s) => s.sellInventoryItemAtIndex);
  const equipItemById = useGameStore((s) => s.equipItemById);
  const unequipLoadoutSlot = useGameStore((s) => s.unequipLoadoutSlot);
  const equippedOutfitId = useGameStore((s) => s.equippedOutfitId);
  const equippedRelicId = useGameStore((s) => s.equippedRelicId);

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

  const backpackMode =
    payload.type === "item" && typeof itemInventoryIndex === "number" && itemInventoryIndex >= 0;
  const itemEntry = payload.type === "item" ? payload.entry : null;
  const isEquipped =
    itemEntry != null &&
    (itemEntry.itemSlot === "outfit"
      ? equippedOutfitId === itemEntry.id
      : equippedRelicId === itemEntry.id);
  const sellPrice = itemEntry ? sellPriceForRarity(itemEntry.rarity) : 0;

  const handleSell = () => {
    if (!backpackMode || !itemEntry) return;
    Alert.alert(
      "Sprzedaż",
      `Czy na pewno chcesz sprzedać ten przedmiot za ${sellPrice} 🪙?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Sprzedaj",
          style: "destructive",
          onPress: () => {
            sellInventoryItemAtIndex(itemInventoryIndex);
            onClose();
          },
        },
      ],
    );
  };

  const handleEquip = () => {
    if (!itemEntry) return;
    equipItemById(itemEntry.id);
    onClose();
  };

  const handleUnequip = () => {
    if (!itemEntry) return;
    unequipLoadoutSlot(itemEntry.itemSlot);
    onClose();
  };

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
              <View style={styles.itemMetaRow}>
                <Text style={styles.cosmeticTag}>Cosmetic — no combat stats</Text>
                <View
                  style={[
                    styles.slotPill,
                    {
                      borderColor: rColor + "55",
                      backgroundColor: rColor + "12",
                    },
                  ]}
                >
                  <Text style={[styles.slotPillText, { color: rColor }]}>
                    {payload.entry.itemSlot === "outfit" ? "Outfit" : "Relic"}
                  </Text>
                </View>
              </View>
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

            {backpackMode && itemEntry ? (
              <View style={styles.backpackActions}>
                <Pressable onPress={handleSell} style={styles.sellBtn}>
                  <Text style={styles.sellBtnText}>
                    Sell ({sellPrice} 🪙)
                  </Text>
                </Pressable>
                {isEquipped ? (
                  <Pressable onPress={handleUnequip} style={styles.unequipBtn}>
                    <Text style={styles.unequipBtnText}>Unequip</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={handleEquip} style={styles.equipBtn}>
                    <LinearGradient
                      colors={[Colors.dark.emerald + "cc", Colors.dark.emeraldDark]}
                      style={styles.equipBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.equipBtnText}>Equip</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            ) : null}

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
  itemMetaRow: {
    alignItems: "center" as const,
    marginBottom: 12,
    gap: 8,
  },
  cosmeticTag: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
  },
  slotPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  slotPillText: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  backpackActions: {
    alignSelf: "stretch" as const,
    gap: 10,
    marginBottom: 12,
  },
  sellBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.dark.ruby + "18",
    borderWidth: 1,
    borderColor: Colors.dark.ruby + "55",
    alignItems: "center" as const,
  },
  sellBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.ruby,
  },
  equipBtn: {
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  equipBtnGradient: {
    paddingVertical: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  equipBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#0d1a12",
  },
  unequipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center" as const,
  },
  unequipBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.textSecondary,
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
