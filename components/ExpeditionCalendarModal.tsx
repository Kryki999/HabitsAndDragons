import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  FlatList,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarClock,
  ArrowLeft,
  ArrowRight,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import type { Habit } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import AddHabitModal from "@/components/AddHabitModal";
import DayQuestLogReadOnly from "@/components/DayQuestLogReadOnly";
import DailyReflectionPanel from "@/components/DailyReflectionPanel";
import TaskCardOverlay, { type CardMetrics } from "@/components/TaskCardOverlay";
import { applyPlanningOrderForDate } from "@/lib/planningDayOrder";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateKeyFromYMD(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function daysInMonth(y: number, month: number): number {
  return new Date(y, month, 0).getDate();
}

function buildMonthGridCells(y: number, month: number): (number | null)[] {
  const dim = daysInMonth(y, month);
  const first = new Date(y, month - 1, 1);
  const pad = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDateKeyToShortLabel(dateKey: string): string {
  const p = parseDateKey(dateKey);
  if (!p) return dateKey;
  const d = new Date(p.y, p.m - 1, p.d);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthYearLabel(y: number, month: number): string {
  const d = new Date(y, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Week Swiper helpers ────────────────────────────────────────────────────

const WEEKS_BACK = 52;
const WEEKS_FORWARD = 8;
const CURRENT_WEEK_IDX = WEEKS_BACK;
const TOTAL_WEEKS = WEEKS_BACK + WEEKS_FORWARD + 1;
const WEEK_DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function getMondayOfCurrentWeek(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getMondayOfWeekForDate(dateKey: string): Date {
  const p = parseDateKey(dateKey);
  if (!p) return getMondayOfCurrentWeek();
  const d = new Date(p.y, p.m - 1, p.d);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function dateKeyFromDate(d: Date): string {
  return dateKeyFromYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function addDaysDateKey(baseKey: string, days: number): string {
  const p = parseDateKey(baseKey);
  if (!p) return baseKey;
  const d = new Date(p.y, p.m - 1, p.d);
  d.setDate(d.getDate() + days);
  return dateKeyFromDate(d);
}

function isHabitPlannedForDate(habit: Habit, dateKey: string, todayKey: string): boolean {
  const plannedFrom = habit.scheduledDate ?? todayKey;
  if (habit.taskType === "daily") {
    // Daily habits repeat on every day from their planned start date onward.
    return dateKey >= plannedFrom;
  }
  // One-off quests stay bound to their explicit planned day.
  return plannedFrom === dateKey;
}

/** Returns the Thursday of the week starting on `monday`, used for month/year syncing. */
function thursdayOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(monday.getDate() + 3);
  return d;
}

/**
 * Returns how many weeks offset the week containing `dateKey` is
 * relative to the current week stored at index CURRENT_WEEK_IDX.
 */
function weekIndexForDate(dateKey: string, weeksData: Date[]): number {
  const targetMonday = getMondayOfWeekForDate(dateKey);
  const targetKey = dateKeyFromDate(targetMonday);
  for (let i = 0; i < weeksData.length; i++) {
    if (dateKeyFromDate(weeksData[i]!) === targetKey) return i;
  }
  return CURRENT_WEEK_IDX;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  expeditionFocusDateKey: string | null;
  onExpeditionFocusDateKeyChange: (dateKey: string) => void;
  profileCreatedAtDateKey: string | null;
  userId: string | null;
};

function TaskRow({
  habit,
  onComplete,
  onUncomplete,
  onDelete,
  onEdit,
  onReschedule,
  drag: _drag,
  isActive: _isActive,
}: {
  habit: Habit;
  onComplete: (habitId: string) => void;
  onUncomplete: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit) => void;
  drag: () => void;
  isActive: boolean;
}) {
  const scheduledLabel = habit.scheduledDate ? formatDateKeyToShortLabel(habit.scheduledDate) : "Today";
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [cardMetrics, setCardMetrics] = useState<CardMetrics | null>(null);
  const rowRef = useRef<View>(null);

  const openOverlay = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    rowRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setCardMetrics({ x: pageX, y: pageY, width, height });
      setOverlayOpen(true);
    });
  }, []);

  return (
    <ScaleDecorator>
      <Pressable
        onPress={openOverlay}
        disabled={overlayOpen}
      >
        <View
          ref={rowRef}
          collapsable={false}
          style={[styles.taskRow, overlayOpen && { opacity: 0 }]}
        >
          <View style={styles.taskRowLeft}>
            <Text style={styles.taskEmoji}>{habit.icon}</Text>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskName, habit.completedToday && styles.taskNameCompleted]}>
                {habit.name}
              </Text>
              <Text style={styles.taskMeta}>
                {habit.taskType === "daily" ? "Habit" : "Side quest"} · {scheduledLabel}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      {overlayOpen ? (
        <TaskCardOverlay
          visible={overlayOpen}
          habit={habit}
          originMetrics={cardMetrics}
          onClose={() => setOverlayOpen(false)}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onDelete={onDelete}
          onEdit={onEdit}
          onReschedule={onReschedule}
        />
      ) : null}
    </ScaleDecorator>
  );
}

