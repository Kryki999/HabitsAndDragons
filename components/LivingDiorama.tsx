import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useGameStore } from '@/store/gameStore';

const { width } = Dimensions.get('window');

// Fallback images if required
const ASSETS = {
    sky: require('@/assets/images/bg_sky.png'),
    camp: require('@/assets/images/camp_lvl1.png'),
    dragon: require('@/assets/images/dragon_red.png'),
    mage: require('@/assets/images/char_mage.png'),
};

export default function LivingDiorama() {
    const playerBreathAnim = useRef(new Animated.Value(0)).current;
    const dragonBreathAnim = useRef(new Animated.Value(0)).current;
    const streak = useGameStore(state => state.streak);

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
                source={ASSETS.sky}
                style={styles.layerSky}
                resizeMode="cover"
            />

            {/* Layer 1: Camp/Environment */}
            <Animated.Image
                source={ASSETS.camp}
                style={styles.layerCamp}
                resizeMode="contain"
            />

            {/* Global VFX: Weather */}
            {streak === 0 && (
                <View pointerEvents="none" style={styles.layerWeather}>
                    <LottieView
                        source={require('@/assets/lottie/rain.json')}
                        autoPlay
                        loop
                        style={{ width: '100%', height: '100%' }}
                    />
                </View>
            )}

            {/* Local VFX: Campfire */}
            <View pointerEvents="none" style={styles.layerCampfire}>
                <LottieView
                    source={require('@/assets/lottie/campfire.json')}
                    autoPlay
                    loop
                    style={{ width: '100%', height: '100%' }}
                />
            </View>

            {/* Layer 2: Dragon (Pet) */}
            <Animated.Image
                source={ASSETS.dragon}
                style={[
                    styles.layerDragon,
                    { transform: [{ translateY: dragonBreathAnim }] },
                ]}
                resizeMode="contain"
            />

            {/* Layer 3: Player (Mage) */}
            <Animated.Image
                source={ASSETS.mage}
                style={[
                    styles.layerMage,
                    { transform: [{ translateY: playerBreathAnim }] },
                ]}
                resizeMode="contain"
            />
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
    layerSky: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    layerCamp: {
        position: 'absolute',
        bottom: -120, // moved even lower per user request
        width: '100%',
        height: '140%', // slightly increase height to compensate for dropping it so low
        opacity: 1,
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
});
