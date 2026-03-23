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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, ScrollText } from "lucide-react-native";
import Colors from "@/constants/colors";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useGameStore } from "@/store/gameStore";

type Props = {
  visible: boolean;
  onClose: () => void;
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
  completedHabitNamesByDate: Record<string, string[]>;
};

/** Modal w stylu plecaka — historia aktywności (heatmapa). */
export default function ActivityChroniclesModal({
  visible,
  onClose,
  activityByDate,
  completedHabitNamesByDate,
}: Props) {
  const { width } = useWindowDimensions();
  const modalMaxW = Math.min(width - 32, 400);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string>("general");
  const allHabits = useGameStore((s) => s.habits);
  const habits = useMemo(
    () => allHabits.filter((h) => h.isActive && h.taskType === "daily"),
    [allHabits],
  );
  const removeHabit = useGameStore((s) => s.removeHabit);
  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId) ?? null,
    [habits, selectedHabitId],
  );
  const selectedActivityByDate = useMemo(() => {
    if (!selectedHabit) return activityByDate;
    const out: Record<string, { completions: number; xpFromHabits: number }> = {};
    for (const date of selectedHabit.completionDates ?? []) {
      out[date] = { completions: 1, xpFromHabits: 0 };
    }
    return out;
  }, [selectedHabit, activityByDate]);
  const selectedTasks = useMemo(
    () => {
      if (!selectedDate) return [];
      if (!selectedHabit) return completedHabitNamesByDate[selectedDate] ?? [];
      return (selectedHabit.completionDates ?? []).includes(selectedDate) ? [selectedHabit.name] : [];
    },
    [completedHabitNamesByDate, selectedDate, selectedHabit],
  );

  const handleClose = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <View style={styles.backdrop} />
        </Pressable>

        <View style={[styles.sheet, { width: modalMaxW }]}>
          <LinearGradient
            colors={["#2a1f42", "#1a1228", "#120c1c"]}
            style={styles.sheetGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <ScrollText size={22} color={Colors.dark.emerald} />
                <Text style={styles.title}>Chronicles</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                <X size={22} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Track your journey and habit mastery.</Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.selectorWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.selectorRow}>
                    <Pressable
                      onPress={() => setSelectedHabitId("general")}
                      style={[styles.selectorChip, selectedHabitId === "general" && styles.selectorChipActive]}
                    >
                      <Text style={[styles.selectorChipText, selectedHabitId === "general" && styles.selectorChipTextActive]}>
                        General History
                      </Text>
                    </Pressable>
                    {habits.map((h) => (
                      <Pressable
                        key={h.id}
                        onPress={() => setSelectedHabitId(h.id)}
                        style={[styles.selectorChip, selectedHabitId === h.id && styles.selectorChipActive]}
                      >
                        <Text style={[styles.selectorChipText, selectedHabitId === h.id && styles.selectorChipTextActive]}>
                          {h.icon} {h.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedHabit ? (
                <View style={styles.habitStatsCard}>
                  <Text style={styles.habitStatsTitle}>Habit Mastery</Text>
                  <View style={styles.habitStatsRow}>
                    <Text style={styles.habitStat}>Current Streak: {selectedHabit.currentStreak ?? 0}</Text>
                    <Text style={styles.habitStat}>Best Streak: {selectedHabit.longestStreak ?? 0}</Text>
                    <Text style={styles.habitStat}>Total: {selectedHabit.totalCompletions ?? 0}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.heatmapWrap}>
                <ActivityHeatmap
                  activityByDate={selectedActivityByDate}
                  embedded
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </View>

              <View style={styles.dayDetailsCard}>
                <Text style={styles.dayDetailsTitle}>
                  {selectedDate ? `Day log: ${selectedDate}` : "Tap a heatmap cell to inspect that day"}
                </Text>
                {selectedDate ? (
                  selectedTasks.length > 0 ? (
                    selectedTasks.map((taskName, idx) => (
                      <Text key={`${selectedDate}_${idx}_${taskName}`} style={styles.taskRow}>
                        • {taskName}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.emptyTasks}>No tasks recorded for this date.</Text>
                  )
                ) : (
                  <Text style={styles.emptyTasks}>Choose a day from the heatmap.</Text>
                )}
              </View>

              {selectedHabit ? (
                <View style={styles.manageRow}>
                  <Pressable onPress={() => Alert.alert("Coming soon", "Habit edit panel will be added here.")} style={styles.manageBtn}>
                    <Text style={styles.manageBtnText}>Edit Habit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      removeHabit(selectedHabit.id);
                      setSelectedHabitId("general");
                    }}
                    style={[styles.manageBtn, styles.archiveBtn]}
                  >
                    <Text style={[styles.manageBtnText, styles.archiveBtnText]}>Archive Habit</Text>
                  </Pressable>
                </View>
              ) : null}
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
    fontWeight: "800",
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
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  heatmapWrap: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: Colors.dark.background + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "28",
  },
  selectorWrap: {
    marginBottom: 10,
  },
  selectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  selectorChip: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.dark.surface,
  },
  selectorChipActive: {
    borderColor: Colors.dark.gold + "66",
    backgroundColor: Colors.dark.gold + "12",
  },
  selectorChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textMuted,
  },
  selectorChipTextActive: {
    color: Colors.dark.gold,
  },
  habitStatsCard: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface + "aa",
    padding: 10,
  },
  habitStatsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 6,
  },
  habitStatsRow: {
    gap: 4,
  },
  habitStat: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  dayDetailsCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface + "cc",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    gap: 6,
  },
  dayDetailsTitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: "700",
  },
  taskRow: {
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 19,
  },
  emptyTasks: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontStyle: "italic",
  },
  manageRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  manageBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    paddingVertical: 10,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  archiveBtn: {
    backgroundColor: "#3b1b24",
    borderColor: "#6d3040",
  },
  archiveBtnText: {
    color: "#ffd7db",
  },
});