// ─── WeekPage sub-component ─────────────────────────────────────────────────

function WeekPage({
  weekStart,
  pageWidth,
  todayKey,
  selectedDateKey,
  minSelectableKey,
  completedHabitNamesByDate,
  onSelectDate,
}: {
  weekStart: Date;
  pageWidth: number;
  todayKey: string;
  selectedDateKey: string;
  minSelectableKey: string;
  completedHabitNamesByDate: Record<string, string[]>;
  onSelectDate: (key: string) => void;
}) {
  const cellWidth = Math.floor((pageWidth - 32) / 7);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  return (
    <View style={[wpStyles.row, { width: pageWidth, paddingHorizontal: 16 }]}>
      {days.map((day, idx) => {
        const key = dateKeyFromDate(day);
        const isSelected = key === selectedDateKey;
        const isToday = key === todayKey;
        const isFuture = key > todayKey;
        const isBlocked = key < minSelectableKey;
        const hasActivity = (completedHabitNamesByDate[key]?.length ?? 0) > 0;

        return (
          <Pressable
            key={key}
            disabled={isBlocked}
            onPress={() => {
              if (!isBlocked) {
                impactAsync(ImpactFeedbackStyle.Light);
                onSelectDate(key);
              }
            }}
            style={[
              wpStyles.cell,
              { width: cellWidth },
              isSelected && wpStyles.cellSelected,
              isToday && !isSelected && wpStyles.cellToday,
              (isFuture || isBlocked) && wpStyles.cellDim,
            ]}
          >
            <Text style={[wpStyles.dayLetter, (isSelected || isToday) && wpStyles.dayLetterAccent]}>
              {WEEK_DAY_LETTERS[idx]}
            </Text>
            <Text
              style={[
                wpStyles.dayNum,
                isSelected && wpStyles.dayNumSelected,
                isToday && !isSelected && wpStyles.dayNumToday,
              ]}
            >
              {day.getDate()}
            </Text>
            <View style={[wpStyles.dot, hasActivity && !isFuture && !isBlocked && wpStyles.dotActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const wpStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  cell: {
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    gap: 3,
  },
  cellSelected: {
    backgroundColor: Colors.dark.gold + "28",
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "aa",
  },
  cellToday: {
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "88",
  },
  cellDim: {
    opacity: 0.35,
  },
  dayLetter: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  dayLetterAccent: {
    color: Colors.dark.gold,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.dark.text,
    lineHeight: 18,
  },
  dayNumSelected: {
    color: Colors.dark.gold,
  },
  dayNumToday: {
    color: Colors.dark.emerald,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  dotActive: {
    backgroundColor: Colors.dark.gold,
  },
});

export default function ExpeditionCalendarModal({
  visible,
  onClose,
  expeditionFocusDateKey,
  onExpeditionFocusDateKeyChange,
  profileCreatedAtDateKey,
  userId,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [todayKey] = useState(() => getTodayKey());

  const allHabits = useGameStore((s) => s.habits);
  const habits = useMemo(() => allHabits.filter((h) => h.isActive), [allHabits]);
  const planningDayOrderByDate = useGameStore((s) => s.planningDayOrderByDate);
  const setPlanningDayOrderForDate = useGameStore((s) => s.setPlanningDayOrderForDate);
  const completedHabitNamesByDate = useGameStore((s) => s.completedHabitNamesByDate);
  const dailyReflectionByDate = useGameStore((s) => s.dailyReflectionByDate);
  const completeHabit = useGameStore((s) => s.completeHabit);
  const uncompleteHabit = useGameStore((s) => s.uncompleteHabit);
  const removeHabit = useGameStore((s) => s.removeHabit);
  const updateHabit = useGameStore((s) => s.updateHabit);
  const addHabit = useGameStore((s) => s.addHabit);
  const setHabitScheduledDate = useGameStore((s) => s.setHabitScheduledDate);

  // If the account creation date isn't loaded yet, fall back to todayKey so that
  // all past dates appear blocked until the real value arrives from auth.
  const minSelectableKey = useMemo(
    () => profileCreatedAtDateKey ?? todayKey,
    [profileCreatedAtDateKey, todayKey],
  );

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [monthExpanded, setMonthExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rescheduleHabit, setRescheduleHabit] = useState<Habit | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDateKey, setRescheduleDateKey] = useState(todayKey);
  const [rescheduleYM, setRescheduleYM] = useState(() => {
    const p = parseDateKey(todayKey);
    return { y: p?.y ?? new Date().getFullYear(), m: p?.m ?? new Date().getMonth() + 1 };
  });
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIcon, setEditIcon] = useState("⚔️");
  const [editTaskType, setEditTaskType] = useState<Habit["taskType"]>("daily");
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const reflectionForSelectedDay = (dailyReflectionByDate[selectedDateKey] ?? "").trim();

  // ── Week swiper ──
  const weekFlatListRef = useRef<FlatList<Date>>(null);
  const [visibleWeekIdx, setVisibleWeekIdx] = useState(CURRENT_WEEK_IDX);

  const weeksData = useMemo<Date[]>(() => {
    const base = getMondayOfCurrentWeek();
    return Array.from({ length: TOTAL_WEEKS }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + (i - WEEKS_BACK) * 7);
      return d;
    });
  }, []);

  const prevVisibleRef = useRef(false);

  const todayParsed = parseDateKey(todayKey);
  const [displayYM, setDisplayYM] = useState(() => ({
    y: todayParsed?.y ?? new Date().getFullYear(),
    m: todayParsed?.m ?? new Date().getMonth() + 1,
  }));

  // Sync displayYM to the month of the currently selected day
  useEffect(() => {
    if (!visible) return;
    const p = parseDateKey(selectedDateKey);
    if (p) setDisplayYM({ y: p.y, m: p.m });
  }, [visible, selectedDateKey]);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const initial = expeditionFocusDateKey ?? todayKey;
      setSelectedDateKey(initial);
      const wIdx = weekIndexForDate(initial, weeksData);
      setVisibleWeekIdx(wIdx);
    }
    prevVisibleRef.current = visible;
  }, [visible, expeditionFocusDateKey, todayKey, weeksData]);

  const isPastReadOnly = selectedDateKey < todayKey && selectedDateKey >= minSelectableKey;
  const monthYearLabel = formatMonthYearLabel(displayYM.y, displayYM.m);

  // "Thu, Apr 9" — shown in the collapsed header instead of "March 2026"
  const selectedDayLabel = useMemo(() => {
    const p = parseDateKey(selectedDateKey);
    if (!p) return selectedDateKey;
    const d = new Date(p.y, p.m - 1, p.d);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, [selectedDateKey]);

  const monthGridCells = useMemo(
    () => buildMonthGridCells(displayYM.y, displayYM.m),
    [displayYM.y, displayYM.m],
  );

  const tasksForSelectedDate = useMemo(() => {
    const key = selectedDateKey;
    return habits.filter((h) => isHabitPlannedForDate(h, key, todayKey));
  }, [habits, selectedDateKey, todayKey]);

  const orderedTasks = useMemo(
    () => applyPlanningOrderForDate(selectedDateKey, tasksForSelectedDate, planningDayOrderByDate),
    [tasksForSelectedDate, planningDayOrderByDate, selectedDateKey],
  );

  const [listData, setListData] = useState<Habit[]>(orderedTasks);
  useEffect(() => {
    setListData(orderedTasks);
  }, [orderedTasks]);

  const weekGetItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenW,
      offset: screenW * index,
      index,
    }),
    [screenW],
  );

  const handleWeekMomentumScrollEnd = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
      const clamped = Math.max(0, Math.min(TOTAL_WEEKS - 1, idx));
      setVisibleWeekIdx(clamped);

      // Auto-select the same weekday in the new week
      const newWeekMonday = weeksData[clamped];
      if (newWeekMonday) {
        const selP = parseDateKey(selectedDateKey);
        if (selP) {
          const selDate = new Date(selP.y, selP.m - 1, selP.d);
          const jsDay = selDate.getDay(); // 0=Sun, 1=Mon … 6=Sat
          const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0 … Sun=6
          const candidate = new Date(newWeekMonday);
          candidate.setDate(newWeekMonday.getDate() + dayIdx);
          const newKey = dateKeyFromDate(candidate);
          if (newKey >= minSelectableKey) {
            setSelectedDateKey(newKey);
            onExpeditionFocusDateKeyChange(newKey);
          }
        }
      }
    },
    [screenW, weeksData, selectedDateKey, minSelectableKey, onExpeditionFocusDateKeyChange],
  );

  const handleReturnToToday = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSelectedDateKey(todayKey);
    onExpeditionFocusDateKeyChange(todayKey);
    setVisibleWeekIdx(CURRENT_WEEK_IDX);
    weekFlatListRef.current?.scrollToIndex({ index: CURRENT_WEEK_IDX, animated: true });
  }, [todayKey, onExpeditionFocusDateKeyChange]);


  const addAllowed = selectedDateKey >= todayKey && selectedDateKey >= minSelectableKey;
  const reflectionAllowed = selectedDateKey <= todayKey && selectedDateKey >= minSelectableKey;
  const isFutureFocusDay = selectedDateKey > todayKey;
  const handleTaskListScrollBegin = useCallback(() => {
    if (monthExpanded) setMonthExpanded(false);
  }, [monthExpanded]);

  const handleCompleteFromTimeline = useCallback(
    (habitId: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      if (selectedDateKey > todayKey) {
        Alert.alert(
          "Future quest",
          "This quest belongs to a future day. Do you want to mark it as completed now?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Complete anyway",
              style: "default",
              onPress: () => completeHabit(habitId),
            },
          ],
        );
        return;
      }
      completeHabit(habitId);
    },
    [habits, selectedDateKey, todayKey, completeHabit],
  );

  const handleUncompleteFromTimeline = useCallback(
    (habitId: string) => {
      uncompleteHabit(habitId);
    },
    [uncompleteHabit],
  );

  const onDragEnd = useCallback(
    ({ data }: { data: Habit[] }) => {
      if (isPastReadOnly) return;
      setListData(data);
      setPlanningDayOrderForDate(
        selectedDateKey,
        data.map((h) => h.id),
      );
      impactAsync(ImpactFeedbackStyle.Light);
    },
    [isPastReadOnly, selectedDateKey, setPlanningDayOrderForDate],
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => (
      <TaskRow
        habit={item}
        onComplete={handleCompleteFromTimeline}
        onUncomplete={handleUncompleteFromTimeline}
        onDelete={(habitId) => {
          Alert.alert(
            "Delete Quest",
            "Are you sure you want to delete this quest from your timeline?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => removeHabit(habitId),
              },
            ],
          );
        }}
        onReschedule={(hh) => {
          setRescheduleHabit(hh);
          setRescheduleOpen(true);
        }}
        onEdit={(hh) => {
          setEditHabit(hh);
          setEditName(hh.name);
          setEditDesc(hh.description ?? "");
          setEditIcon(hh.icon ?? "⚔️");
          setEditTaskType(hh.taskType);
          setEditOpen(true);
        }}
        drag={drag}
        isActive={isActive}
      />
    ),
    [todayKey, handleCompleteFromTimeline, handleUncompleteFromTimeline, removeHabit],
  );

  const renderWeekPage = useCallback(
    ({ item }: { item: Date }) => (
      <WeekPage
        weekStart={item}
        pageWidth={screenW}
        todayKey={todayKey}
        selectedDateKey={selectedDateKey}
        minSelectableKey={minSelectableKey}
        completedHabitNamesByDate={completedHabitNamesByDate}
        onSelectDate={(key) => {
          setSelectedDateKey(key);
          onExpeditionFocusDateKeyChange(key);
        }}
      />
    ),
    [screenW, todayKey, selectedDateKey, minSelectableKey, completedHabitNamesByDate, onExpeditionFocusDateKeyChange],
  );

  const selectDayFromGrid = useCallback(
    (day: number) => {
      const key = dateKeyFromYMD(displayYM.y, displayYM.m, day);
      if (key < minSelectableKey) return;
      setSelectedDateKey(key);
      onExpeditionFocusDateKeyChange(key);
      // Calendar stays open — user closes it manually
      impactAsync(ImpactFeedbackStyle.Light);
      const wIdx = weekIndexForDate(key, weeksData);
      setVisibleWeekIdx(wIdx);
      weekFlatListRef.current?.scrollToIndex({ index: wIdx, animated: true });
    },
    [displayYM.y, displayYM.m, minSelectableKey, onExpeditionFocusDateKeyChange, weeksData],
  );

  const handlePrevMonth = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setDisplayYM((prev) => {
      if (prev.m === 1) return { y: prev.y - 1, m: 12 };
      return { y: prev.y, m: prev.m - 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setDisplayYM((prev) => {
      if (prev.m === 12) return { y: prev.y + 1, m: 1 };
      return { y: prev.y, m: prev.m + 1 };
    });
  }, []);

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleHabit) return;
    const target = rescheduleHabit.scheduledDate ?? todayKey;
    setRescheduleDateKey(target);
    const p = parseDateKey(target);
    if (p) setRescheduleYM({ y: p.y, m: p.m });
  }, [rescheduleOpen, rescheduleHabit, todayKey]);

  const rescheduleGridCells = useMemo(
    () => buildMonthGridCells(rescheduleYM.y, rescheduleYM.m),
    [rescheduleYM.y, rescheduleYM.m],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.shell}>
        <LinearGradient
          colors={["#1a0f2e", "#120a1c", "#080510"]}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={[styles.safeTop, { paddingTop: Math.max(insets.top, 12) }]}>
          {/* Header */}
          <View style={styles.headerBar}>
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close planning center"
            >
              <X size={24} color={Colors.dark.text} />
            </Pressable>

            {/* Month/year — dynamic, taps to expand/collapse full grid */}
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setMonthExpanded((v) => !v);
              }}
              style={({ pressed }) => [styles.monthCenter, pressed && styles.monthCenterPressed]}
              accessibilityRole="button"
              accessibilityLabel={monthExpanded ? "Collapse calendar" : "Expand calendar"}
            >
              <Text style={styles.monthYearText}>{selectedDayLabel}</Text>
              {monthExpanded ? (
                <ChevronUp size={18} color={Colors.dark.gold} style={styles.monthChevron} />
              ) : (
                <ChevronDown size={18} color={Colors.dark.gold} style={styles.monthChevron} />
              )}
            </Pressable>

            <View style={styles.headerSpacer} />
          </View>

          {monthExpanded ? (
            <View style={styles.monthGridWrap}>
              {/* Month nav header */}
              <View style={styles.monthNavRow}>
                <Pressable
                  onPress={handlePrevMonth}
                  style={({ pressed }) => [styles.monthNavBtn, pressed && styles.monthNavBtnPressed]}
                  hitSlop={10}
                  accessibilityLabel="Previous month"
                >
                  <ChevronLeft size={20} color={Colors.dark.gold} strokeWidth={2.4} />
                </Pressable>
                <Text style={styles.monthGridLabel}>{monthYearLabel}</Text>
                <Pressable
                  onPress={handleNextMonth}
                  style={({ pressed }) => [styles.monthNavBtn, pressed && styles.monthNavBtnPressed]}
                  hitSlop={10}
                  accessibilityLabel="Next month"
                >
                  <ChevronRight size={20} color={Colors.dark.gold} strokeWidth={2.4} />
                </Pressable>
              </View>
              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((w) => (
                  <Text key={w} style={styles.weekdayCell}>
                    {w}
                  </Text>
                ))}
              </View>
              <View style={styles.gridCells}>
                {monthGridCells.map((day, idx) => {
                  if (day === null) {
                    return <View key={`e-${idx}`} style={styles.gridCellEmpty} />;
                  }
                  const key = dateKeyFromYMD(displayYM.y, displayYM.m, day);
                  const isSelected = key === selectedDateKey;
                  const isToday = key === todayKey;
                  const blocked = key < minSelectableKey;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => selectDayFromGrid(day)}
                      disabled={blocked}
                      style={[
                        styles.gridCellBtn,
                        isSelected && styles.gridCellBtnSelected,
                        isToday && !isSelected && styles.gridCellBtnToday,
                        blocked && styles.gridCellBtnBlocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gridCellText,
                          isSelected && styles.gridCellTextSelected,
                          blocked && styles.gridCellTextBlocked,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Module 3: weekly swiper — hidden when full calendar is open */}
          {!monthExpanded && <View style={styles.weekSwiperWrap}>
            <FlatList
              ref={weekFlatListRef}
              data={weeksData}
              keyExtractor={(_, idx) => String(idx)}
              renderItem={renderWeekPage}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={weekGetItemLayout}
              initialScrollIndex={visibleWeekIdx}
              onMomentumScrollEnd={handleWeekMomentumScrollEnd}
              onScrollBeginDrag={handleTaskListScrollBegin}
              scrollEventThrottle={16}
              windowSize={5}
              maxToRenderPerBatch={3}
              initialNumToRender={3}
              onLayout={() => {
                weekFlatListRef.current?.scrollToIndex({
                  index: visibleWeekIdx,
                  animated: false,
                });
              }}
            />
          </View>}

        </View>

        {/* Module 4: draggable list (or read-only list for past days) */}
        {isPastReadOnly ? (
          <ScrollView
            style={styles.dragList}
            contentContainerStyle={[styles.dragListContent, { paddingBottom: Math.max(insets.bottom, 12) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={handleTaskListScrollBegin}
            scrollEventThrottle={16}
          >
            <DayQuestLogReadOnly dateKey={selectedDateKey} showTitle={false} />
            {reflectionForSelectedDay.length > 0 ? (
              <View style={styles.timelineReflectionCard}>
                <Text style={styles.timelineReflectionKicker}>Saved Reflection</Text>
                <Text style={styles.timelineReflectionText}>{reflectionForSelectedDay}</Text>
              </View>
            ) : null}
            {reflectionAllowed ? (
              <View style={styles.footerBlock}>
                <Pressable
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setReflectionOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.reflectionBtn,
                    pressed && styles.reflectionBtnPressed,
                  ]}
                >
                  <Plus size={18} color={Colors.dark.gold} />
                  <Text style={styles.reflectionBtnText}>Daily Reflection</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <DraggableFlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onDragEnd={onDragEnd}
            onScrollBeginDrag={handleTaskListScrollBegin}
            containerStyle={styles.dragList}
            contentContainerStyle={styles.dragListContent}
            activationDistance={10}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nothing planned for this day.</Text>
                <Text style={styles.emptySub}>Add a habit or side quest below.</Text>
              </View>
            }
            ListFooterComponent={
              <View style={[styles.footerBlock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                {reflectionForSelectedDay.length > 0 ? (
                  <View style={[styles.timelineReflectionCard, { marginBottom: 10 }]}>
                    <Text style={styles.timelineReflectionKicker}>Saved Reflection</Text>
                    <Text style={styles.timelineReflectionText}>{reflectionForSelectedDay}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => {
                    if (!addAllowed) {
                      Alert.alert("Past dates", "Adding tasks for past dates is disabled.");
                      return;
                    }
                    setAddOpen(true);
                  }}
                  disabled={!addAllowed}
                  style={({ pressed }) => [
                    styles.addBtn,
                    !addAllowed && styles.addBtnDisabled,
                    pressed && addAllowed && styles.addBtnPressed,
                  ]}
                >
                  <Plus size={18} color={Colors.dark.text} />
                  <Text style={styles.addBtnText}>Add for this day</Text>
                </Pressable>
                {reflectionAllowed ? (
                  <Pressable
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setReflectionOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.reflectionBtn,
                      pressed && styles.reflectionBtnPressed,
                      { marginTop: 10 },
                    ]}
                  >
                    <Plus size={18} color={Colors.dark.gold} />
                    <Text style={styles.reflectionBtnText}>Daily Reflection</Text>
                  </Pressable>
                ) : null}
              </View>
            }
          />
        )}

        {addOpen ? (
          <AddHabitModal
            visible
            onClose={() => setAddOpen(false)}
            initialScheduledDateKey={selectedDateKey}
            onAddHabit={(habit) => {
              addHabit(habit);
              setAddOpen(false);
            }}
          />
        ) : null}

        {rescheduleOpen ? (
          <Modal visible transparent={false} animationType="slide" onRequestClose={() => setRescheduleOpen(false)}>
            <View style={styles.fullModalShell}>
              <LinearGradient
                colors={["#1a0f2e", "#120a1c", "#080510"]}
                style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={[styles.fullModalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
                <Pressable
                  onPress={() => setRescheduleOpen(false)}
                  style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                >
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
                <View style={styles.fullModalTitleBlock}>
                  <Text style={styles.fullModalTitle}>Reschedule Quest</Text>
                  <Text style={styles.fullModalSubtitle} numberOfLines={1}>{rescheduleHabit?.name ?? ""}</Text>
                </View>
                <View style={styles.headerSpacer} />
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.fullModalBody, { paddingBottom: Math.max(insets.bottom, 20) }]}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalSectionKicker}>Quick Actions</Text>
                <View style={styles.quickTilesRow}>
                  <Pressable
                    onPress={() => setRescheduleDateKey(addDaysDateKey(todayKey, 1))}
                    style={[styles.quickTile, rescheduleDateKey === addDaysDateKey(todayKey, 1) && styles.quickTileActive]}
                  >
                    <Text style={styles.quickTileTitle}>Tomorrow</Text>
                    <Text style={styles.quickTileMeta}>{formatDateKeyToShortLabel(addDaysDateKey(todayKey, 1))}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRescheduleDateKey(addDaysDateKey(todayKey, 7))}
                    style={[styles.quickTile, rescheduleDateKey === addDaysDateKey(todayKey, 7) && styles.quickTileActive]}
                  >
                    <Text style={styles.quickTileTitle}>Next Week</Text>
                    <Text style={styles.quickTileMeta}>{formatDateKeyToShortLabel(addDaysDateKey(todayKey, 7))}</Text>
                  </Pressable>
                </View>

                <Text style={[styles.modalSectionKicker, { marginTop: 18 }]}>Pick Date</Text>
                <View style={styles.modalCalendarCard}>
                  <View style={styles.monthNavRow}>
                    <Pressable
                      onPress={() =>
                        setRescheduleYM((prev) => (prev.m === 1 ? { y: prev.y - 1, m: 12 } : { y: prev.y, m: prev.m - 1 }))
                      }
                      style={({ pressed }) => [styles.monthNavBtn, pressed && styles.monthNavBtnPressed]}
                    >
                      <ChevronLeft size={20} color={Colors.dark.gold} strokeWidth={2.4} />
                    </Pressable>
                    <Text style={styles.monthGridLabel}>{formatMonthYearLabel(rescheduleYM.y, rescheduleYM.m)}</Text>
                    <Pressable
                      onPress={() =>
                        setRescheduleYM((prev) => (prev.m === 12 ? { y: prev.y + 1, m: 1 } : { y: prev.y, m: prev.m + 1 }))
                      }
                      style={({ pressed }) => [styles.monthNavBtn, pressed && styles.monthNavBtnPressed]}
                    >
                      <ChevronRight size={20} color={Colors.dark.gold} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_LABELS.map((w) => (
                      <Text key={`rs-${w}`} style={styles.weekdayCell}>{w}</Text>
                    ))}
                  </View>
                  <View style={styles.gridCells}>
                    {rescheduleGridCells.map((day, idx) => {
                      if (day === null) return <View key={`rs-empty-${idx}`} style={styles.gridCellEmpty} />;
                      const key = dateKeyFromYMD(rescheduleYM.y, rescheduleYM.m, day);
                      const isSelected = key === rescheduleDateKey;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setRescheduleDateKey(key)}
                          style={[styles.gridCellBtn, isSelected && styles.gridCellBtnSelected]}
                        >
                          <Text style={[styles.gridCellText, isSelected && styles.gridCellTextSelected]}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.rescheduleBtns}>
                  <Pressable onPress={() => setRescheduleOpen(false)} style={styles.rescheduleCancelBtn}>
                    <Text style={styles.rescheduleCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!rescheduleHabit) return;
                      setHabitScheduledDate(rescheduleHabit.id, rescheduleDateKey);
                      setRescheduleOpen(false);
                    }}
                    style={styles.rescheduleSaveBtn}
                  >
                    <Text style={styles.rescheduleSaveText}>Apply</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Modal>
        ) : null}

        {editOpen ? (
          <Modal visible transparent={false} animationType="slide" onRequestClose={() => setEditOpen(false)}>
            <View style={styles.fullModalShell}>
              <LinearGradient
                colors={["#1a0f2e", "#120a1c", "#080510"]}
                style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={[styles.fullModalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
                <Pressable
                  onPress={() => setEditOpen(false)}
                  style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                >
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
                <View style={styles.fullModalTitleBlock}>
                  <Text style={styles.fullModalTitle}>Edit Quest</Text>
                  <Text style={styles.fullModalSubtitle}>Dark fantasy forge</Text>
                </View>
                <View style={styles.headerSpacer} />
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.fullModalBody, { paddingBottom: Math.max(insets.bottom, 20) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalSectionKicker}>Core</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Quest name"
                  placeholderTextColor={Colors.dark.textMuted}
                  style={styles.editInput}
                />
                <TextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Quest description"
                  placeholderTextColor={Colors.dark.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.editInput, styles.editInputMulti]}
                />

                <Text style={[styles.modalSectionKicker, { marginTop: 10 }]}>Visual</Text>
                <TextInput
                  value={editIcon}
                  onChangeText={setEditIcon}
                  placeholder="Icon"
                  placeholderTextColor={Colors.dark.textMuted}
                  style={styles.editInput}
                  maxLength={2}
                />

                <Text style={[styles.modalSectionKicker, { marginTop: 10 }]}>Type</Text>
                <View style={styles.editTypeRow}>
                  <Pressable
                    onPress={() => setEditTaskType("daily")}
                    style={[styles.editTypeBtn, editTaskType === "daily" && styles.editTypeBtnActive]}
                  >
                    <Text style={[styles.editTypeText, editTaskType === "daily" && styles.editTypeTextActive]}>Daily</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditTaskType("one-off")}
                    style={[styles.editTypeBtn, editTaskType === "one-off" && styles.editTypeBtnActive]}
                  >
                    <Text style={[styles.editTypeText, editTaskType === "one-off" && styles.editTypeTextActive]}>One-off</Text>
                  </Pressable>
                </View>

                <View style={styles.rescheduleBtns}>
                  <Pressable onPress={() => setEditOpen(false)} style={styles.rescheduleCancelBtn}>
                    <Text style={styles.rescheduleCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!editHabit || !editName.trim()) return;
                      updateHabit(editHabit.id, {
                        name: editName,
                        description: editDesc,
                        icon: editIcon.trim() || "⚔️",
                        taskType: editTaskType,
                      });
                      setEditOpen(false);
                    }}
                    style={styles.rescheduleSaveBtn}
                  >
                    <Text style={styles.rescheduleSaveText}>Save</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Modal>
        ) : null}

        {/* Return to Today floating button */}
        {selectedDateKey !== todayKey ? (
          <Pressable
            onPress={handleReturnToToday}
            style={[
              styles.returnTodayBtn,
              { bottom: Math.max(insets.bottom + 56, 60) },
              isFutureFocusDay ? styles.returnTodayBtnLeft : styles.returnTodayBtnRight,
            ]}
            accessibilityLabel="Return to today"
          >
            {isFutureFocusDay ? (
              <>
                <ArrowLeft size={14} color={Colors.dark.gold} strokeWidth={2.4} />
                <Text style={styles.returnTodayText}>Today</Text>
              </>
            ) : (
              <>
                <Text style={styles.returnTodayText}>Today</Text>
                <ArrowRight size={14} color={Colors.dark.gold} strokeWidth={2.4} />
              </>
            )}
          </Pressable>
        ) : null}

        {reflectionOpen ? (
          <Modal
            visible
            transparent={false}
            animationType="slide"
            onRequestClose={() => setReflectionOpen(false)}
          >
            <View style={styles.reflectionModalShell}>
              <LinearGradient
                colors={["#1a0f2e", "#120a1c", "#080510"]}
                style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={[styles.reflectionModalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <Pressable
                  onPress={() => setReflectionOpen(false)}
                  style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close reflection"
                >
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
                <View style={styles.reflectionModalTitleBlock}>
                  <Text style={styles.reflectionModalTitle}>Daily Reflection</Text>
                  <Text style={styles.reflectionModalDate}>{formatDateKeyToShortLabel(selectedDateKey)}</Text>
                </View>
                <View style={styles.headerSpacer} />
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.reflectionModalBody, { paddingBottom: Math.max(insets.bottom, 24) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <DailyReflectionPanel dateKey={selectedDateKey} userId={userId} variant="modal" />
                <Pressable
                  onPress={() => setReflectionOpen(false)}
                  style={({ pressed }) => [styles.reflectionCancelBtn, pressed && styles.reflectionCancelBtnPressed]}
                >
                  <Text style={styles.reflectionCancelText}>Anuluj</Text>
                </Pressable>
              </ScrollView>
            </View>
          </Modal>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  safeTop: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
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
    transform: [{ scale: 0.97 }],
  },
  monthCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
    minWidth: 0,
  },
  monthCenterPressed: {
    opacity: 0.9,
  },
  monthYearText: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.2,
  },
  monthChevron: {
    marginTop: 1,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  monthGridWrap: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    backgroundColor: Colors.dark.surface + "99",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "33",
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "99",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
  },
  monthNavBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.93 }],
  },
  monthGridLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    textAlign: "center" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    letterSpacing: 0.5,
  },
  gridCells: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  gridCellEmpty: {
    width: "14.28%",
    height: 42,
  },
  gridCellBtn: {
    width: "14.28%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 0,
  },
  gridCellBtnSelected: {
    backgroundColor: Colors.dark.gold + "28",
    borderWidth: 1,
    borderColor: Colors.dark.gold,
  },
  gridCellBtnToday: {
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "66",
  },
  gridCellBtnBlocked: {
    opacity: 0.35,
  },
  gridCellText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark.textSecondary,
    textAlign: "center" as const,
    lineHeight: 16,
  },
  gridCellTextSelected: {
    color: Colors.dark.gold,
  },
  gridCellTextBlocked: {
    color: Colors.dark.textMuted,
  },
  weekSwiperWrap: {
    height: 90,
    marginLeft: -16,
    marginRight: -16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "44",
    marginBottom: 6,
  },
  returnTodayBtn: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.gold + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "88",
    zIndex: 30,
    bottom: 96,
  },
  returnTodayBtnLeft: {
    left: 12,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  returnTodayBtnRight: {
    right: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  returnTodayText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  dragList: {
    flex: 1,
  },
  dragListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  taskRowActive: {
    borderColor: Colors.dark.gold + "88",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  taskRowMuted: {
    opacity: 0.72,
  },
  dragHandlePlaceholder: {
    width: 24,
  },
  taskRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  taskEmoji: {
    fontSize: 22,
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    lineHeight: 20,
    flexWrap: "wrap" as const,
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
  taskRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background + "aa",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  iconBtnDisabled: {
    opacity: 0.45,
  },
  iconBtnReadonly: {
    opacity: 0.85,
  },
  iconBtnPressed: {
    opacity: 0.85,
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.textSecondary,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  footerBlock: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: Colors.dark.gold + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "66",
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addBtnPressed: {
    opacity: 0.9,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  timelineReflectionCard: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
    backgroundColor: Colors.dark.gold + "12",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  timelineReflectionKicker: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  timelineReflectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.dark.textSecondary,
    fontStyle: "italic" as const,
  },
  fullModalShell: {
    flex: 1,
    backgroundColor: "#080510",
  },
  fullModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "66",
  },
  fullModalTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  fullModalTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.2,
  },
  fullModalSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  fullModalBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modalSectionKicker: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  quickTilesRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    backgroundColor: Colors.dark.surface + "dd",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  quickTileActive: {
    borderColor: Colors.dark.gold + "aa",
    backgroundColor: Colors.dark.gold + "1a",
  },
  quickTileTitle: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  quickTileMeta: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.dark.textMuted,
  },
  modalCalendarCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: Colors.dark.surface + "99",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "33",
  },
  rescheduleBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  rescheduleSheet: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "28%" as const,
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#1e1530",
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "55",
  },
  rescheduleSheetBottom: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#1b132b",
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "55",
  },
  rescheduleTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  rescheduleSub: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginBottom: 14,
  },
  rescheduleActionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    backgroundColor: Colors.dark.surface + "d9",
  },
  rescheduleActionText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    textAlign: "center" as const,
  },
  rescheduleRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
  },
  rescheduleChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rescheduleChipActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + "12",
  },
  rescheduleChipText: {
    color: Colors.dark.textMuted,
    fontWeight: "800" as const,
    fontSize: 11,
  },
  rescheduleChipTextActive: {
    color: Colors.dark.gold,
  },
  rescheduleBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  rescheduleCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rescheduleCancelText: {
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
  },
  rescheduleSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.dark.gold,
    alignItems: "center",
  },
  rescheduleSaveText: {
    fontWeight: "800" as const,
    color: "#1a1228",
  },
  editSheet: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "14%" as const,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#1b132b",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "44",
  },
  editTitle: {
    fontSize: 19,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  editSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  editInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border + "99",
    backgroundColor: Colors.dark.surface + "dd",
    color: Colors.dark.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  editInputMulti: {
    minHeight: 84,
    maxHeight: 160,
  },
  editTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  editTypeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
    backgroundColor: Colors.dark.surface + "cc",
  },
  editTypeBtnActive: {
    borderColor: Colors.dark.gold + "aa",
    backgroundColor: Colors.dark.gold + "22",
  },
  editTypeText: {
    color: Colors.dark.textMuted,
    fontWeight: "700" as const,
    fontSize: 12,
  },
  editTypeTextActive: {
    color: Colors.dark.gold,
  },
  reflectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: Colors.dark.gold + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "66",
  },
  reflectionBtnPressed: {
    opacity: 0.88,
  },
  reflectionBtnText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.dark.gold,
  },
  reflectionModalShell: {
    flex: 1,
    backgroundColor: "#080510",
  },
  reflectionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "66",
  },
  reflectionModalTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  reflectionModalTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.2,
  },
  reflectionModalDate: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.dark.gold,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  reflectionModalBody: {
    padding: 16,
    paddingTop: 8,
  },
  reflectionCancelBtn: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  reflectionCancelBtnPressed: {
    opacity: 0.88,
  },
  reflectionCancelText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.textMuted,
  },
});
