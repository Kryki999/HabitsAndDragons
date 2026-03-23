import React, { useMemo } from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Trophy, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import { TITLE_DEFINITIONS } from "@/constants/titles";
import type { StatType } from "@/types/game";

type Props = {
  visible: boolean;
  onClose: () => void;
  unlockedTitleIds: string[];
  completedStrengthQuests: number;
  completedAgilityQuests: number;
  completedIntelligenceQuests: number;
};

export default function AchievementsModal({
  visible,
  onClose,
  unlockedTitleIds,
  completedStrengthQuests,
  completedAgilityQuests,
  completedIntelligenceQuests,
}: Props) {
  const unlockedSet = useMemo(() => new Set(unlockedTitleIds), [unlockedTitleIds]);
  const byStat: Record<StatType, number> = {
    strength: completedStrengthQuests,
    agility: completedAgilityQuests,
    intelligence: completedIntelligenceQuests,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>

        <View style={styles.sheet}>
          <LinearGradient colors={["#2a1f42", "#1a1228", "#120c1c"]} style={styles.sheetGrad}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Trophy size={20} color={Colors.dark.gold} />
                <Text style={styles.title}>Gablota z Trofeami</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.sub}>Odblokowane tytuły i wyzwania na Twojej drodze.</Text>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {TITLE_DEFINITIONS.map((t) => {
                const unlocked = unlockedSet.has(t.id);
                const questReq = t.requiredCompletedQuests ?? null;
                const progress = questReq ? Math.min(byStat[t.stat], questReq) : null;
                return (
                  <View key={t.id} style={[styles.row, unlocked ? styles.rowUnlocked : styles.rowLocked]}>
                    <View style={styles.rowIcon}>
                      {unlocked ? (
                        <Trophy size={16} color={Colors.dark.gold} />
                      ) : (
                        <Lock size={16} color={Colors.dark.textMuted} />
                      )}
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, unlocked && styles.rowTitleUnlocked]}>{t.name}</Text>
                      <Text style={styles.rowDesc}>{t.description}</Text>
                      {questReq ? (
                        <Text style={styles.progress}>
                          Postęp: {progress}/{questReq}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
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
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  sheet: {
    width: "90%",
    maxWidth: 420,
    maxHeight: "86%",
  },
  sheetGrad: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "66",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 19,
    color: Colors.dark.text,
    fontWeight: "800",
  },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    color: Colors.dark.textMuted,
    fontSize: 12,
  },
  closeBtn: {
    borderRadius: 10,
    padding: 6,
    backgroundColor: Colors.dark.surface + "88",
  },
  scroll: {
    maxHeight: 480,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  rowUnlocked: {
    backgroundColor: "#2a2038",
    borderColor: Colors.dark.gold + "55",
  },
  rowLocked: {
    backgroundColor: Colors.dark.surface + "99",
    borderColor: Colors.dark.border,
    opacity: 0.75,
  },
  rowIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.dark.textSecondary,
  },
  rowTitleUnlocked: {
    color: Colors.dark.gold,
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  progress: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
});

