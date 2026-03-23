import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
    progress: number; // 0 to 1
    size: number;
    strokeWidth: number;
    color: string;
    backgroundColor: string;
    children?: React.ReactNode;
}

export default function CircularProgress({
    progress,
    size,
    strokeWidth,
    color,
    backgroundColor,
    children,
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Use Animated.Value to interpolate progress
    const animatedProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: progress,
            duration: 600,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    return (
        <View style={[{ width: size, height: size }, styles.container]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress Circle */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={animatedProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [circumference, 0],
                    })}
                    strokeLinecap="round"
                    fill="none"
                    rotation="-90"
                    originX={size / 2}
                    originY={size / 2}
                />
            </Svg>
            <View style={[StyleSheet.absoluteFillObject, styles.childContainer]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    childContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
