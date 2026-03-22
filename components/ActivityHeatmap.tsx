import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

const NUM_DAYS = 56;
const COLS = 7;

function formatDayKey(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function dayIntensity(day: { completions: number; xpFromHabits: number } | undefined): number {
  if (!day) return 0;
  const score = day.completions * 3 + Math.floor(day.xpFromHabits / 22);
  if (score <= 0) return 0;
  if (score <= 3) return 1;
  if (score <= 8) return 2;
  if (score <= 16) return 3;
  return 4;
}

const LEVEL_BG: readonly string[] = [
  "#12101a",
  "#1a3d28",
  "#248f5a",
  "#3dd68c",
  "#ffc845",
];

type Props = {
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
  /** W modalu — mniejszy margines zewnętrzny. */
  embedded?: boolean;
};

/** GitHub-style contribution grid — oldest left→right, newest bottom-right corner. */
export default function ActivityHeatmap({ activityByDate, embedded }: Props) {
  const cells = useMemo(() => {
    const out: { key: string; level: number }[] = [];
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (NUM_DAYS - 1));
    for (let i = 0; i < NUM_DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatDayKey(d);
      const level = dayIntensity(activityByDate[key]);
      out.push({ key, level });
    }
    return out;
  }, [activityByDate]);

  const rows: (typeof cells)[] = [];
  for (let r = 0; r < NUM_DAYS / COLS; r++) {
    rows.push(cells.slice(r * COLS, r * COLS + COLS));
  }

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Aktywność</Text>
        <Text style={styles.sub}>Ostatnie {NUM_DAYS} dni</Text>
      </View>
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.cell,
                  {
                    backgroundColor: LEVEL_BG[cell.level] ?? LEVEL_BG[0],
                    borderColor:
                      cell.level >= 3
                        ? Colors.dark.gold + "55"
                        : Colors.dark.border + "44",
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendMuted}>mniej</Text>
        <View style={styles.legendDots}>
          {LEVEL_BG.map((c, i) => (
            <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
          ))}
        </View>
        <Text style={styles.legendMuted}>więcej</Text>
      </View>
    </View>
  );
}

const CELL = 11;
const GAP = 3;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  wrapEmbedded: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
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
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    borderWidth: 1,
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
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
});
