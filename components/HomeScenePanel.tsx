import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw, Info } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/hapticsGate';
import Colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import KingdomProgressionModal from '@/components/KingdomProgressionModal';
import { getXPProgressInCurrentLevel } from '@/lib/playerLevel';
import {
  getBaseBackgroundForLevel,
  getArmoryBackgroundForLevel,
} from '@/constants/kingdomVisuals';

const HERO_BASE = require('@/assets/images/char_mage.png');

/** Panoramic frame: full image visible, no horizontal crop (letterboxing top/bottom if needed). */
const VIEW_ASPECT = 16 / 9;

type SceneMode = 'base' | 'armory';

type Props = {
  playerLevel: number;
  baseName: { emoji: string; name: string };
};

export default function HomeScenePanel({ playerLevel, baseName }: Props) {
  const { width } = useWindowDimensions();
  const strengthXP = useGameStore((s) => s.strengthXP);
  const agilityXP = useGameStore((s) => s.agilityXP);
  const intelligenceXP = useGameStore((s) => s.intelligenceXP);

  const { expCurrent, expNeeded, expProgress } = useMemo(() => {
    const total = strengthXP + agilityXP + intelligenceXP;
    const { current, needed } = getXPProgressInCurrentLevel(total);
    const progress = needed > 0 ? Math.min(1, current / needed) : 1;
    return { expCurrent: current, expNeeded: needed, expProgress: progress };
  }, [strengthXP, agilityXP, intelligenceXP]);

  const [mode, setMode] = useState<SceneMode>('base');
  const [progressionOpen, setProgressionOpen] = useState(false);
  const crossfade = useRef(new Animated.Value(1)).current;

  const baseSource = useMemo(() => getBaseBackgroundForLevel(playerLevel), [playerLevel]);
  const armorySource = useMemo(() => getArmoryBackgroundForLevel(playerLevel), [playerLevel]);

  const runCrossfade = useCallback(
    (next: SceneMode) => {
      Animated.timing(crossfade, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => {
        setMode(next);
        Animated.timing(crossfade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    },
    [crossfade],
  );

  const onToggle = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    runCrossfade(mode === 'base' ? 'armory' : 'base');
  }, [mode, runCrossfade]);

  const panelHeight = width / VIEW_ASPECT;
  const maxHeroHeight = panelHeight * 2;
  const heroWidth = Math.min(width * 0.6, maxHeroHeight / 1.28);

  return (
    <View style={[styles.wrap, { width }]}>
      <View style={[styles.sceneFrame, { width, aspectRatio: VIEW_ASPECT }]}>
        <Animated.View style={[styles.sceneLayer, { opacity: crossfade }]}>
          {mode === 'base' ? (
            <View style={StyleSheet.absoluteFill}>
              <Image source={baseSource} style={styles.panoramaImage} resizeMode="contain" />
            </View>
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <Image source={armorySource} style={styles.panoramaImage} resizeMode="contain" />
              <LinearGradient
                colors={['rgba(6,4,10,0.5)', 'transparent', 'rgba(4,2,8,0.75)']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={[styles.armoryHeroOnly, { paddingBottom: Math.max(16, panelHeight * 0.08) }]}>
                <View style={[styles.heroBlock, { width: heroWidth }]}>
                  <Image
                    source={HERO_BASE}
                    style={[styles.heroImage, { width: heroWidth, height: heroWidth * 1.28 }]}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        <View style={styles.sceneCornerActions} pointerEvents="box-none">
          <Pressable
            onPress={onToggle}
            style={({ pressed }) => [styles.cornerFab, pressed && styles.cornerFabPressed]}
            accessibilityRole="button"
            accessibilityLabel={mode === 'base' ? 'Switch to armory' : 'Switch to base'}
          >
            <LinearGradient
              colors={[Colors.dark.surfaceLight + 'f2', Colors.dark.surface + 'f0']}
              style={styles.cornerFabInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <RefreshCw size={17} color={Colors.dark.gold} strokeWidth={2.2} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={styles.sceneMetaFooter}>
        <View style={styles.titleHeaderRow}>
          <View style={styles.titleSideSpacer} />
          <View style={styles.titleStack}>
            <Text style={styles.levelLine}>Level {playerLevel}</Text>
            <Text style={styles.castleNameLine} numberOfLines={2}>
              {baseName.emoji} {baseName.name}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setProgressionOpen(true);
            }}
            style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Kingdom progression"
          >
            <Info size={17} color={Colors.dark.gold} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.expBarOuter}>
          <View style={styles.expBarTrack}>
            <LinearGradient
              colors={[...Colors.gradients.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.expBarFill,
                {
                  width: `${expProgress * 100}%`,
                  minWidth: expProgress > 0 && expNeeded > 0 ? 3 : 0,
                },
              ]}
            />
            <Text style={styles.expOnBar} numberOfLines={1}>
              {expNeeded > 0
                ? `${Math.floor(expCurrent)} / ${Math.floor(expNeeded)}`
                : 'MAX LEVEL'}
            </Text>
          </View>
        </View>
      </View>

      <KingdomProgressionModal
        visible={progressionOpen}
        onClose={() => setProgressionOpen(false)}
        playerLevel={playerLevel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 0,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '88',
    backgroundColor: Colors.dark.background,
  },
  sceneFrame: {
    backgroundColor: '#07060c',
    overflow: 'hidden',
    position: 'relative',
  },
  sceneLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  panoramaImage: {
    width: '100%',
    height: '100%',
  },
  sceneMetaFooter: {
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border + '55',
  },
  titleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
    marginBottom: 14,
  },
  titleSideSpacer: {
    width: 38,
    height: 38,
  },
  titleStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  levelLine: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.dark.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  castleNameLine: {
    marginTop: 6,
    fontSize: 19,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  expBarOuter: {
    width: '78%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  expBarTrack: {
    position: 'relative',
    width: '100%',
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border + '99',
    justifyContent: 'center',
  },
  expBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  expOnBar: {
    width: '100%',
    textAlign: 'center',
    lineHeight: 38,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    color: '#f5f0ff',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    zIndex: 2,
  },
  infoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.dark.gold + '55',
    backgroundColor: Colors.dark.surface + 'dd',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  armoryHeroOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  heroBlock: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heroImage: {
    marginBottom: -50,
  },
  sceneCornerActions: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 40,
    alignItems: 'flex-start',
    gap: 8,
  },
  cornerFab: {
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.gold + '55',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  cornerFabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  cornerFabInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
