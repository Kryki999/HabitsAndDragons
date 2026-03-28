import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Shirt, Sparkles } from "lucide-react-native";
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import { LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import { useGameStore } from "@/store/gameStore";
import { resolveLootItemById } from "@/lib/itemCatalog";
import LootDetailModal, { type LootModalPayload } from "@/components/LootDetailModal";
import RarityItemSlot from "@/components/RarityItemSlot";
import type { LootItemEntry } from "@/types/dungeonLoot";

export const BACKPACK_SLOT_COUNT = 20;
export const BACKPACK_COLUMNS = 4;
const ROWS = BACKPACK_SLOT_COUNT / BACKPACK_COLUMNS;
const SLOT_GAP = 10;

type Props = {
  /** When false, content is a plain column (for embedding in parent ScrollView). */
  scrollable?: boolean;
  /** Inner width for the grid (e.g. modal or card). Defaults to screen-based estimate. */
  contentWidth?: number;
  /** Full-screen modal: ScrollView grows with parent instead of a fixed max height. */
  fillAvailableHeight?: boolean;
};

export default function BackpackInventoryBody({
  scrollable = true,
  contentWidth: contentWidthProp,
  fillAvailableHeight = false,
}: Props) {
  const { width } = useWindowDimensions();
  const ownedItemIds = useGameStore((s) => s.ownedItemIds ?? []);
  const equippedOutfitId = useGameStore((s) => s.equippedOutfitId);
  const equippedRelicId = useGameStore((s) => s.equippedRelicId);

  const [detailPayload, setDetailPayload] = useState<LootModalPayload | null>(null);
  const [detailInventoryIndex, setDetailInventoryIndex] = useState<number | null>(null);
  const [scrollViewportH, setScrollViewportH] = useState(0);
  const [scrollContentH, setScrollContentH] = useState(0);

  const scrollEnabled =
    !fillAvailableHeight ||
    scrollViewportH < 8 ||
    scrollContentH > scrollViewportH + 2;

  const contentWidth = contentWidthProp ?? Math.min(width - 40, 400);
  const gridInnerW = contentWidth;
  const cellPx = useMemo(() => {
    const g = SLOT_GAP * (BACKPACK_COLUMNS - 1);
    return (gridInnerW - g) / BACKPACK_COLUMNS;
  }, [gridInnerW]);

  const slots = useMemo(() => {
    const shown = ownedItemIds.slice(0, BACKPACK_SLOT_COUNT);
    const cells: ({ kind: "empty" } | { kind: "item"; entry: LootItemEntry; inventoryIndex: number })[] = [];
    for (let i = 0; i < BACKPACK_SLOT_COUNT; i++) {
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
      out.push(slots.slice(r * BACKPACK_COLUMNS, (r + 1) * BACKPACK_COLUMNS));
    }
    return out;
  }, [slots]);

  const overflow = ownedItemIds.length > BACKPACK_SLOT_COUNT ? ownedItemIds.length - BACKPACK_SLOT_COUNT : 0;

  const openItem = useCallback((entry: LootItemEntry, inventoryIndex: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setDetailInventoryIndex(inventoryIndex);
    setDetailPayload({ type: "item", entry });
  }, []);

  const openEquipped = useCallback(
    (slot: "outfit" | "relic") => {
      const id = slot === "outfit" ? equippedOutfitId : equippedRelicId;
      if (!id) {
        notificationAsync(NotificationFeedbackType.Warning);
        return;
      }
      const entry = resolveLootItemById(id);
      if (!entry) return;
      const idx = ownedItemIds.indexOf(id);
      impactAsync(ImpactFeedbackStyle.Light);
      setDetailInventoryIndex(idx >= 0 ? idx : 0);
      setDetailPayload({ type: "item", entry });
    },
    [equippedOutfitId, equippedRelicId, ownedItemIds],
  );

  const closeDetailOnly = useCallback(() => {
    setDetailPayload(null);
    setDetailInventoryIndex(null);
  }, []);

  const inner = (
    <>
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
                return (
                  <View style={styles.loadoutIconWrap}>
                    <RarityItemSlot itemId={equippedOutfitId} size={72} />
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
                return (
                  <View style={styles.loadoutIconWrap}>
                    <RarityItemSlot itemId={equippedRelicId} size={72} />
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
                const flatIndex = ri * BACKPACK_COLUMNS + ci;
                const slotKey = `slot-${flatIndex}`;

                if (slot.kind === "empty") {
                  return (
                    <View key={slotKey} style={styles.slotCell}>
                      <View style={styles.slotEmptyInner} />
                    </View>
                  );
                }

                const { entry, inventoryIndex } = slot;
                const isEquipped =
                  entry.itemSlot === "outfit"
                    ? equippedOutfitId === entry.id
                    : equippedRelicId === entry.id;

                return (
                  <View key={slotKey} style={styles.slotCell}>
                    <Pressable
                      onPress={() => openItem(entry, inventoryIndex)}
                      style={({ pressed }) => [styles.slotPress, pressed && styles.slotPressPressed]}
                    >
                      <RarityItemSlot
                        itemId={entry.id}
                        size={cellPx}
                        cornerBadge={isEquipped ? "E" : undefined}
                      />
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
          +{overflow} more in your stash (first {BACKPACK_SLOT_COUNT} shown)
        </Text>
      ) : null}
    </>
  );

  const onScrollViewLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (fillAvailableHeight) setScrollViewportH(e.nativeEvent.layout.height);
    },
    [fillAvailableHeight],
  );

  const onScrollContentSizeChange = useCallback(
    (_w: number, h: number) => {
      if (fillAvailableHeight) setScrollContentH(h);
    },
    [fillAvailableHeight],
  );

  const scrollBlock = scrollable ? (
    <ScrollView
      style={fillAvailableHeight ? styles.scrollFill : styles.scroll}
      contentContainerStyle={[styles.scrollContent, fillAvailableHeight && styles.scrollContentFill]}
      showsVerticalScrollIndicator={scrollEnabled}
      scrollEnabled={scrollEnabled}
      bounces={scrollEnabled}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={scrollEnabled}
      onLayout={fillAvailableHeight ? onScrollViewLayout : undefined}
      onContentSizeChange={fillAvailableHeight ? onScrollContentSizeChange : undefined}
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={styles.embeddedBlock}>{inner}</View>
  );

  return (
    <View style={fillAvailableHeight && scrollable ? styles.outerFill : undefined}>
      {scrollBlock}
      <LootDetailModal
        visible={detailPayload !== null}
        onClose={closeDetailOnly}
        payload={detailPayload}
        accentHint={
          detailPayload?.type === "item" ? LOOT_RARITY_COLOR[detailPayload.entry.rarity] : undefined
        }
        itemInventoryIndex={detailInventoryIndex ?? undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerFill: {
    flex: 1,
  },
  scroll: {
    maxHeight: 520,
  },
  /** Must not be merged with `scroll` — RN keeps `maxHeight` from the first style. */
  scrollFill: {
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
  },
  scrollContent: {
    paddingBottom: 10,
  },
  scrollContentFill: {
    flexGrow: 1,
  },
  embeddedBlock: {
    paddingBottom: 4,
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
  slotPress: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  slotPressPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
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
