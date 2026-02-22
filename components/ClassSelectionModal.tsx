import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Swords, Zap, BookOpen, Shield, Target, Wand2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { PlayerClass } from '@/types/game';

const { width } = Dimensions.get('window');

interface ClassOption {
  id: PlayerClass;
  name: string;
  title: string;
  description: string;
  statFocus: string;
  colors: readonly [string, string];
  accentColor: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  emoji: string;
}

const CLASSES: ClassOption[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    title: 'The Iron Vanguard',
    description: 'Masters of discipline and raw power. Warriors forge their bodies through relentless training.',
    statFocus: 'Strength',
    colors: ['#ff4d6a', '#cc2244'] as const,
    accentColor: Colors.dark.ruby,
    icon: Swords,
    emoji: '⚔️',
  },
  {
    id: 'hunter',
    name: 'Hunter',
    title: 'The Swift Shadow',
    description: 'Agile and precise. Hunters move through life with grace, speed, and deadly focus.',
    statFocus: 'Agility',
    colors: ['#3dd68c', '#28a06a'] as const,
    accentColor: Colors.dark.emerald,
    icon: Target,
    emoji: '🏹',
  },
  {
    id: 'mage',
    name: 'Mage',
    title: 'The Arcane Scholar',
    description: 'Seekers of knowledge and wisdom. Mages grow powerful through the mind and arcane study.',
    statFocus: 'Intelligence',
    colors: ['#45d4e8', '#2ba5b8'] as const,
    accentColor: Colors.dark.cyan,
    icon: Wand2,
    emoji: '🔮',
  },
];

function ClassCard({
  classOption,
  index,
  onSelect,
}: {
  classOption: ClassOption;
  index: number;
  onSelect: (cls: PlayerClass) => void;
}) {
  const entryAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300 + index * 150),
      Animated.spring(entryAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = useCallback(() => {
    Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }).start();
  }, []);

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  const Icon = classOption.icon;

  return (
    <Animated.View
      style={{
        opacity: entryAnim,
        transform: [
          { translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
        ],
      }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onSelect(classOption.id);
        }}
        testID={`class-select-${classOption.id}`}
      >
        <Animated.View style={[styles.classCard, { transform: [{ translateY }] }]}>
          <View style={[styles.classCardInner, { borderColor: classOption.accentColor + '40' }]}>
            <View style={styles.classCardRow}>
              <LinearGradient
                colors={[...classOption.colors]}
                style={styles.classIconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon size={28} color="#fff" />
              </LinearGradient>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{classOption.emoji} {classOption.name}</Text>
                <Text style={[styles.classTitle, { color: classOption.accentColor }]}>{classOption.title}</Text>
                <Text style={styles.classDesc} numberOfLines={2}>{classOption.description}</Text>
              </View>
            </View>
            <View style={[styles.classFocusBadge, { backgroundColor: classOption.accentColor + '15', borderColor: classOption.accentColor + '30' }]}>
              <Text style={[styles.classFocusText, { color: classOption.accentColor }]}>
                {classOption.statFocus} Focus
              </Text>
            </View>
          </View>
          <View style={[styles.classCardBottom, { backgroundColor: classOption.accentColor + '50' }]} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

interface ClassSelectionModalProps {
  visible: boolean;
  onSelect: (playerClass: PlayerClass) => void;
}

export default function ClassSelectionModal({ visible, onSelect }: ClassSelectionModalProps) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -6, duration: 2000, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient
          colors={['#0d0a14', '#1a1228', '#0d0a14']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={styles.orbDecor1} />
        <View style={styles.orbDecor2} />

        <Animated.View
          style={[
            styles.header,
            {
              opacity: titleAnim,
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <View style={styles.headerEmblem}>
            <LinearGradient
              colors={[...Colors.gradients.gold]}
              style={styles.headerEmblemGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Shield size={30} color="#1a1228" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Choose Your Path</Text>
          <Text style={styles.subtitle}>Select a class to begin your journey</Text>
        </Animated.View>

        <View style={styles.classList}>
          {CLASSES.map((cls, index) => (
            <ClassCard
              key={cls.id}
              classOption={cls}
              index={index}
              onSelect={onSelect}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  orbDecor1: {
    position: 'absolute' as const,
    top: '10%',
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.dark.gold + '06',
  },
  orbDecor2: {
    position: 'absolute' as const,
    bottom: '15%',
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.purple + '08',
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  headerEmblem: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden' as const,
  },
  headerEmblemGradient: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 6,
  },
  classList: {
    gap: 14,
  },
  classCard: {
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  classCardInner: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    padding: 16,
  },
  classCardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  classIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  classInfo: {
    flex: 1,
    marginLeft: 14,
  },
  className: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.dark.text,
  },
  classTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  classDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  classFocusBadge: {
    alignSelf: 'flex-start' as const,
    marginTop: 10,
    marginLeft: 70,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  classFocusText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  classCardBottom: {
    height: 5,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});
