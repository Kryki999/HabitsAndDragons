import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Backpack, Shirt, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import { resolveLootItemById } from "@/lib/itemCatalog";
import { LootGlyph } from "@/lib/lootGlyph";
import LootDetailModal, { type LootModalPayload } from "@/components/LootDetailModal";
import type { LootItemEntry, LootRarity } from "@/types/dungeonLoot";

const SLOT_COUNT = 20;
const COLUMNS = 4;
const ROWS = SLOT_COUNT / COLUMNS;
const SLOT_GAP = 10;

const RARITY_COLOR: Record<LootRarity, string> = {
  common: "#9ca3af",
  uncommon: "#3dd68c",
  rare: "#45d4e8",
  epic: "#9b6dff",
  legendary: "#ffc845",
};

interface BackpackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BackpackModal({ visible, onClose }: BackpackModalProps) {
  const { width } = useWindowDimensions();
  const ownedItemIds = useGameStore((s) => s.ownedItemIds ?? []);
  const equippedOutfitId = useGameStore((s) => s.equippedOutfitId);
  const equippedRelicId = useGameStore((s) => s.equippedRelicId);

  const [detailPayload, setDetailPayload] = useState<LootModalPayload | null>(null);
  const [detailInventoryIndex, setDetailInventoryIndex] = useState<number | null>(null);

  const modalMaxW = Math.min(width - 32, 400);

  const slots = useMemo(() => {
    const shown = ownedItemIds.slice(0, SLOT_COUNT);
    const cells: ({ kind: "empty" } | { kind: "item"; entry: LootItemEntry; inventoryIndex: number })[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const id = shown[i];
      if (!id) {
        cells.push({ kind: "empty" });
        continue;
      }
      const entry = resolveLootItemById(id);
      if (entry) {
        cells.push({ kind: "item", entry, inventoryIndex: i });
      } else {
        cells.push({ kind: "empty" });
      }
    }
    return cells;
  }, [ownedItemIds]);

  const rows = useMemo(() => {
    const out: (typeof slots)[] = [];
    for (let r = 0; r < ROWS; r++) {
      out.push(slots.slice(r * COLUMNS, (r + 1) * COLUMNS));
    }
    return out;
  }, [slots]);

