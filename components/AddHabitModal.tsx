import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { X, Swords, Zap, BookOpen, ChevronRight, Scroll, PenTool } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { StatType, TimeOfDay, SuggestedHabit } from '@/types/game';
import { suggestedHabits } from '@/mocks/suggestedHabits';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const STAT_OPTIONS: { value: StatType; label: string; color: string; icon: typeof Swords }[] = [
  { value: 'strength', label: 'Strength', color: Colors.dark.ruby, icon: Swords },
  { value: 'agility', label: 'Agility', color: Colors.dark.emerald, icon: Zap },
  { value: 'intelligence', label: 'Intelligence', color: Colors.dark.cyan, icon: BookOpen },
];

const TIME_OPTIONS: { value: TimeOfDay; label: string; emoji: string }[] = [
  { value: 'morning', label: 'Morning', emoji: '🌅' },
  { value: 'day', label: 'Day', emoji: '☀️' },
  { value: 'evening', label: 'Evening', emoji: '🌙' },
];

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onAddHabit: (habit: { name: string; description: string; stat: StatType; timeOfDay: TimeOfDay; icon: string }) => void;
}

type ModalView = 'choose' | 'suggested' | 'custom';

function SuggestedHabitItem({ habit, onSelect }: { habit: SuggestedHabit; onSelect: (h: SuggestedHabit) => void }) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const statOpt = STAT_OPTIONS.find(s => s.value === habit.stat)!;

  return (
    <Pressable
      onPressIn={() => Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressAnim, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }).start()}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
            <View style={[styles.suggestedStatBadge, { backgroundColor: statOpt.color + '18' }]}>
              <statOpt.icon size={10} color={statOpt.color} />
              <Text style={[styles.suggestedStatText, { color: statOpt.color }]}>+{statOpt.label.substring(0, 3).toUpperCase()}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.dark.textMuted} />
        </View>
        <View style={[styles.suggestedBottom, { backgroundColor: statOpt.color + '30' }]} />
      </Animated.View>
    </Pressable>
  );
}

