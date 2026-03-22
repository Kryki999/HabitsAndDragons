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
import { X, Backpack } from "lucide-react-native";
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

  const [detailPayload, setDetailPayload] = useState<LootModalPayload | null>(null);

  const modalMaxW = Math.min(width - 32, 400);

  const slots = useMemo(() => {
    const shown = ownedItemIds.slice(0, SLOT_COUNT);
    const cells: ({ kind: "empty" } | { kind: "item"; entry: LootItemEntry })[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const id = shown[i];
      if (!id) {
        cells.push({ kind: "empty" });
        continue;
      }
      const entry = resolveLootItemById(id);
      if (entry) {
        cells.push({ kind: "item", entry });
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
    onClose();
  }, [onClose]);

  const openItem = useCallback((entry: LootItemEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailPayload({ type: "item", entry });
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

                          const { entry } = slot;
                          const rc = RARITY_COLOR[entry.rarity];
                          return (
                            <View key={entry.id + flatIndex} style={styles.slotCell}>
                              <Pressable
                                onPress={() => openItem(entry)}
                                style={({ pressed }) => [
                                  styles.slotFilledOuter,
                                  {
                                    borderColor: rc + "99",
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
        onClose={() => setDetailPayload(null)}
        payload={detailPayload}
        accentHint={detailPayload?.type === "item" ? RARITY_COLOR[detailPayload.entry.rarity] : undefined}
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
    maxHeight: "90%" as const,
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
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: 10,
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
  /** Równy podział: zawsze 4 sloty w linii — bez „3+1”. */
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
    borderWidth: 1.5,
    overflow: "hidden" as const,
  },
  slotFilledGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
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