  const overflow = ownedItemIds.length > SLOT_COUNT ? ownedItemIds.length - SLOT_COUNT : 0;

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailPayload(null);
    setDetailInventoryIndex(null);
    onClose();
  }, [onClose]);

  const openItem = useCallback((entry: LootItemEntry, inventoryIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailInventoryIndex(inventoryIndex);
    setDetailPayload({ type: "item", entry });
  }, []);

  const openEquipped = useCallback(
    (slot: "outfit" | "relic") => {
      const id = slot === "outfit" ? equippedOutfitId : equippedRelicId;
      if (!id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      const entry = resolveLootItemById(id);
      if (!entry) return;
      const idx = ownedItemIds.indexOf(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDetailInventoryIndex(idx >= 0 ? idx : 0);
      setDetailPayload({ type: "item", entry });
    },
    [equippedOutfitId, equippedRelicId, ownedItemIds],
  );

  const closeDetailOnly = useCallback(() => {
    setDetailPayload(null);
    setDetailInventoryIndex(null);
  }, []);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            <View style={styles.backdrop} />
          </Pressable>

          <View style={[styles.sheet, { width: modalMaxW }]}>
            <LinearGradient
              colors={["#2a1f42", "#1a1228", "#120c1c"]}
              style={styles.sheetGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerTitleRow}>
                  <Backpack size={22} color={Colors.dark.gold} />
                  <Text style={styles.title}>Backpack</Text>
                </View>
                <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                  <X size={22} color={Colors.dark.textMuted} />
                </Pressable>
              </View>
              <Text style={styles.subtitle}>Cosmetic trophies from your dungeon runs</Text>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.loadoutSection}>
                  <Text style={styles.loadoutSectionTitle}>Equipped</Text>
                  <View style={styles.loadoutRow}>
                    <Pressable
                      onPress={() => openEquipped("outfit")}
                      style={({ pressed }) => [styles.loadoutSlot, pressed && styles.loadoutSlotPressed]}
                    >
                      <View style={styles.loadoutSlotHeader}>
                        <Shirt size={16} color={Colors.dark.gold} />
                        <Text style={styles.loadoutSlotLabel}>Outfit</Text>
                      </View>
                      {equippedOutfitId ? (
                        (() => {
                          const e = resolveLootItemById(equippedOutfitId);
                          if (!e) {
                            return <Text style={styles.loadoutEmpty}>—</Text>;
                          }
                          const rc = RARITY_COLOR[e.rarity];
                          return (
                            <View style={styles.loadoutIconWrap}>
                              <LinearGradient
                                colors={[rc + "33", Colors.dark.background]}
                                style={styles.loadoutIconGradient}
                              >
                                <LootGlyph icon={e.icon} size={36} color={rc} />
                              </LinearGradient>
                              <Text style={styles.loadoutItemName} numberOfLines={2}>
                                {e.name}
                              </Text>
                            </View>
                          );
                        })()
                      ) : (
                        <Text style={styles.loadoutEmpty}>Empty slot</Text>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => openEquipped("relic")}
                      style={({ pressed }) => [styles.loadoutSlot, pressed && styles.loadoutSlotPressed]}
                    >
                      <View style={styles.loadoutSlotHeader}>
                        <Sparkles size={16} color={Colors.dark.purple} />
                        <Text style={styles.loadoutSlotLabel}>Relic</Text>
                      </View>
                      {equippedRelicId ? (
                        (() => {
                          const e = resolveLootItemById(equippedRelicId);
                          if (!e) {
                            return <Text style={styles.loadoutEmpty}>—</Text>;
                          }
                          const rc = RARITY_COLOR[e.rarity];
                          return (
                            <View style={styles.loadoutIconWrap}>
                              <LinearGradient
                                colors={[rc + "33", Colors.dark.background]}
                                style={styles.loadoutIconGradient}
                              >
                                <LootGlyph icon={e.icon} size={36} color={rc} />
                              </LinearGradient>
                              <Text style={styles.loadoutItemName} numberOfLines={2}>
                                {e.name}
                              </Text>
                            </View>
                          );
                        })()
                      ) : (
                        <Text style={styles.loadoutEmpty}>Empty slot</Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inventoryPanel}>
                  <Text style={styles.inventoryLabel}>Inventory</Text>
                  <View style={styles.gridFrame}>
                    {rows.map((row, ri) => (
                      <View
                        key={`row-${ri}`}
                        style={[styles.gridRow, ri < rows.length - 1 && { marginBottom: SLOT_GAP }]}
                      >
                        {row.map((slot, ci) => {
                          const flatIndex = ri * COLUMNS + ci;
                          const slotKey = `slot-${flatIndex}`;

                          if (slot.kind === "empty") {
                            return (
                              <View key={slotKey} style={styles.slotCell}>
                                <View style={styles.slotEmptyInner} />
                              </View>
                            );
                          }

                          const { entry, inventoryIndex } = slot;
                          const rc = RARITY_COLOR[entry.rarity];
                          const isEquipped =
                            entry.itemSlot === "outfit"
                              ? equippedOutfitId === entry.id
                              : equippedRelicId === entry.id;

                          return (
                            <View key={slotKey} style={styles.slotCell}>
                              <Pressable
                                onPress={() => openItem(entry, inventoryIndex)}
                                style={({ pressed }) => [
                                  styles.slotFilledOuter,
                                  {
                                    borderColor: isEquipped ? Colors.dark.gold : rc + "99",
                                    borderWidth: isEquipped ? 2.5 : 1.5,
                                    opacity: pressed ? 0.9 : 1,
                                    transform: pressed ? [{ scale: 0.97 }] : undefined,
                                  },
                                ]}
                              >
                                <LinearGradient
                                  colors={[rc + "28", Colors.dark.background + "ee"]}
                                  style={styles.slotFilledGradient}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                >
                                  <LootGlyph icon={entry.icon} size={26} color={rc} />
                                </LinearGradient>
                                {isEquipped ? (
                                  <View style={styles.equippedBadge}>
                                    <Text style={styles.equippedBadgeText}>E</Text>
                                  </View>
                                ) : null}
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>

                {overflow > 0 ? (
                  <Text style={styles.overflowHint}>
                    +{overflow} more in your stash (first {SLOT_COUNT} shown)
                  </Text>
                ) : null}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <LootDetailModal
        visible={detailPayload !== null}
        onClose={closeDetailOnly}
        payload={detailPayload}
        accentHint={detailPayload?.type === "item" ? RARITY_COLOR[detailPayload.entry.rarity] : undefined}
        itemInventoryIndex={detailInventoryIndex ?? undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  sheet: {
    maxHeight: "92%" as const,
  },
  sheetGradient: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "55",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 14,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface + "99",
  },
  scroll: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  loadoutSection: {
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.dark.background + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "28",
  },
  loadoutSectionTitle: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    marginBottom: 12,
    textAlign: "center" as const,
  },
  loadoutRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  loadoutSlot: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    padding: 10,
    backgroundColor: Colors.dark.surface + "cc",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    minHeight: 118,
  },
  loadoutSlotPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  loadoutSlotHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 8,
  },
  loadoutSlotLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  loadoutIconWrap: {
    alignItems: "center" as const,
    gap: 6,
  },
  loadoutIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  loadoutItemName: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
    lineHeight: 13,
  },
  loadoutEmpty: {
    fontSize: 12,
    fontStyle: "italic" as const,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    marginTop: 12,
  },
  inventoryPanel: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.dark.background + "ee",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  inventoryLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    marginBottom: 12,
    textAlign: "center" as const,
  },
  gridFrame: {
    width: "100%" as const,
  },
  gridRow: {
    flexDirection: "row" as const,
    width: "100%" as const,
    gap: SLOT_GAP,
  },
  slotCell: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
  },
  slotEmptyInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#07060c",
    borderWidth: 1,
    borderColor: Colors.dark.border + "99",
  },
  slotFilledOuter: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  slotFilledGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  equippedBadge: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.gold,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#1a1228",
  },
  equippedBadgeText: {
    fontSize: 11,
    fontWeight: "900" as const,
    color: "#1a1228",
  },
  overflowHint: {
    marginTop: 14,
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    lineHeight: 16,
  },
});
