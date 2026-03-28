import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
  LayoutChangeEvent,
  Platform,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  CalendarClock,
  GripVertical,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import type { Habit } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import AddHabitModal from "@/components/AddHabitModal";
import DailyReflectionPanel from "@/components/DailyReflectionPanel";
import { applyPlanningOrderForDate } from "@/lib/planningDayOrder";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const CHIP_W = 78;
const CHIP_GAP = 10;

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
  todayKey,
  readOnly,
  historicalCompleted,
  onCompleteToggle,
  onDelete,
  onReschedule,
  drag,
  isActive,
}: {
  habit: Habit;
  todayKey: string;
  readOnly?: boolean;
  historicalCompleted?: boolean;
  onCompleteToggle: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onReschedule: (habit: Habit) => void;
  drag: () => void;
  isActive: boolean;
}) {
  const due = !habit.scheduledDate || habit.scheduledDate <= todayKey;
  const scheduledLabel = habit.scheduledDate ? formatDateKeyToShortLabel(habit.scheduledDate) : "Today";

  const rowInner = (
    <View style={[styles.taskRow, isActive && styles.taskRowActive, !due && !readOnly && styles.taskRowMuted]}>
      {!readOnly ? (
        <View style={styles.dragHandle} accessibilityLabel="Reorder">
          <GripVertical size={18} color={Colors.dark.textMuted} />
        </View>
      ) : (
        <View style={styles.dragHandlePlaceholder} />
      )}
      <View style={styles.taskRowLeft}>
        <Text style={styles.taskEmoji}>{habit.icon}</Text>
        <View style={styles.taskInfo}>
          <Text
            style={[
              styles.taskName,
              (readOnly ? historicalCompleted : habit.completedToday) && styles.taskNameCompleted,
            ]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>
          <Text style={styles.taskMeta}>
            {habit.taskType === "daily" ? "Habit" : "Side quest"} · {scheduledLabel}
          </Text>
        </View>
      </View>

      {!readOnly ? (
        <View style={styles.taskRowActions}>
          <Pressable
            onPress={() => onCompleteToggle(habit.id)}
            disabled={!due}
            style={({ pressed }) => [styles.iconBtn, !due && styles.iconBtnDisabled, pressed && due && styles.iconBtnPressed]}
          >
            <Check size={16} color={due ? Colors.dark.gold : Colors.dark.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => onReschedule(habit)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <CalendarClock size={16} color={Colors.dark.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              onDelete(habit.id);
            }}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Trash2 size={16} color={Colors.dark.textMuted} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.taskRowActions}>
          {historicalCompleted ? (
            <View style={[styles.iconBtn, styles.iconBtnReadonly]}>
              <Check size={16} color={Colors.dark.gold} />
            </View>
          ) : (
            <View style={[styles.iconBtn, styles.iconBtnReadonly]}>
              <Check size={16} color={Colors.dark.textMuted} />
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (readOnly) {
    return rowInner;
  }

  return (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        activeOpacity={0.92}
        delayLongPress={180}
      >
        {rowInner}
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

export default function ExpeditionCalendarModal({
  visible,
  onClose,
  expeditionFocusDateKey,
  onExpeditionFocusDateKeyChange,
  profileCreatedAtDateKey,
  userId,
}: Props) {
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get("window").width;
  const [todayKey] = useState(() => getTodayKey());

  const allHabits = useGameStore((s) => s.habits);
  const habits = useMemo(() => allHabits.filter((h) => h.isActive), [allHabits]);
  const planningDayOrderByDate = useGameStore((s) => s.planningDayOrderByDate);
  const setPlanningDayOrderForDate = useGameStore((s) => s.setPlanningDayOrderForDate);
  const completedHabitNamesByDate = useGameStore((s) => s.completedHabitNamesByDate);
  const completeHabit = useGameStore((s) => s.completeHabit);
  const uncompleteHabit = useGameStore((s) => s.uncompleteHabit);
  const removeHabit = useGameStore((s) => s.removeHabit);
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
  const [rescheduleDateKey, setRescheduleDateKey] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  const timelineRef = useRef<ScrollView>(null);
  const prevVisibleRef = useRef(false);
  const [timelineW, setTimelineW] = useState(screenW);

  const todayParsed = parseDateKey(todayKey);
  const [displayYM, setDisplayYM] = useState(() => ({
    y: todayParsed?.y ?? new Date().getFullYear(),
    m: todayParsed?.m ?? new Date().getMonth() + 1,
  }));

  useEffect(() => {
    if (!visible) return;
    const p = parseDateKey(selectedDateKey);
    if (p) setDisplayYM({ y: p.y, m: p.m });
  }, [visible, selectedDateKey]);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const initial = expeditionFocusDateKey ?? todayKey;
      setSelectedDateKey(initial);
      const p = parseDateKey(initial);
      if (p) setDisplayYM({ y: p.y, m: p.m });
    }
    prevVisibleRef.current = visible;
  }, [visible, expeditionFocusDateKey, todayKey]);

  const isPastReadOnly = selectedDateKey < todayKey && selectedDateKey >= minSelectableKey;
  const completedNamesForSelected = completedHabitNamesByDate[selectedDateKey];

  const prevNavDisabled = useMemo(() => {
    const prevMonth = new Date(displayYM.y, displayYM.m - 2, 1);
    const py = prevMonth.getFullYear();
    const pm = prevMonth.getMonth() + 1;
    const pDim = daysInMonth(py, pm);
    const prevMonthLastKey = dateKeyFromYMD(py, pm, pDim);
    return prevMonthLastKey < minSelectableKey;
  }, [displayYM.y, displayYM.m, minSelectableKey]);

  const monthYearLabel = formatMonthYearLabel(displayYM.y, displayYM.m);

  const monthTimeline = useMemo(() => {
    const { y: viewY, m: viewM } = displayYM;
    const dim = daysInMonth(viewY, viewM);
    return Array.from({ length: dim }, (_, i) => {
      const d = i + 1;
      const key = dateKeyFromYMD(viewY, viewM, d);
      const dt = new Date(viewY, viewM - 1, d);
      const wk = dt.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
      return { key, label: `${wk} ${d}` };
    });
  }, [displayYM]);

  const monthGridCells = useMemo(
    () => buildMonthGridCells(displayYM.y, displayYM.m),
    [displayYM.y, displayYM.m],
  );

  const tasksForSelectedDate = useMemo(() => {
    const key = selectedDateKey;
    return habits.filter((h) => (h.scheduledDate ?? todayKey) === key);
  }, [habits, selectedDateKey, todayKey]);

  const orderedTasks = useMemo(
    () => applyPlanningOrderForDate(selectedDateKey, tasksForSelectedDate, planningDayOrderByDate),
    [tasksForSelectedDate, planningDayOrderByDate, selectedDateKey],
  );

  const [listData, setListData] = useState<Habit[]>(orderedTasks);
  useEffect(() => {
    setListData(orderedTasks);
  }, [orderedTasks]);

  const selectedIndexInMonth = useMemo(() => {
    const p = parseDateKey(selectedDateKey);
    if (!p || p.y !== displayYM.y || p.m !== displayYM.m) return 0;
    return Math.max(0, p.d - 1);
  }, [selectedDateKey, displayYM.y, displayYM.m]);

  useEffect(() => {
    if (!visible) return;
    const chip = CHIP_W + CHIP_GAP;
    const x = Math.max(0, selectedIndexInMonth * chip - timelineW / 2 + CHIP_W / 2);
    const t = requestAnimationFrame(() => timelineRef.current?.scrollTo({ x, animated: true }));
    return () => cancelAnimationFrame(t);
  }, [visible, selectedIndexInMonth, timelineW, selectedDateKey, displayYM.y, displayYM.m]);

  const shiftDisplayMonth = useCallback(
    (delta: number) => {
      const nd = new Date(displayYM.y, displayYM.m - 1 + delta, 1);
      const ny = nd.getFullYear();
      const nm = nd.getMonth() + 1;
      const pSel = parseDateKey(selectedDateKey);
      let day = 1;
      if (pSel && pSel.y === displayYM.y && pSel.m === displayYM.m) day = pSel.d;
      const dim = daysInMonth(ny, nm);
      const nextD = Math.min(Math.max(1, day), dim);
      let nextKey = dateKeyFromYMD(ny, nm, nextD);
      if (nextKey < minSelectableKey) {
        const pMin = parseDateKey(minSelectableKey);
        if (pMin && delta < 0) {
          setDisplayYM({ y: pMin.y, m: pMin.m });
          setSelectedDateKey(minSelectableKey);
          onExpeditionFocusDateKeyChange(minSelectableKey);
          impactAsync(ImpactFeedbackStyle.Light);
          return;
        }
      }
      setDisplayYM({ y: ny, m: nm });
      setSelectedDateKey(nextKey);
      onExpeditionFocusDateKeyChange(nextKey);
      impactAsync(ImpactFeedbackStyle.Light);
    },
    [displayYM, selectedDateKey, minSelectableKey, onExpeditionFocusDateKeyChange],
  );

  const addAllowed = selectedDateKey >= todayKey && selectedDateKey >= minSelectableKey;

  const handleCompleteToggle = useCallback(
    (habitId: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      const due = !habit.scheduledDate || habit.scheduledDate <= todayKey;
      if (!due) {
        Alert.alert("Not due yet", "This task is planned for a future date.");
        return;
      }
      if (habit.completedToday) uncompleteHabit(habitId);
      else completeHabit(habitId);
    },
    [habits, todayKey, completeHabit, uncompleteHabit],
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
        todayKey={todayKey}
        readOnly={false}
        onCompleteToggle={handleCompleteToggle}
        onDelete={removeHabit}
        onReschedule={(hh) => {
          setRescheduleHabit(hh);
          setRescheduleDateKey(hh.scheduledDate ?? null);
          setRescheduleOpen(true);
        }}
        drag={drag}
        isActive={isActive}
      />
    ),
    [todayKey, handleCompleteToggle, removeHabit],
  );

  const renderReadonlyItem = useCallback(
    ({ item }: { item: Habit }) => (
      <TaskRow
        habit={item}
        todayKey={todayKey}
        readOnly
        historicalCompleted={!!completedNamesForSelected?.includes(item.name)}
        onCompleteToggle={handleCompleteToggle}
        onDelete={removeHabit}
        onReschedule={() => {}}
        drag={() => {}}
        isActive={false}
      />
    ),
    [todayKey, completedNamesForSelected, handleCompleteToggle, removeHabit],
  );

  const renderReschedulePicker = useMemo(() => {
    const chips: { key: string | null; label: string }[] = [{ key: null, label: "No date (today)" }];
    const futureDays = 60;
    for (let i = 1; i <= futureDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0]!;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      chips.push({ key, label });
    }
    return chips;
  }, []);

  const onTimelineLayout = useCallback((e: LayoutChangeEvent) => {
    setTimelineW(e.nativeEvent.layout.width);
  }, []);

  const selectDayFromGrid = useCallback(
    (day: number) => {
      const key = dateKeyFromYMD(displayYM.y, displayYM.m, day);
      if (key < minSelectableKey) return;
      setSelectedDateKey(key);
      onExpeditionFocusDateKeyChange(key);
      setMonthExpanded(false);
      impactAsync(ImpactFeedbackStyle.Light);
    },
    [displayYM.y, displayYM.m, minSelectableKey, onExpeditionFocusDateKeyChange],
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
          {/* Module 1–2: header + expandable month */}
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

            <View style={styles.monthNav}>
              <Pressable
                onPress={() => shiftDisplayMonth(-1)}
                disabled={prevNavDisabled}
                style={({ pressed }) => [
                  styles.monthArrowBtn,
                  prevNavDisabled && styles.monthArrowBtnDisabled,
                  pressed && !prevNavDisabled && styles.monthArrowBtnPressed,
                ]}
                hitSlop={8}
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={20} color={prevNavDisabled ? Colors.dark.textMuted : Colors.dark.gold} />
              </Pressable>
              <Pressable
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setMonthExpanded((v) => !v);
                }}
                style={({ pressed }) => [styles.monthCenter, pressed && styles.monthCenterPressed]}
                accessibilityRole="button"
                accessibilityLabel={monthExpanded ? "Collapse calendar" : "Expand calendar"}
              >
                <Text style={styles.monthYearText}>{monthYearLabel}</Text>
                {monthExpanded ? (
                  <ChevronUp size={18} color={Colors.dark.gold} style={styles.monthChevron} />
                ) : (
                  <ChevronDown size={18} color={Colors.dark.gold} style={styles.monthChevron} />
                )}
              </Pressable>
              <Pressable
                onPress={() => shiftDisplayMonth(1)}
                style={({ pressed }) => [styles.monthArrowBtn, pressed && styles.monthArrowBtnPressed]}
                hitSlop={8}
                accessibilityLabel="Next month"
              >
                <ChevronRight size={20} color={Colors.dark.gold} />
              </Pressable>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.planningSubtitle}>Planning center</Text>

          {monthExpanded ? (
            <View style={styles.monthGridWrap}>
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

          {/* Module 3: horizontal timeline */}
          <View onLayout={onTimelineLayout}>
            <ScrollView
              ref={timelineRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineContent}
              style={styles.timelineScroll}
            >
              {monthTimeline.map((c) => {
                const active = c.key === selectedDateKey;
                const blocked = c.key < minSelectableKey;
                return (
                  <Pressable
                    key={c.key}
                    disabled={blocked}
                    onPress={() => {
                      if (blocked) return;
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSelectedDateKey(c.key);
                      onExpeditionFocusDateKeyChange(c.key);
                    }}
                    style={[
                      styles.timelineChip,
                      active && styles.timelineChipActive,
                      blocked && styles.timelineChipBlocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timelineChipText,
                        active && styles.timelineChipTextActive,
                        blocked && styles.timelineChipTextBlocked,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {!isPastReadOnly ? (
            <Text style={styles.reorderHint}>Long-press a row to drag and reorder quests for this day.</Text>
          ) : (
            <Text style={styles.reorderHint}>Past day — quests are read-only. Add reflections below.</Text>
          )}
        </View>

        {/* Module 4: draggable list (or read-only list for past days) */}
        {isPastReadOnly ? (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderReadonlyItem}
            style={styles.dragList}
            contentContainerStyle={styles.dragListContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nothing planned for this day.</Text>
                <Text style={styles.emptySub}>Reflections are still available below.</Text>
              </View>
            }
            ListFooterComponent={
              <View style={[styles.footerBlock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
            }
          />
        ) : (
          <DraggableFlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onDragEnd={onDragEnd}
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
          <Modal visible transparent animationType="fade" onRequestClose={() => setRescheduleOpen(false)}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setRescheduleOpen(false)}>
              <View style={styles.rescheduleBackdrop} />
            </Pressable>
            <View style={styles.rescheduleSheet}>
              <Text style={styles.rescheduleTitle}>Reschedule</Text>
              <Text style={styles.rescheduleSub}>{rescheduleHabit ? rescheduleHabit.name : ""}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 90 }}>
                <View style={styles.rescheduleRow}>
                  {renderReschedulePicker.map((c) => {
                    const active = c.key === rescheduleDateKey;
                    return (
                      <Pressable
                        key={c.key ?? "no_date"}
                        onPress={() => setRescheduleDateKey(c.key)}
                        style={[styles.rescheduleChip, active && styles.rescheduleChipActive]}
                      >
                        <Text style={[styles.rescheduleChipText, active && styles.rescheduleChipTextActive]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

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
                  <Text style={styles.rescheduleSaveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
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
  monthNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  monthArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface + "aa",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  monthArrowBtnPressed: {
    opacity: 0.88,
  },
  monthArrowBtnDisabled: {
    opacity: 0.35,
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
  planningSubtitle: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.6,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    marginBottom: 12,
  },
  monthGridWrap: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    backgroundColor: Colors.dark.surface + "99",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "33",
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
    aspectRatio: 1,
    maxHeight: 48,
  },
  gridCellBtn: {
    width: "14.28%",
    aspectRatio: 1,
    maxHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
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
  },
  gridCellTextSelected: {
    color: Colors.dark.gold,
  },
  gridCellTextBlocked: {
    color: Colors.dark.textMuted,
  },
  timelineScroll: {
    marginBottom: 8,
    maxHeight: 56,
  },
  timelineContent: {
    paddingVertical: 4,
    paddingRight: 16,
    gap: CHIP_GAP,
    flexDirection: "row",
    alignItems: "center",
  },
  timelineChip: {
    width: CHIP_W,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface + "cc",
    alignItems: "center",
  },
  timelineChipActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + "18",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  timelineChipText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
  },
  timelineChipTextActive: {
    color: Colors.dark.gold,
  },
  timelineChipBlocked: {
    opacity: 0.4,
  },
  timelineChipTextBlocked: {
    color: Colors.dark.textMuted,
  },
  reorderHint: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    marginBottom: 6,
    lineHeight: 16,
    paddingHorizontal: 8,
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
  dragHandle: {
    paddingRight: 6,
    paddingVertical: 4,
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
