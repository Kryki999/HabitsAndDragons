import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Lock } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import Colors from '@/constants/colors';
import { KINGDOM_PROGRESSION_STAGES } from '@/constants/kingdomVisuals';
import { getCastleTier } from '@/constants/kingdomTiers';

const COLUMNS = 3;
const COL_GAP = 8;
const ROW_GAP = 12;
const H_PAD = 16;

interface KingdomProgressionModalProps {
  visible: boolean;
  onClose: () => void;
  playerLevel: number;
}

function chunkStages<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default function KingdomProgressionModal({
  visible,
  onClose,
  playerLevel,
}: KingdomProgressionModalProps) {
  const { width } = useWindowDimensions();
  const modalMaxW = Math.min(width - 28, 440);

  const cellW = useMemo(() => {
    const inner = modalMaxW - H_PAD * 2;
    return (inner - COL_GAP * (COLUMNS - 1)) / COLUMNS;
  }, [modalMaxW]);

  const rows = useMemo(
    () => chunkStages(KINGDOM_PROGRESSION_STAGES, COLUMNS),
    [],
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxWidth: modalMaxW }]} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['#1e1628', '#120c1a', '#0a0710']}
            style={styles.sheetGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Kingdom Progression</Text>
              <Pressable
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onClose();
                }}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={22} color={Colors.dark.textMuted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {rows.map((row, rowIndex) => (
                <View
                  key={`row-${rowIndex}`}
                  style={[styles.gridRow, rowIndex < rows.length - 1 && { marginBottom: ROW_GAP }]}
                >
                  {[0, 1, 2].map((col) => {
                    const stage = row[col];
                    const marginRight = col < COLUMNS - 1 ? COL_GAP : 0;
                    return (
                      <View key={`${rowIndex}-${col}`} style={{ width: cellW, marginRight }}>
                        {stage ? (
                          <StageCell stage={stage} playerLevel={playerLevel} cellW={cellW} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StageCell({
  stage,
  playerLevel,
  cellW,
}: {
  stage: (typeof KINGDOM_PROGRESSION_STAGES)[number];
  playerLevel: number;
  cellW: number;
}) {
  const unlocked = playerLevel >= stage.unlockLevel;
  const tier = getCastleTier(stage.unlockLevel);
  const label = `${tier.emoji}`;

  const thumbSize = cellW;

  return (
    <View style={[styles.card, unlocked ? styles.cardUnlocked : styles.cardLocked, { width: cellW }]}>
      <View style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}>
        {stage.previewSource ? (
          <Image
            source={stage.previewSource}
            style={[styles.thumb, !unlocked && styles.thumbDimmed]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbPlaceholder, !unlocked && styles.thumbDimmed]} />
        )}
        {!unlocked ? (
          <View style={styles.lockOverlay}>
            <View style={styles.lockCircle}>
              <Lock size={16} color={Colors.dark.gold} strokeWidth={2.4} />
            </View>
          </View>
        ) : null}
      </View>
      <Text style={styles.stageEmoji} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.stageName} numberOfLines={2}>
        {tier.name}
      </Text>
      <Text style={styles.stageMeta}>Lv.{stage.unlockLevel}</Text>
      {!unlocked ? (
        <Text style={styles.unlockHint} numberOfLines={2}>
          Unlocks Lv.{stage.unlockLevel}
        </Text>
      ) : (
        <Text style={styles.unlockedHint}>Unlocked</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border + 'aa',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
      default: {},
    }),
  },
  sheetGradient: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '55',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface + 'cc',
    borderWidth: 1,
    borderColor: Colors.dark.border + '88',
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  cellOuter: {
    alignItems: 'center',
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    paddingBottom: 6,
  },
  cardUnlocked: {
    borderColor: Colors.dark.gold + '44',
    backgroundColor: Colors.dark.surface + 'aa',
  },
  cardLocked: {
    borderColor: Colors.dark.border + '66',
    backgroundColor: Colors.dark.background + 'ee',
  },
  thumbWrap: {
    backgroundColor: '#08060c',
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbDimmed: {
    opacity: 0.38,
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c0a12',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface + 'ee',
    borderWidth: 1,
    borderColor: Colors.dark.gold + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageEmoji: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  stageName: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
    minHeight: 22,
    lineHeight: 11,
  },
  stageMeta: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dark.gold,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  unlockHint: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.dark.textMuted,
    paddingHorizontal: 2,
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 10,
  },
  unlockedHint: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.dark.emerald,
    marginTop: 3,
    textAlign: 'center',
  },
});
