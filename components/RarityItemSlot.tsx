import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { LOOT_ITEM_SLOT_BORDER_WIDTH, LOOT_RARITY_COLOR } from "@/constants/lootRarity";
import { resolveLootItemById } from "@/lib/itemCatalog";
import { LootGlyph } from "@/lib/lootGlyph";

interface RarityItemSlotProps {
  itemId: string | null;
  size: number;
  /** Krótki label gdy pusto, np. „—” */
  emptyLabel?: string;
  onPress?: () => void;
  /** Mały znaczek narożny (np. „E” w plecaku) */
  cornerBadge?: string;
}

/**
 * Globalna zasada UI: slot z przedmiotem = ramka w kolorze rzadkości.
 */
export default function RarityItemSlot({
  itemId,
  size,
  emptyLabel = "—",
  onPress,
  cornerBadge,
}: RarityItemSlotProps) {
  const entry = itemId ? resolveLootItemById(itemId) : null;

  if (!entry) {
    const inner = (
      <View style={[styles.empty, { width: size, height: size, borderRadius: size * 0.2 }]}>
        <Text style={styles.emptyText} numberOfLines={1}>
          {emptyLabel}
        </Text>
      </View>
    );
    if (onPress) {
      return (
        <Pressable onPress={onPress} style={styles.pressWrap}>
          {inner}
        </Pressable>
      );
    }
    return inner;
  }

  const rc = LOOT_RARITY_COLOR[entry.rarity];
  const glyph = Math.max(16, Math.round(size * 0.42));

  const body = (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size * 0.2,
          borderColor: rc + "ee",
          borderWidth: LOOT_ITEM_SLOT_BORDER_WIDTH,
        },
      ]}
    >
      <LinearGradient
        colors={[rc + "35", Colors.dark.background + "f0"]}
        style={[styles.gradient, { borderRadius: size * 0.16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <LootGlyph icon={entry.icon} size={glyph} color={rc} />
      </LinearGradient>
      {cornerBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cornerBadge}</Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressWrap}>
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  pressWrap: {},
  outer: {
    overflow: "hidden",
    backgroundColor: Colors.dark.background,
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 2,
  },
  empty: {
    backgroundColor: "#07060c",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.dark.textMuted,
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.dark.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a1228",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1a1228",
  },
});
