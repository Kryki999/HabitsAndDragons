import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronRight, Scroll, PenTool } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { StatType, SuggestedHabit, TaskType } from '@/types/game';
import type { OracleTaskStatWeights } from '@/types/oracle';
import { suggestedHabits } from '@/mocks/suggestedHabits';
import { AIStatService } from '@/services/aiStatService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Approximate chip width: minWidth(92) + gap(10) between chips
const CHIP_W = 102;

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  initialScheduledDateKey?: string | null;
  onAddHabit: (habit: {
    name: string;
    description: string;
    stat: StatType;
    taskType: TaskType;
    icon: string;
    scheduledDate?: string | null;
    oracleStatWeights?: OracleTaskStatWeights;
  }) => void;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function dateKeyFromOffsetDays(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

type ModalView = 'choose' | 'suggested' | 'custom';

function SuggestedHabitItem({ habit, onSelect }: { habit: SuggestedHabit; onSelect: (h: SuggestedHabit) => void }) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  return (
    <Pressable
      onPressIn={() => Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressAnim, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }).start()}
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Heavy);
        onSelect(habit);
      }}
      testID={`suggested-habit-${habit.name}`}
    >
      <Animated.View style={[
        styles.suggestedCard,
        {
          transform: [{ translateY: pressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }],
        },
      ]}>
        <View style={styles.suggestedCardInner}>
          <Text style={styles.suggestedIcon}>{habit.icon}</Text>
          <View style={styles.suggestedInfo}>
            <Text style={styles.suggestedName}>{habit.name}</Text>
            <Text style={styles.suggestedDesc} numberOfLines={2}>{habit.rpgDescription}</Text>
          </View>
          <ChevronRight size={18} color={Colors.dark.textMuted} />
        </View>
        <View style={[styles.suggestedBottom, { backgroundColor: Colors.dark.gold + '30' }]} />
      </Animated.View>
    </Pressable>
  );
}

