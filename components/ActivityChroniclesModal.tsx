import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronDown, ChevronUp } from "lucide-react-native";
import Colors from "@/constants/colors";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import DayQuestLogReadOnly from "@/components/DayQuestLogReadOnly";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import { useGameStore } from "@/store/gameStore";
import type { Habit } from "@/types/game";

type Props = {
  visible: boolean;
  onClose: () => void;
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
  completedHabitNamesByDate: Record<string, string[]>;
};

function formatChronicleDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function habitActivityMap(habit: Habit): Record<string, { completions: number; xpFromHabits: number }> {
  const out: Record<string, { completions: number; xpFromHabits: number }> = {};
  for (const date of habit.completionDates ?? []) {
    out[date] = { completions: 1, xpFromHabits: 0 };
  }
  return out;
}

export default function ActivityChroniclesModal({
  visible,
  onClose,
  activityByDate,
  completedHabitNamesByDate,
}: Props) {
  const insets = useSafeAreaInsets();
  const allHabits = useGameStore((s) => s.habits);
  const removeHabit = useGameStore((s) => s.removeHabit);

  const pickableHabits = useMemo(
    () => allHabits.filter((h) => h.isActive && h.taskType === "daily"),
    [allHabits],
  );

  const [generalSelectedDate, setGeneralSelectedDate] = useState<string | null>(null);
  const [habitTrailId, setHabitTrailId] = useState<string | null>(null);
  const [habitSelectedDate, setHabitSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setGeneralSelectedDate(null);
    setHabitSelectedDate(null);
    setPickerOpen(false);
  }, [visible]);

  const trailHabit = useMemo(
    () => (habitTrailId ? pickableHabits.find((h) => h.id === habitTrailId) ?? null : null),
    [pickableHabits, habitTrailId],
  );

  const habitHeatmapData = useMemo(() => {
    if (!trailHabit) return {};
    return habitActivityMap(trailHabit);
  }, [trailHabit]);

  const handleClose = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const pickerLabel = trailHabit ? `${trailHabit.icon} ${trailHabit.name}` : "Choose a habit…";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.shell}>
        <LinearGradient
          colors={["#1a0f2e", "#120a1c", "#080510"]}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={[styles.topPad, { paddingTop: Math.max(insets.top, 10) }]}>
          <View style={styles.headerBar}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              hitSlop={12}
              accessibilityLabel="Close chronicles"
            >
              <X size={24} color={Colors.dark.text} />
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.heroTitle}>Chronicles</Text>

            <Text style={styles.sectionLabel}>General history</Text>
            <View style={styles.card}>
              <ActivityHeatmap
                activityByDate={activityByDate}
                embedded
                title="All activity"
                selectedDate={generalSelectedDate}
                onSelectDate={setGeneralSelectedDate}
              />
            </View>

            <View style={styles.dayCard}>
              <Text style={styles.dayCardTitle}>
                {generalSelectedDate ? formatChronicleDate(generalSelectedDate) : "Wybierz dzień"}
              </Text>
              {generalSelectedDate ? (
                <DayQuestLogReadOnly dateKey={generalSelectedDate} showTitle={false} />
              ) : (
                <Text style={styles.muted}>Select a day on the heatmap.</Text>
              )}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Individual habit heatmaps</Text>

            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setPickerOpen((v) => !v);
              }}
              style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.dropdownTriggerPressed]}
            >
              <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                {pickerLabel}
              </Text>
              {pickerOpen ? (
                <ChevronUp size={20} color={Colors.dark.gold} />
              ) : (
                <ChevronDown size={20} color={Colors.dark.gold} />
              )}
            </Pressable>

            {pickerOpen ? (
              <View style={styles.dropdownList}>
                {pickableHabits.length === 0 ? (
                  <Text style={styles.muted}>No daily habits to inspect yet.</Text>
                ) : (
                  pickableHabits.map((h) => (
                    <Pressable
                      key={h.id}
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        setHabitTrailId(h.id);
                        setHabitSelectedDate(null);
                        setPickerOpen(false);
                      }}
                      style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                    >
                      <Text style={styles.dropdownItemText}>
                        {h.icon} {h.name}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            {trailHabit ? (
              <>
                <View style={styles.card}>
                  <ActivityHeatmap
                    activityByDate={habitHeatmapData}
                    embedded
                    title="This habit only"
                    selectedDate={habitSelectedDate}
                    onSelectDate={setHabitSelectedDate}
                  />
                </View>

                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>Habit progress</Text>
                  <Text style={styles.statsLine}>Current streak: {trailHabit.currentStreak ?? 0}</Text>
                  <Text style={styles.statsLine}>Best streak: {trailHabit.longestStreak ?? 0}</Text>
                  <Text style={styles.statsLine}>Total completions: {trailHabit.totalCompletions ?? 0}</Text>
                </View>

                <View style={styles.manageRow}>
                  <Pressable
                    onPress={() => Alert.alert("Coming soon", "Habit editing will arrive in a later update.")}
                    style={styles.manageBtn}
                  >
                    <Text style={styles.manageBtnText}>Edit habit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      removeHabit(trailHabit.id);
                      setHabitTrailId(null);
                      setHabitSelectedDate(null);
                    }}
                    style={[styles.manageBtn, styles.archiveBtn]}
                  >
                    <Text style={[styles.manageBtnText, styles.archiveBtnText]}>Archive habit</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={{ height: 4 }} />
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  topPad: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface + "ee",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  headerIconBtnPressed: {
    opacity: 0.88,
  },
  headerSpacer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  heroSub: {
    marginTop: 0,
    marginBottom: 0,
    height: 0,
    opacity: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
    color: Colors.dark.emerald,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  sectionHint: {
    marginBottom: 0,
    height: 0,
    opacity: 0,
  },
  card: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: Colors.dark.background + "ee",
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "33",
    marginBottom: 12,
    overflow: "hidden" as const,
  },
  dayCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: Colors.dark.surface + "cc",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    marginBottom: 20,
    gap: 6,
  },
  dayCardTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  taskLine: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  muted: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
  },
  placeholderMuted: {
    marginTop: 0,
    marginBottom: 0,
    height: 0,
    opacity: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border + "55",
    marginVertical: 18,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
    marginBottom: 10,
    gap: 10,
  },
  dropdownTriggerPressed: {
    opacity: 0.9,
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  dropdownList: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    backgroundColor: Colors.dark.background + "dd",
    marginBottom: 14,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "44",
  },
  dropdownItemPressed: {
    backgroundColor: Colors.dark.gold + "10",
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "600" as const,
  },
  statsCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: Colors.dark.surface + "aa",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
    gap: 6,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    marginBottom: 4,
  },
  statsLine: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  manageRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  manageBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    paddingVertical: 12,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: "800" as const,
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
