import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useGameStore } from '@/store/gameStore';
import { DRAGON_CONFIGS, GEAR_ITEMS } from '@/constants/gameplayConfig';

const { width } = Dimensions.get('window');

// Fallback images if required
const ASSETS = {
    envSky: require('@/assets/images/bg_sky.png'),
    envGround: require('@/assets/images/camp_lvl1.png'),
    baseCamp: require('@/assets/images/camp_lvl1.png'),
    playerBase: require('@/assets/images/char_mage.png'),
    dragonDefault: require('@/assets/images/dragon_red.png'),
};

export default function LivingDiorama() {
    const playerBreathAnim = useRef(new Animated.Value(0)).current;
    const dragonBreathAnim = useRef(new Animated.Value(0)).current;
    const streak = useGameStore(state => state.streak);
    const activeDragonId = useGameStore((s) => s.activeDragonId);
    const equippedOutfitId = useGameStore((s) => s.equippedOutfitId);
    const equippedRelicId = useGameStore((s) => s.equippedRelicId);
    const dragonKey = activeDragonId as keyof typeof DRAGON_CONFIGS | null;
    const dragonAsset: any = (dragonKey && DRAGON_CONFIGS[dragonKey]?.imageAsset) || ASSETS.dragonDefault;
    const outfitAsset =
      (equippedOutfitId && GEAR_ITEMS[equippedOutfitId as keyof typeof GEAR_ITEMS]?.imageAsset) || null;
    const relicAsset =
      (equippedRelicId && GEAR_ITEMS[equippedRelicId as keyof typeof GEAR_ITEMS]?.imageAsset) || null;

    useEffect(() => {
        // Player Breathing (Slow and steady)
        Animated.loop(
            Animated.sequence([
                Animated.timing(playerBreathAnim, {
                    toValue: -5,
                    duration: 2500, // 2.5s inhale
                    useNativeDriver: true,
                }),
                Animated.timing(playerBreathAnim, {
                    toValue: 0,
                    duration: 2500, // 2.5s exhale
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Dragon Breathing (Slightly faster and async)
        Animated.loop(
            Animated.sequence([
                Animated.timing(dragonBreathAnim, {
                    toValue: -3,
                    duration: 1800, // 1.8s inhale
                    useNativeDriver: true,
                }),
                Animated.timing(dragonBreathAnim, {
                    toValue: 0,
                    duration: 1800, // 1.8s exhale
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [playerBreathAnim, dragonBreathAnim]);

    return (
        <View style={styles.container}>
            {/* Layer 0: Sky/Far Background */}
            <Animated.Image
                source={ASSETS.envSky}
                style={styles.layerEnvironmentSky}
                resizeMode="cover"
            />

            {/* Layer 1: Ground */}
            <Animated.Image
                source={ASSETS.envGround}
                style={styles.layerEnvironmentGround}
                resizeMode="contain"
            />

            {/* Layer 2: Player base */}
            <Animated.Image
                source={ASSETS.baseCamp}
                style={styles.layerBase}
                resizeMode="contain"
            />

            {/* Global VFX: Weather */}
            {streak === 0 && (
                <View style={[styles.layerWeather, styles.noPointerEvents]}>
                    <LottieView
                        source={require('@/assets/lottie/rain.json')}
                        autoPlay
                        loop
                        style={{ width: '100%', height: '100%' }}
                    />
                </View>
            )}

            {/* Local VFX: Campfire */}
            <View style={[styles.layerCampfire, styles.noPointerEvents]}>
                <LottieView
                    source={require('@/assets/lottie/campfire.json')}
                    autoPlay
                    loop
                    style={{ width: '100%', height: '100%' }}
                />
            </View>

            {/* Layer 3: Active dragon (foreground rock/ledge area) */}
            <Animated.Image
                source={dragonAsset}
                style={[
                    styles.layerDragon,
                    { transform: [{ translateY: dragonBreathAnim }] },
                ]}
                resizeMode="contain"
            />

            {/* Layer 4: Player base + equipment overlays */}
            <Animated.Image
                source={ASSETS.playerBase}
                style={[
                    styles.layerMage,
                    { transform: [{ translateY: playerBreathAnim }] },
                ]}
                resizeMode="contain"
            />
            {outfitAsset ? <Animated.Image source={outfitAsset} style={styles.layerOutfit} resizeMode="contain" /> : null}
            {relicAsset ? <Animated.Image source={relicAsset} style={styles.layerRelic} resizeMode="contain" /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width,
        height: 320, // Taller size for edge-to-edge feel
        backgroundColor: '#0a0a0a', // Fallback color
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: '#3d2e5c',
        marginBottom: 24,
    },
    layerEnvironmentSky: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    layerEnvironmentGround: {
        position: 'absolute',
        bottom: -120, // moved even lower per user request
        width: '100%',
        height: '140%', // slightly increase height to compensate for dropping it so low
        opacity: 1,
    },
    layerBase: {
        position: 'absolute',
        bottom: -120,
        width: '100%',
        height: '140%',
        opacity: 0.75,
    },
    layerCampfire: {
        position: 'absolute',
        bottom: 40,
        left: width * 0.45 - 75, // Centered (width 150) plus some offset depending on camp image
        width: 150,
        height: 150,
        zIndex: 2,
    },
    layerWeather: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        opacity: 0.4,
        zIndex: 1,
    },
    layerDragon: {
        position: 'absolute',
        bottom: 120, // higher up
        left: width * 0.1, // upper left corner (ish)
        width: 120, // slightly smaller to simulate distance
        height: 120,
        zIndex: 3,
    },
    layerMage: {
        position: 'absolute',
        bottom: -10,
        right: width * 0.05, // mage is now on the right where dragon used to be
        width: 180,
        height: 240,
        zIndex: 4,
    },
    layerOutfit: {
        position: 'absolute',
        bottom: -10,
        right: width * 0.05,
        width: 180,
        height: 240,
        zIndex: 5,
    },
    layerRelic: {
        position: 'absolute',
        bottom: 60,
        right: width * 0.2,
        width: 80,
        height: 80,
        zIndex: 6,
    },
    noPointerEvents: {
        pointerEvents: 'none',
    },
});
