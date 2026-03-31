import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Colors from "@/constants/colors";

// ─── Constants ───────────────────────────────────────────────────────────────
const CELL_SIZE = 22; // visual px per square
const CELL_GAP = 3; // gap between squares (both axes)
const DOW_LABEL_W = 14; // width of Mon/Wed/Fri labels column
const DOW_LABEL_GAP = 5; // gap between day-label col and grid
const MONTH_ROW_H = 18; // height of month-labels row above grid

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// Show label only for Mon(0), Wed(2), Fri(4); others are empty strings
const DOW_LABELS = ["M", "", "W", "", "F", "", "S"] as const;

const LEVEL_BG: readonly string[] = [
  "#12101a", // 0 – none
  "#1a3d28", // 1 – low
  "#248f5a", // 2 – medium
  "#3dd68c", // 3 – high
  "#ffc845", // 4 – max
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDayKey(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function dayIntensity(
  day: { completions: number; xpFromHabits: number } | undefined
): number {
  if (!day) return 0;
  const score = day.completions * 3 + Math.floor(day.xpFromHabits / 22);
  if (score <= 0) return 0;
  if (score <= 3) return 1;
  if (score <= 8) return 2;
  if (score <= 16) return 3;
  return 4;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DayCell = { key: string; level: number } | null; // null = future / padding
type WeekColumn = DayCell[]; // always 7 items, index 0 = Monday

type Props = {
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
  embedded?: boolean;
  title?: string;
  selectedDate?: string | null;
  onSelectDate?: (dateKey: string) => void;
  /** Kept for back-compat; internally converted to weeks. Default 112 days ≈ 16 weeks. */
  numDays?: number;
  autoScrollToLatest?: boolean;
};

const DEFAULT_NUM_DAYS = 91; // ~13 weeks ≈ 3 months

// ─── Component ────────────────────────────────────────────────────────────────
export default function ActivityHeatmap({
  activityByDate,
  embedded,
  title = "Activity",
  selectedDate,
  onSelectDate,
  numDays = DEFAULT_NUM_DAYS,
  autoScrollToLatest = true,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const numWeeks = Math.max(5, Math.ceil(numDays / 7));

  const { weeks, monthMap } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Offset to most-recent Monday (Sun→6, Mon→0, …)
    const dow = today.getDay();
    const daysFromMon = dow === 0 ? 6 : dow - 1;

    const thisMon = new Date(today);
    thisMon.setDate(today.getDate() - daysFromMon);

    // First Monday to render (oldest week)
    const startMon = new Date(thisMon);
    startMon.setDate(thisMon.getDate() - (numWeeks - 1) * 7);

    const weeksData: WeekColumn[] = [];
    const monthLabelMap: Record<number, string> = {}; // weekIndex → short month name
    let lastSeenMonth = -1;

    for (let w = 0; w < numWeeks; w++) {
      const weekStart = new Date(startMon);
      weekStart.setDate(startMon.getDate() + w * 7);

      const col: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);

        if (day > today) {
          col.push(null); // future – render transparent placeholder
        } else {
          const key = formatDayKey(day);
          col.push({ key, level: dayIntensity(activityByDate[key]) });
        }
      }

      // Month label fires on the first week where that month appears
      const m = weekStart.getMonth();
      if (m !== lastSeenMonth) {
        monthLabelMap[w] = MONTHS[m]!;
        lastSeenMonth = m;
      }

      weeksData.push(col);
    }

    return { weeks: weeksData, monthMap: monthLabelMap };
  }, [activityByDate, numWeeks]);

  useEffect(() => {
    if (!autoScrollToLatest) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [autoScrollToLatest, numWeeks]);

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Last {numWeeks} weeks</Text>
      </View>

      {/* ── Scrollable heatmap ── */}
      <View style={styles.heatmapViewport}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.heatmapScrollContent}
          onContentSizeChange={() => {
            if (autoScrollToLatest) {
              scrollRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          <View>
          {/* Month labels row — each cell has same width as a column so they align */}
          <View style={styles.monthRow}>
            {/* spacer matching the day-label column */}
            <View style={{ width: DOW_LABEL_W + DOW_LABEL_GAP }} />

            {weeks.map((_, wi) => (
              <View
                key={wi}
                style={{
                  width: CELL_SIZE,
                  marginRight: wi < weeks.length - 1 ? CELL_GAP : 0,
                  alignItems: "flex-start",
                }}
              >
                {monthMap[wi] !== undefined && (
                  <Text style={styles.monthLabel}>{monthMap[wi]}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Grid: day-of-week labels + week columns */}
          <View style={styles.gridRow}>
            {/* Day-of-week label column (Mon, Wed, Fri) */}
            <View style={[styles.dowCol, { width: DOW_LABEL_W, marginRight: DOW_LABEL_GAP }]}>
              {DOW_LABELS.map((lbl, i) => (
                <View
                  key={i}
                  style={{
                    height: CELL_SIZE,
                    marginBottom: i < 6 ? CELL_GAP : 0,
                    justifyContent: "center",
                    alignItems: "flex-end",
                  }}
                >
                  <Text style={styles.dowLabel}>{lbl}</Text>
                </View>
              ))}
            </View>

            {/* Week columns */}
            {weeks.map((col, wi) => (
              <View
                key={wi}
                style={[styles.weekCol, { marginRight: wi < weeks.length - 1 ? CELL_GAP : 0 }]}
              >
                {col.map((cell, di) => {
                  const isLast = di === 6;

                  if (cell === null) {
                    // Transparent placeholder for future / out-of-range days
                    return (
                      <View
                        key={`ph-${wi}-${di}`}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          marginBottom: isLast ? 0 : CELL_GAP,
                        }}
                      />
                    );
                  }

                  const isSelected = selectedDate === cell.key;

                  return (
                    <Pressable
                      key={cell.key}
                      onPress={onSelectDate ? () => onSelectDate(cell.key) : undefined}
                      disabled={!onSelectDate}
                      hitSlop={14}
                      style={({ pressed }) => ({
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 3,
                        marginBottom: isLast ? 0 : CELL_GAP,
                        backgroundColor: LEVEL_BG[cell.level] ?? LEVEL_BG[0],
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected
                          ? Colors.dark.gold
                          : cell.level >= 3
                            ? Colors.dark.gold + "55"
                            : Colors.dark.border + "44",
                        opacity: pressed && onSelectDate ? 0.8 : 1,
                      })}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          </View>
        </ScrollView>
        <View pointerEvents="none" style={styles.leftEdgeMask} />
      </View>

      {/* ── Legend ── */}
      <View style={styles.legendRow}>
        <Text style={styles.legendMuted}>less</Text>
        <View style={styles.legendDots}>
          {LEVEL_BG.map((c, i) => (
            <View
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: c,
                borderWidth: 1,
                borderColor: Colors.dark.border + "88",
              }}
            />
          ))}
        </View>
        <Text style={styles.legendMuted}>more</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    width: "100%",
  },
  wrapEmbedded: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 1.2,
  },
  sub: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    opacity: 0.85,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: MONTH_ROW_H,
    marginBottom: 4,
  },
  heatmapViewport: {
    overflow: "hidden",
    borderRadius: 2,
    position: "relative",
  },
  heatmapScrollContent: {
    paddingLeft: 1,
  },
  leftEdgeMask: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.dark.background,
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    opacity: 0.75,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dowCol: {
    flexDirection: "column",
  },
  dowLabel: {
    fontSize: 9,
    color: Colors.dark.textMuted,
    opacity: 0.55,
  },
  weekCol: {
    flexDirection: "column",
    alignItems: "center",
    width: CELL_SIZE,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  legendMuted: {
    fontSize: 10,
    color: Colors.dark.textMuted,
  },
  legendDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
});