export default function AddHabitModal({ visible, onClose, onAddHabit }: AddHabitModalProps) {
  const [view, setView] = useState<ModalView>('choose');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [selectedStat, setSelectedStat] = useState<StatType>('strength');
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>('morning');
  const [selectedIcon, setSelectedIcon] = useState('⚔️');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const ICON_OPTIONS = ['⚔️', '🛡️', '🏃', '📖', '🧠', '💪', '🎯', '🔥', '⭐', '🌟', '💎', '🏆'];

  useEffect(() => {
    if (visible) {
      setView('choose');
      setCustomName('');
      setCustomDesc('');
      setSelectedStat('strength');
      setSelectedTime('morning');
      setSelectedIcon('⚔️');
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const handleSelectSuggested = useCallback((habit: SuggestedHabit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAddHabit({
      name: habit.name,
      description: habit.description,
      stat: habit.stat,
      timeOfDay: habit.timeOfDay,
      icon: habit.icon,
    });
    handleClose();
  }, [onAddHabit, handleClose]);

  const handleCreateCustom = useCallback(() => {
    if (!customName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAddHabit({
      name: customName.trim(),
      description: customDesc.trim() || customName.trim(),
      stat: selectedStat,
      timeOfDay: selectedTime,
      icon: selectedIcon,
    });
    handleClose();
  }, [customName, customDesc, selectedStat, selectedTime, selectedIcon, onAddHabit, handleClose]);

  const renderChooseView = () => (
    <View style={styles.chooseContainer}>
      <Text style={styles.chooseTitle}>Forge a New Habit</Text>
      <Text style={styles.chooseSubtitle}>Choose your path, adventurer</Text>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
              <Text style={styles.pathTitle}>Custom Habit</Text>
              <Text style={styles.pathDesc}>Craft your own quest and choose its power</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textMuted} />
          </LinearGradient>
          <View style={[styles.pathBottom, { backgroundColor: Colors.dark.purple + '40' }]} />
        </View>
      </Pressable>
    </View>
  );

  const renderSuggestedView = () => {
    const morningHabits = suggestedHabits.filter(h => h.timeOfDay === 'morning');
    const dayHabits = suggestedHabits.filter(h => h.timeOfDay === 'day');
    const eveningHabits = suggestedHabits.filter(h => h.timeOfDay === 'evening');

    return (
      <ScrollView style={styles.suggestedContainer} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setView('choose')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>Suggested Quests</Text>

        <Text style={styles.timeGroupLabel}>🌅 Morning Rituals</Text>
        {morningHabits.map(h => (
          <SuggestedHabitItem key={h.name} habit={h} onSelect={handleSelectSuggested} />
        ))}

        <Text style={styles.timeGroupLabel}>☀️ Daytime Challenges</Text>
        {dayHabits.map(h => (
          <SuggestedHabitItem key={h.name} habit={h} onSelect={handleSelectSuggested} />
        ))}

        <Text style={styles.timeGroupLabel}>🌙 Evening Quests</Text>
        {eveningHabits.map(h => (
          <SuggestedHabitItem key={h.name} habit={h} onSelect={handleSelectSuggested} />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderCustomView = () => {
    const activeStat = STAT_OPTIONS.find(s => s.value === selectedStat)!;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.customContainer} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setView('choose')} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>Craft Your Quest</Text>

          <Text style={styles.fieldLabel}>Quest Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Drink 2L Water"
            placeholderTextColor={Colors.dark.textMuted}
            value={customName}
            onChangeText={setCustomName}
            testID="custom-habit-name"
          />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMulti]}
            placeholder="A short description of your quest..."
            placeholderTextColor={Colors.dark.textMuted}
            value={customDesc}
            onChangeText={setCustomDesc}
            multiline
            numberOfLines={2}
            testID="custom-habit-desc"
          />

          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map(icon => (
              <Pressable
                key={icon}
                onPress={() => setSelectedIcon(icon)}
                style={[
                  styles.iconOption,
                  selectedIcon === icon && { borderColor: activeStat.color, backgroundColor: activeStat.color + '15' },
                ]}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Stat Boost</Text>
          <View style={styles.statRow}>
            {STAT_OPTIONS.map(stat => (
              <Pressable
                key={stat.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedStat(stat.value);
                }}
                style={[
                  styles.statOption,
                  selectedStat === stat.value && { borderColor: stat.color, backgroundColor: stat.color + '15' },
                ]}
                testID={`stat-option-${stat.value}`}
              >
                <stat.icon size={18} color={selectedStat === stat.value ? stat.color : Colors.dark.textMuted} />
                <Text style={[
                  styles.statOptionText,
                  { color: selectedStat === stat.value ? stat.color : Colors.dark.textMuted },
                ]}>
                  {stat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Time of Day</Text>
          <View style={styles.statRow}>
            {TIME_OPTIONS.map(time => (
              <Pressable
                key={time.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedTime(time.value);
                }}
                style={[
                  styles.timeOption,
                  selectedTime === time.value && { borderColor: Colors.dark.gold, backgroundColor: Colors.dark.gold + '12' },
                ]}
                testID={`time-option-${time.value}`}
              >
                <Text style={styles.timeEmoji}>{time.emoji}</Text>
                <Text style={[
                  styles.timeOptionText,
                  { color: selectedTime === time.value ? Colors.dark.gold : Colors.dark.textMuted },
                ]}>
                  {time.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleCreateCustom}
            style={[styles.createBtn, !customName.trim() && styles.createBtnDisabled]}
            disabled={!customName.trim()}
            testID="create-custom-habit"
          >
            <LinearGradient
              colors={customName.trim() ? [...Colors.gradients.gold] : ['#333', '#333']}
              style={styles.createBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.createBtnText, !customName.trim() && { color: Colors.dark.textMuted }]}>
                Forge Quest
              </Text>
            </LinearGradient>
            <View style={[styles.createBtnBottom, { backgroundColor: customName.trim() ? Colors.dark.goldDark : '#222' }]} />
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
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={handleClose} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handleBar} />
          <Pressable onPress={handleClose} style={styles.closeBtn} testID="close-modal">
            <X size={20} color={Colors.dark.textSecondary} />
          </Pressable>

          {view === 'choose' && renderChooseView()}
          {view === 'suggested' && renderSuggestedView()}
          {view === 'custom' && renderCustomView()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.45,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
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
  closeBtn: {
    position: 'absolute' as const,
    top: 12,
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
  suggestedStatBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  suggestedStatText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
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
  statRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statOption: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  statOptionText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  timeOption: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  timeEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  timeOptionText: {
    fontSize: 12,
    fontWeight: '700' as const,
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
