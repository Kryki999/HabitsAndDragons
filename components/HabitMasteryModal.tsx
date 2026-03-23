import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Star, Trophy, Archive, Pencil } from "lucide-react-native";
import Colors from "@/constants/colors";
import type { Habit } from "@/types/game";

type Props = {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onArchive: (id: string) => void;
  onEdit: (id: string) => void;
};

function hasDate(habit: Habit, date: string): boolean {
  return (habit.completionDates ?? []).includes(date);
}

export default function HabitMasteryModal({ visible, habit, onClose, onArchive, onEdit }: Props) {
  if (!habit) return null;
  const today = new Date();
  const days: string[] = [];
  for (let i = 41; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={styles.sheet}>
          <LinearGradient colors={["#201633", "#130f20"]} style={styles.sheetInner}>
            <Text style={styles.title}>Mistrzostwo Nawyku</Text>
            <Text style={styles.habitName}>{habit.icon} {habit.name}</Text>

            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Flame size={16} color={Colors.dark.fire} />
                <Text style={styles.statLabel}>Aktualna Seria</Text>
                <Text style={styles.statValue}>{habit.currentStreak ?? 0}</Text>
              </View>
              <View style={styles.statBox}>
                <Star size={16} color={Colors.dark.gold} />
                <Text style={styles.statLabel}>Najlepsza Seria</Text>
                <Text style={styles.statValue}>{habit.longestStreak ?? 0}</Text>
              </View>
              <View style={styles.statBox}>
                <Trophy size={16} color={Colors.dark.purple} />
                <Text style={styles.statLabel}>Ukończono Razem</Text>
                <Text style={styles.statValue}>{habit.totalCompletions ?? 0}</Text>
              </View>
            </View>

            <Text style={styles.heatmapTitle}>Historia wykonania</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.heatmap}>
                {days.map((d) => (
                  <View key={d} style={[styles.dot, hasDate(habit, d) ? styles.dotOn : styles.dotOff]} />
                ))}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable onPress={() => onEdit(habit.id)} style={styles.actionBtn}>
                <Pencil size={14} color={Colors.dark.text} />
                <Text style={styles.actionText}>Edytuj Quest</Text>
              </Pressable>
              <Pressable onPress={() => onArchive(habit.id)} style={[styles.actionBtn, styles.archiveBtn]}>
                <Archive size={14} color="#ffd7db" />
                <Text style={[styles.actionText, { color: "#ffd7db" }]}>Zakończ i Archiwizuj</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.75)" },
  sheet: { padding: 12 },
  sheetInner: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: Colors.dark.border },
  title: { fontSize: 17, fontWeight: "800", color: Colors.dark.text },
  habitName: { marginTop: 4, fontSize: 14, color: Colors.dark.textSecondary },
  statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statBox: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 10, padding: 8 },
  statLabel: { marginTop: 4, fontSize: 10, color: Colors.dark.textMuted, textAlign: "center" },
  statValue: { marginTop: 2, fontSize: 16, fontWeight: "900", color: Colors.dark.text },
  heatmapTitle: { marginTop: 12, marginBottom: 8, fontSize: 12, fontWeight: "700", color: Colors.dark.textSecondary },
  heatmap: { flexDirection: "row", flexWrap: "wrap", width: 7 * 14, gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 2 },
  dotOn: { backgroundColor: Colors.dark.emerald },
  dotOff: { backgroundColor: Colors.dark.surfaceLight },
  actions: { marginTop: 14, gap: 8 },
  actionBtn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.dark.surface },
  archiveBtn: { backgroundColor: "#3b1b24" },
  actionText: { fontSize: 13, fontWeight: "800", color: Colors.dark.text },
});