export default function AddHabitModal({ visible, onClose, onAddHabit, initialScheduledDateKey }: AddHabitModalProps) {
  const [view, setView] = useState<ModalView>('choose');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('daily');
  const [selectedIcon, setSelectedIcon] = useState('⚔️');
  const [selectedScheduledDateKey, setSelectedScheduledDateKey] = useState<string | null>(initialScheduledDateKey ?? null);
  const [oracleBusy, setOracleBusy] = useState(false);
  const scheduleScrollRef = useRef<ScrollView>(null);

  const ICON_OPTIONS = ['⚔️', '🛡️', '🏃', '📖', '🧠', '💪', '🎯', '🔥', '⭐', '🌟', '💎', '🏆'];

  const todayKey = useMemo(() => getTodayKey(), []);
  const scheduleChips = useMemo(() => {
    // scheduledDate is optional; `null` => due today (including overdue).
    const maxDays = 60;
    return [
      { key: null as string | null, label: 'No date', sub: 'Due today' },
      ...Array.from({ length: maxDays }, (_, i) => {
        const offsetDays = i + 1;
        const key = dateKeyFromOffsetDays(offsetDays);
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { key, label };
      }),
    ];
  }, [todayKey]);

  const renderSchedulePicker = () => (
    <View style={styles.scheduleWrap}>
      <Text style={styles.scheduleLabel}>Plan date</Text>
      <ScrollView ref={scheduleScrollRef} horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.scheduleRow}>
          {scheduleChips.map((c) => {
            const isActive = c.key === selectedScheduledDateKey;
            return (
              <Pressable
                key={c.key ?? 'no_date'}
                onPress={() => setSelectedScheduledDateKey(c.key)}
                style={[styles.scheduleChip, isActive && styles.scheduleChipActive]}
              >
                <Text style={[styles.scheduleChipText, isActive && styles.scheduleChipTextActive]}>
                  {c.label}
                </Text>
                {'sub' in c && c.sub ? <Text style={styles.scheduleChipSub}>{c.sub}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  useEffect(() => {
    if (visible) {
      setView('choose');
      setCustomName('');
      setCustomDesc('');
      setSelectedTaskType('daily');
      setSelectedIcon('⚔️');
      const todayKey = getTodayKey();
      setSelectedScheduledDateKey(
        initialScheduledDateKey && initialScheduledDateKey === todayKey ? null : (initialScheduledDateKey ?? null),
      );
    }
  }, [visible, initialScheduledDateKey]);

  // Auto-scroll the date-picker to the pre-selected date whenever
  // the schedule picker becomes visible (suggested / custom views).
  useEffect(() => {
    if (view === 'choose' || !selectedScheduledDateKey) return;
    const idx = scheduleChips.findIndex((c) => c.key === selectedScheduledDateKey);
    if (idx <= 0) return;
    // Center the selected chip: left edge of chip - half viewport + half chip
    const x = Math.max(0, idx * CHIP_W - SCREEN_WIDTH / 2 + CHIP_W / 2);
    // Small delay so the ScrollView has finished its layout pass
    const t = setTimeout(() => {
      scheduleScrollRef.current?.scrollTo({ x, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [view, selectedScheduledDateKey, scheduleChips]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelectSuggested = useCallback((habit: SuggestedHabit) => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    onAddHabit({
      name: habit.name,
      description: habit.description,
      stat: habit.stat,
      taskType: habit.taskType,
      icon: habit.icon,
      scheduledDate: selectedScheduledDateKey ?? null,
    });
    handleClose();
  }, [onAddHabit, handleClose, selectedScheduledDateKey]);

  const handleCreateCustom = useCallback(async () => {
    if (!customName.trim() || oracleBusy) return;
    impactAsync(ImpactFeedbackStyle.Heavy);
    setOracleBusy(true);
    try {
      const oracle = await AIStatService.analyzeTask(customName.trim(), customDesc.trim() || customName.trim());
      onAddHabit({
        name: customName.trim(),
        description: customDesc.trim() || customName.trim(),
        stat: oracle.gameStat,
        taskType: selectedTaskType,
        icon: selectedIcon,
        scheduledDate: selectedScheduledDateKey ?? null,
        oracleStatWeights: oracle.weights,
      });
      handleClose();
    } finally {
      setOracleBusy(false);
    }
  }, [
    customName,
    customDesc,
    selectedTaskType,
    selectedIcon,
    onAddHabit,
    handleClose,
    selectedScheduledDateKey,
    oracleBusy,
  ]);

  const renderChooseView = () => (
    <View style={styles.chooseContainer}>
      <Text style={styles.chooseTitle}>Forge a New Habit</Text>
      <Text style={styles.chooseSubtitle}>Choose your path, adventurer</Text>

      <Pressable
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Heavy);
          setView('suggested');
        }}
        testID="choose-suggested"
      >
        <View style={styles.pathCard}>
          <LinearGradient
            colors={['#2a1f3d', '#362a50']}
            style={styles.pathCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={[styles.pathIconWrap, { backgroundColor: Colors.dark.gold + '18' }]}>
              <Scroll size={28} color={Colors.dark.gold} />
            </View>
            <View style={styles.pathInfo}>
              <Text style={styles.pathTitle}>Suggested Quests</Text>
              <Text style={styles.pathDesc}>Choose from curated habits with RPG wisdom</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textMuted} />
          </LinearGradient>
          <View style={[styles.pathBottom, { backgroundColor: Colors.dark.gold + '40' }]} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Heavy);
          setView('custom');
        }}
        testID="choose-custom"
      >
        <View style={styles.pathCard}>
          <LinearGradient
            colors={['#1a2028', '#253040']}
            style={styles.pathCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={[styles.pathIconWrap, { backgroundColor: Colors.dark.purple + '18' }]}>
              <PenTool size={28} color={Colors.dark.purple} />
            </View>
            <View style={styles.pathInfo}>
              <Text style={styles.pathTitle}>Custom Quest</Text>
              <Text style={styles.pathDesc}>Craft your own quest</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textMuted} />
          </LinearGradient>
          <View style={[styles.pathBottom, { backgroundColor: Colors.dark.purple + '40' }]} />
        </View>
      </Pressable>
    </View>
  );

  const renderSuggestedView = () => {
    const dailyHabits = suggestedHabits.filter(h => h.taskType === 'daily');
    const quickQuests = suggestedHabits.filter(h => h.taskType === 'one-off');

    return (
      <ScrollView style={styles.suggestedContainer} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setView('choose')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        {renderSchedulePicker()}
        <Text style={styles.sectionTitle}>Suggested Quests</Text>

        <Text style={styles.timeGroupLabel}>🔁 Daily Habits</Text>
        {dailyHabits.map(h => (
          <SuggestedHabitItem key={h.name} habit={h} onSelect={handleSelectSuggested} />
        ))}

        <Text style={styles.timeGroupLabel}>🎯 Quick Quests</Text>
        {quickQuests.map(h => (
          <SuggestedHabitItem key={h.name} habit={h} onSelect={handleSelectSuggested} />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderCustomView = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.customContainer} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setView('choose')} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          {renderSchedulePicker()}
          <Text style={styles.sectionTitle}>Craft Your Quest</Text>

          <View style={styles.taskTypeSwitch}>
            <Pressable
              onPress={() => setSelectedTaskType('daily')}
              style={[styles.taskTypeBtn, selectedTaskType === 'daily' && styles.taskTypeBtnActive]}
            >
              <Text style={[styles.taskTypeText, selectedTaskType === 'daily' && styles.taskTypeTextActive]}>🔁 Daily Habit</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTaskType('one-off')}
              style={[styles.taskTypeBtn, selectedTaskType === 'one-off' && styles.taskTypeBtnActive]}
            >
              <Text style={[styles.taskTypeText, selectedTaskType === 'one-off' && styles.taskTypeTextActive]}>🎯 One-off Quest</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Quest Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Drink 2L Water"
            placeholderTextColor={Colors.dark.textMuted}
            value={customName}
            onChangeText={setCustomName}
            testID="custom-habit-name"
          />

          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map(icon => (
              <Pressable
                key={icon}
                onPress={() => setSelectedIcon(icon)}
                style={[
                  styles.iconOption,
                  selectedIcon === icon && { borderColor: Colors.dark.gold, backgroundColor: Colors.dark.gold + '15' },
                ]}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => void handleCreateCustom()}
            style={[
              styles.createBtn,
              (!customName.trim() || oracleBusy) && styles.createBtnDisabled,
            ]}
            disabled={!customName.trim() || oracleBusy}
            testID="create-custom-habit"
          >
            <LinearGradient
              colors={
                customName.trim() && !oracleBusy ? [...Colors.gradients.gold] : ['#333', '#333']
              }
              style={styles.createBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {oracleBusy ? (
                <View style={styles.oracleRow}>
                  <ActivityIndicator color={Colors.dark.gold} size="small" />
                  <Text style={[styles.createBtnText, { color: Colors.dark.text }]}>
                    Consulting the Oracle…
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.createBtnText,
                    !customName.trim() && { color: Colors.dark.textMuted },
                  ]}
                >
                  Forge Quest
                </Text>
              )}
            </LinearGradient>
            <View
              style={[
                styles.createBtnBottom,
                { backgroundColor: customName.trim() && !oracleBusy ? Colors.dark.goldDark : '#222' },
              ]}
            />
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {view === 'choose' ? (
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={handleClose} />
          <View style={styles.chooseSheet}>
            <View style={styles.handleBar} />
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtnSheet, pressed && styles.closeBtnPressed]}
              testID="close-modal"
            >
              <X size={18} color={Colors.dark.textSecondary} />
            </Pressable>
            {renderChooseView()}
          </View>
        </View>
      ) : (
        <View style={styles.fullSheet}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            testID="close-modal"
          >
            <X size={20} color={Colors.dark.textSecondary} />
          </Pressable>
          {view === 'suggested' && renderSuggestedView()}
          {view === 'custom' && renderCustomView()}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Bottom-sheet overlay (choose view)
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  chooseSheet: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
    zIndex: 2,
    elevation: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.dark.textMuted,
    borderRadius: 2,
    alignSelf: 'center' as const,
    marginTop: 10,
    marginBottom: 6,
  },
  closeBtnSheet: {
    position: 'absolute' as const,
    top: 10,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border + '88',
  },
  closeBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  fullSheet: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: Platform.OS === 'ios' ? 52 : 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  closeBtn: {
    position: 'absolute' as const,
    top: Platform.OS === 'ios' ? 52 : 28,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },
  chooseContainer: {
    padding: 20,
    paddingTop: 10,
  },
  chooseTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  chooseSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  pathCard: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.border,
  },
  pathCardGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 18,
  },
  pathIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pathInfo: {
    flex: 1,
    marginLeft: 14,
  },
  pathTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 3,
  },
  pathDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  pathBottom: {
    height: 4,
  },
  backBtn: {
    marginBottom: 8,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.gold,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  taskTypeSwitch: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 14,
  },
  taskTypeBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
  },
  taskTypeBtnActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + '15',
  },
  taskTypeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.dark.textMuted,
    textAlign: 'center' as const,
  },
  taskTypeTextActive: {
    color: Colors.dark.gold,
  },
  timeGroupLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 10,
    marginTop: 6,
  },
  suggestedContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  suggestedCard: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  suggestedCardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
  },
  suggestedIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  suggestedInfo: {
    flex: 1,
  },
  suggestedName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 3,
  },
  suggestedDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  suggestedBottom: {
    height: 3,
  },
  customContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  textInputMulti: {
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  iconGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconOptionText: {
    fontSize: 20,
  },
  scheduleWrap: {
    marginTop: 0,
    marginBottom: 16,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  scheduleRow: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingBottom: 6,
  },
  scheduleChip: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 92,
  },
  scheduleChipActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + '12',
  },
  scheduleChipText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.dark.text,
  },
  scheduleChipTextActive: {
    color: Colors.dark.gold,
  },
  scheduleChipSub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  createBtn: {
    borderRadius: 14,
    overflow: 'hidden' as const,
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  oracleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  createBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#1a1228',
    letterSpacing: 0.5,
  },
  createBtnBottom: {
    height: 4,
  },
});
