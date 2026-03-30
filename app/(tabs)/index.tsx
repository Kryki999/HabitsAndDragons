import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Pressable,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { CalendarClock, ScrollText, SlidersHorizontal, GripVertical } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import Colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { StatType, TaskType, type Habit } from '@/types/game';
import HabitCard from '@/components/HabitCard';
import AddHabitModal from '@/components/AddHabitModal';
import HomeScenePanel from '@/components/HomeScenePanel';
import BackpackModal from '@/components/BackpackModal';
import ActivityChroniclesModal from '@/components/ActivityChroniclesModal';
import ExpeditionCalendarModal from '@/components/ExpeditionCalendarModal';
import TaskSortBottomSheet from '@/components/TaskSortBottomSheet';
import { getCastleTier } from '@/constants/kingdomTiers';
import { orderDueHabitsForCastle } from '@/lib/castleQuestOrder';
import { applyPlanningOrderForDate } from '@/lib/planningDayOrder';
import { useAuth } from '@/providers/AuthProvider';

export default function CastleScreen() {
  const { user, profileCreatedAtDateKey } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [chroniclesOpen, setChroniclesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expeditionFocusDateKey, setExpeditionFocusDateKey] = useState<string | null>(null);

  const {
    habits,
    activityByDate,
    completedHabitNamesByDate,
    getPlayerLevel,
    completeHabit,
    uncompleteHabit,
    addHabit,
    removeHabit,
    castleQuestSortMode,
    castleQuestOrderIds,
    setCastleQuestOrderIds,
    planningDayOrderByDate,
  } = useGameStore();

  const playerLevel = getPlayerLevel();
  const castleTier = getCastleTier(playerLevel);

  const castleScaleAnim = useRef(new Animated.Value(0.8)).current;
  const listHeaderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(castleScaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(listHeaderAnim, { toValue: 1, duration: 420, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [castleScaleAnim, listHeaderAnim]);

  const handleAddHabit = useCallback(
    (habit: {
      name: string;
      description: string;
      stat: StatType;
      taskType: TaskType;
      icon: string;
      scheduledDate?: string | null;
    }) => {
      addHabit(habit);
    },
    [addHabit],
  );

  const handleComplete = useCallback(
    (id: string) => {
      completeHabit(id);
    },
    [completeHabit],
  );

  const handleUncomplete = useCallback(
    (id: string) => {
      uncompleteHabit(id);
    },
    [uncompleteHabit],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeHabit(id);
    },
    [removeHabit],
  );

  const activeHabits = useMemo(() => habits.filter((h) => h.isActive), [habits]);
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  // Fall back to todayKey while profile is still loading, so past days stay blocked.
  const minAccountKey = profileCreatedAtDateKey ?? todayKey;
  const effectiveKey = expeditionFocusDateKey ?? todayKey;
  const isCalendarFocusDay = expeditionFocusDateKey !== null;
  const isPastCastleView =
    expeditionFocusDateKey !== null &&
    expeditionFocusDateKey < todayKey &&
    expeditionFocusDateKey >= minAccountKey;

  const handleExpeditionFocusChange = useCallback(
    (key: string) => {
      setExpeditionFocusDateKey(key === todayKey ? null : key);
    },
    [todayKey],
  );

  const dueHabits = useMemo(() => {
    if (!isCalendarFocusDay) {
      return activeHabits.filter((h) => !h.scheduledDate || h.scheduledDate <= todayKey);
    }
    return activeHabits.filter((h) => (h.scheduledDate ?? todayKey) === effectiveKey);
  }, [activeHabits, todayKey, isCalendarFocusDay, effectiveKey]);

  const orderedDueHabits = useMemo(() => {
    const base = orderDueHabitsForCastle(dueHabits, habits, castleQuestSortMode, castleQuestOrderIds);
    if (!isCalendarFocusDay) return base;
    return applyPlanningOrderForDate(effectiveKey, base, planningDayOrderByDate);
  }, [
    dueHabits,
    habits,
    castleQuestSortMode,
    castleQuestOrderIds,
    isCalendarFocusDay,
    effectiveKey,
    planningDayOrderByDate,
  ]);

  const completedNamesForFocusedDay = completedHabitNamesByDate?.[effectiveKey];

  const habitsDaily = useMemo(
    () => orderedDueHabits.filter((h) => h.taskType === 'daily'),
    [orderedDueHabits],
  );
  const habitsSide = useMemo(
    () => orderedDueHabits.filter((h) => h.taskType === 'one-off'),
    [orderedDueHabits],
  );

  const [dragQuestData, setDragQuestData] = useState<Habit[]>(orderedDueHabits);
  useEffect(() => {
    setDragQuestData(orderedDueHabits);
  }, [orderedDueHabits]);

  const completedCount = useMemo(() => dueHabits.filter((h) => h.completedToday).length, [dueHabits]);
  const totalCount = dueHabits.length;

  const isCustomQuestOrder = castleQuestSortMode === 'custom' && totalCount > 0 && !isPastCastleView;

  const progressLabel =
    totalCount > 0
      ? `${completedCount}/${totalCount} Quests completed`
      : `${completedCount}/0 Quests completed`;

  const onQuestDragEnd = useCallback(
    ({ data }: { data: Habit[] }) => {
      setDragQuestData(data);
      setCastleQuestOrderIds(data.map((h) => h.id));
      impactAsync(ImpactFeedbackStyle.Light);
    },
    [setCastleQuestOrderIds],
  );

  const renderDraggableQuest = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => (
      <ScaleDecorator>
        <TouchableOpacity
          activeOpacity={0.92}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={180}
          style={isActive ? styles.dragRowActive : undefined}
        >
          <View style={[styles.dragRowWrap, styles.dragRowPadded]}>
            <View style={styles.dragHandle}>
              <GripVertical size={18} color={Colors.dark.textMuted} strokeWidth={2} />
            </View>
            <View style={styles.dragCardFlex}>
              <HabitCard
                habit={item}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onDelete={handleRemove}
                readOnly={isPastCastleView}
                historicalCompleted={!!completedNamesForFocusedDay?.includes(item.name)}
              />
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [handleComplete, handleUncomplete, handleRemove, isPastCastleView, completedNamesForFocusedDay],
  );

  return (
    <View style={styles.container}>
      <View style={styles.mainColumn}>
        {isCustomQuestOrder ? (
          <DraggableFlatList
            data={dragQuestData}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableQuest}
            onDragEnd={onQuestDragEnd}
            activationDistance={6}
            containerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
            ListHeaderComponent={
              <>
                <Animated.View style={{ transform: [{ scale: castleScaleAnim }] }}>
                  <HomeScenePanel
                    playerLevel={playerLevel}
                    baseName={{ emoji: castleTier.emoji, name: castleTier.name }}
                    onPressBackpack={() => setBackpackOpen(true)}
                  />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.taskCommandHeader,
                    {
                      opacity: listHeaderAnim,
                      transform: [
                        {
                          translateY: listHeaderAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.taskHeaderLead}>
                    <Pressable
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        setCalendarOpen(true);
                      }}
                      style={({ pressed }) => [styles.taskIconBtn, pressed && styles.taskIconBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Expedition calendar"
                    >
                      <CalendarClock size={20} color={Colors.dark.gold} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                  <View style={styles.taskHeaderCenter}>
                    <Text style={styles.taskProgressText} numberOfLines={2}>
                      {progressLabel}
                    </Text>
                  </View>
                  <View style={styles.taskHeaderTail}>
                    <Pressable
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        setChroniclesOpen(true);
                      }}
                      style={({ pressed }) => [styles.taskIconBtn, pressed && styles.taskIconBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Chronicles"
                    >
                      <ScrollText size={20} color={Colors.dark.emerald} strokeWidth={2.2} />
                    </Pressable>
                    {!isPastCastleView ? (
                      <Pressable
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          setSortMenuOpen(true);
                        }}
                        style={({ pressed }) => [styles.taskIconBtn, pressed && styles.taskIconBtnPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Sort quests"
                      >
                        <SlidersHorizontal size={20} color={Colors.dark.textSecondary} strokeWidth={2.2} />
                      </Pressable>
                    ) : (
                      <View style={styles.taskIconBtn} />
                    )}
                  </View>
                </Animated.View>
              </>
            }
            ListFooterComponent={
              !isPastCastleView ? (
                <View style={styles.customFooter}>
                  <Pressable
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Heavy);
                      setModalVisible(true);
                    }}
                    style={({ pressed }) => [
                      styles.addQuestCard,
                      styles.addQuestCardCustomAligned,
                      pressed && styles.addQuestCardPressed,
                    ]}
                    testID="add-habit-inline-card-custom"
                    accessibilityRole="button"
                    accessibilityLabel="Add new quest"
                  >
                    <Text style={styles.addQuestCardTitle}>Add new quest</Text>
                    <Text style={styles.addQuestCardSub}>Forge a new habit or side quest for your realm.</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ height: 20 }} />
              )
            }
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View style={{ transform: [{ scale: castleScaleAnim }] }}>
              <HomeScenePanel
                playerLevel={playerLevel}
                baseName={{ emoji: castleTier.emoji, name: castleTier.name }}
                onPressBackpack={() => setBackpackOpen(true)}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.taskCommandHeader,
                {
                  opacity: listHeaderAnim,
                  transform: [
                    {
                      translateY: listHeaderAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.taskHeaderLead}>
                <Pressable
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setCalendarOpen(true);
                  }}
                  style={({ pressed }) => [styles.taskIconBtn, pressed && styles.taskIconBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Expedition calendar"
                >
                  <CalendarClock size={20} color={Colors.dark.gold} strokeWidth={2.2} />
                </Pressable>
              </View>
              <View style={styles.taskHeaderCenter}>
                <Text style={styles.taskProgressText} numberOfLines={2}>
                  {progressLabel}
                </Text>
              </View>
              <View style={styles.taskHeaderTail}>
                <Pressable
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setChroniclesOpen(true);
                  }}
                  style={({ pressed }) => [styles.taskIconBtn, pressed && styles.taskIconBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Chronicles"
                >
                  <ScrollText size={20} color={Colors.dark.emerald} strokeWidth={2.2} />
                </Pressable>
                {!isPastCastleView ? (
                  <Pressable
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSortMenuOpen(true);
                    }}
                    style={({ pressed }) => [styles.taskIconBtn, pressed && styles.taskIconBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Sort quests"
                  >
                    <SlidersHorizontal size={20} color={Colors.dark.textSecondary} strokeWidth={2.2} />
                  </Pressable>
                ) : (
                  <View style={styles.taskIconBtn} />
                )}
              </View>
            </Animated.View>

            <View style={styles.habitsSection}>
              {totalCount === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>⚔️</Text>
                  <Text style={styles.emptyTitle}>No quests yet</Text>
                  <Text style={styles.emptyDesc}>Tap Add new quest to create your first habit or side quest</Text>
                </View>
              ) : (
                <>
                  <View style={styles.taskSection}>
                    <View style={styles.taskSectionHeaderRow}>
                      <View style={styles.taskSectionAccent} />
                      <Text style={styles.taskSectionTitle}>Habits</Text>
                      <View style={styles.taskSectionLine} />
                    </View>
                    {habitsDaily.length === 0 ? (
                      <Text style={styles.taskSectionEmpty}>No habits due today</Text>
                    ) : (
                      habitsDaily.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          onComplete={handleComplete}
                          onUncomplete={handleUncomplete}
                          onDelete={handleRemove}
                          readOnly={isPastCastleView}
                          historicalCompleted={!!completedNamesForFocusedDay?.includes(habit.name)}
                        />
                      ))
                    )}
                  </View>

                  <View style={styles.taskSectionSpacer} />

                  <View style={styles.taskSection}>
                    <View style={styles.taskSectionHeaderRow}>
                      <View style={styles.taskSectionAccent} />
                      <Text style={styles.taskSectionTitle}>Side quests</Text>
                      <View style={styles.taskSectionLine} />
                    </View>
                    {habitsSide.length === 0 ? (
                      <Text style={styles.taskSectionEmpty}>No side quests due today</Text>
                    ) : (
                      habitsSide.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          onComplete={handleComplete}
                          onUncomplete={handleUncomplete}
                          onDelete={handleRemove}
                          readOnly={isPastCastleView}
                          historicalCompleted={!!completedNamesForFocusedDay?.includes(habit.name)}
                        />
                      ))
                    )}
                  </View>
                </>
              )}
              {!isPastCastleView ? (
                <Pressable
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Heavy);
                    setModalVisible(true);
                  }}
                  style={({ pressed }) => [styles.addQuestCard, pressed && styles.addQuestCardPressed]}
                  testID="add-habit-inline-card"
                  accessibilityRole="button"
                  accessibilityLabel="Add new quest"
                >
                  <Text style={styles.addQuestCardTitle}>Add new quest</Text>
                  <Text style={styles.addQuestCardSub}>Forge a new habit or side quest for your realm.</Text>
                </Pressable>
              ) : null}
              <View style={{ height: isPastCastleView ? 220 : 36 }} />
            </View>
          </ScrollView>
        )}
      </View>

      <AddHabitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddHabit={handleAddHabit}
      />

      <BackpackModal visible={backpackOpen} onClose={() => setBackpackOpen(false)} />

      <ActivityChroniclesModal
        visible={chroniclesOpen}
        onClose={() => setChroniclesOpen(false)}
        activityByDate={activityByDate ?? {}}
        completedHabitNamesByDate={completedHabitNamesByDate ?? {}}
      />

      <ExpeditionCalendarModal
        visible={calendarOpen}
        onClose={() => {
          setCalendarOpen(false);
          setExpeditionFocusDateKey(null);
        }}
        expeditionFocusDateKey={expeditionFocusDateKey}
        onExpeditionFocusDateKeyChange={handleExpeditionFocusChange}
        profileCreatedAtDateKey={profileCreatedAtDateKey}
        userId={user?.id ?? null}
      />

      <TaskSortBottomSheet visible={sortMenuOpen} onClose={() => setSortMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  mainColumn: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  draggableQuestList: {
    flex: 1,
    minHeight: 120,
  },
  draggableQuestListInline: {
    minHeight: 120,
    marginTop: 4,
  },
  draggableQuestListInner: {
    flex: 1,
  },
  draggableQuestListContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  draggableQuestListContentInline: {
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  dragRowActive: {
    opacity: 0.95,
  },
  dragRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragRowPadded: {
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    opacity: 0.7,
  },
  dragCardFlex: {
    flex: 1,
  },
  taskCommandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 18,
    gap: 8,
  },
  taskHeaderLead: {
    width: 44,
    flexShrink: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  taskHeaderCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  taskHeaderTail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 0,
    width: 88,
  },
  taskProgressText: {
    width: '100%',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  taskIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border + 'aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  habitsSection: {
    paddingHorizontal: 20,
  },
  taskSection: {
    marginTop: 4,
  },
  taskSectionSpacer: {
    height: 22,
  },
  taskSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  taskSectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.dark.gold + 'cc',
  },
  taskSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  taskSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border + 'aa',
  },
  taskSectionEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  addQuestCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + '66',
    backgroundColor: Colors.dark.gold + '14',
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addQuestCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  addQuestCardCustomAligned: {
    marginLeft: 28,
  },
  customFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  addQuestCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark.gold,
    letterSpacing: 0.2,
  },
  addQuestCardSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
  },
});
