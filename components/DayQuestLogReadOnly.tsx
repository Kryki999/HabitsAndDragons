import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import type { Habit } from "@/types/game";

function todayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

function shortDateLabel(dateKey: string): string {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

type Props = {
  dateKey: string;
  /** When false, omit outer title (parent already has a heading). */
  showTitle?: boolean;
};

/**
 * Read-only quest list for a calendar day — same filtering idea as Planning / Timeline
 * (scheduled date vs today default), plus completion check from `completedHabitNamesByDate`.
 */
export default function DayQuestLogReadOnly({ dateKey, showTitle = true }: Props) {
  const habits = useGameStore((s) => s.habits);
  const completedHabitNamesByDate = useGameStore((s) => s.completedHabitNamesByDate ?? {});
  const dailyReflectionByDate = useGameStore((s) => s.dailyReflectionByDate ?? {});

  const tKey = todayKey();
  const activeHabits = useMemo(() => habits.filter((h) => h.isActive), [habits]);

  const { rows, orphanCompletions } = useMemo(() => {
    const due = activeHabits.filter((h) => (h.scheduledDate ?? tKey) === dateKey);
    const completedNames = new Set(completedHabitNamesByDate[dateKey] ?? []);
    const dueNames = new Set(due.map((h) => h.name));
    const orphans = [...completedNames].filter((n) => !dueNames.has(n));
    return { rows: due, orphanCompletions: orphans };
  }, [activeHabits, completedHabitNamesByDate, dateKey, tKey]);

  const empty = rows.length === 0 && orphanCompletions.length === 0;
  const reflection = (dailyReflectionByDate[dateKey] ?? "").trim();

  return (
    <View style={styles.wrap}>
      {showTitle ? (
        <Text style={styles.title}>
          Quest log — <Text style={styles.titleAccent}>{shortDateLabel(dateKey)}</Text>
        </Text>
      ) : null}

      {empty ? (
        <Text style={styles.muted}>No quests recorded for this day.</Text>
      ) : (
        <View style={styles.list}>
          {rows.map((habit) => (
            <TaskRowReadOnly
              key={habit.id}
              habit={habit}
              historicalCompleted={!!completedHabitNamesByDate[dateKey]?.includes(habit.name)}
            />
          ))}
          {orphanCompletions.map((name) => (
            <View key={`orphan_${name}`} style={[styles.row, styles.rowOrphan]}>
              <View style={styles.rowLeft}>
                <Text style={styles.orphanIcon}>◇</Text>
                <View style={styles.rowInfo}>
                  <Text style={styles.taskName} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={styles.taskMeta}>Completed (no longer on roster)</Text>
                </View>
              </View>
              <View style={styles.iconBtnReadonly}>
                <Check size={16} color={Colors.dark.gold} />
              </View>
            </View>
          ))}
        </View>
      )}
      {reflection.length > 0 ? (
        <View style={styles.reflectionCard}>
          <Text style={styles.reflectionKicker}>Daily Reflection</Text>
          <Text style={styles.reflectionText}>{reflection}</Text>
        </View>
      ) : null}
    </View>
  );
}

function TaskRowReadOnly({
  habit,
  historicalCompleted,
}: {
  habit: Habit;
  historicalCompleted: boolean;
}) {
  const scheduledLabel = habit.scheduledDate
    ? new Date(habit.scheduledDate + "T12:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Today";

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.taskEmoji}>{habit.icon}</Text>
        <View style={styles.rowInfo}>
          <Text
            style={[styles.taskName, historicalCompleted && styles.taskNameCompleted]}
            numberOfLines={2}
          >
            {habit.name}
          </Text>
          <Text style={styles.taskMeta}>
            {habit.taskType === "daily" ? "Habit" : "Side quest"} · {scheduledLabel}
          </Text>
        </View>
      </View>
      <View style={styles.iconBtnReadonly}>
        {historicalCompleted ? (
          <Check size={16} color={Colors.dark.gold} />
        ) : (
          <Check size={16} color={Colors.dark.textMuted} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  titleAccent: {
    color: Colors.dark.gold,
    fontWeight: "800" as const,
  },
  muted: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontStyle: "italic" as const,
    lineHeight: 19,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  rowOrphan: {
    opacity: 0.9,
    borderColor: Colors.dark.border + "66",
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  taskEmoji: {
    fontSize: 22,
  },
  orphanIcon: {
    fontSize: 18,
    color: Colors.dark.textMuted,
    width: 28,
    textAlign: "center" as const,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  taskNameCompleted: {
    textDecorationLine: "line-through" as const,
    color: Colors.dark.textMuted,
  },
  taskMeta: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontWeight: "600" as const,
  },
  iconBtnReadonly: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "aa",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    opacity: 0.9,
  },
  reflectionCard: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
    backgroundColor: Colors.dark.gold + "12",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  reflectionKicker: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  reflectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.dark.textSecondary,
    fontStyle: "italic" as const,
  },
});
