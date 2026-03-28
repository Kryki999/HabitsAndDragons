import React, { useCallback, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  type LayoutChangeEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useFrameCallback,
  type FrameInfo,
} from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export type SpriteAnimatorProps = {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  totalFrames: number;
  fps?: number;
  style?: StyleProp<ViewStyle>;
  imageOpacity?: number;
};

/**
 * Spritesheet viewport with overflow hidden. Frame index advances on the UI thread
 * (useFrameCallback) — avoids setState/setInterval jank on 25+ frame loops.
 */
export default function SpriteAnimator({
  source,
  columns,
  rows,
  totalFrames,
  fps = 14,
  style,
  imageOpacity = 1,
}: SpriteAnimatorProps) {
  const frameIdx = useSharedValue(0);
  const cellW = useSharedValue(0);
  const cellH = useSharedValue(0);
  const opacitySv = useSharedValue(imageOpacity);

  useEffect(() => {
    opacitySv.value = imageOpacity;
  }, [imageOpacity, opacitySv]);

  const fpsSafe = Math.min(30, Math.max(1, fps));
  const tf = Math.max(1, totalFrames);

  const onFrame = useCallback(
    (info: FrameInfo) => {
      "worklet";
      const msPerFrame = 1000 / fpsSafe;
      frameIdx.value = Math.floor(info.timeSinceFirstFrame / msPerFrame) % tf;
    },
    [fpsSafe, tf],
  );

  useFrameCallback(onFrame);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      cellW.value = width;
      cellH.value = height;
    },
    [cellW, cellH],
  );

  const animatedImageStyle = useAnimatedStyle(() => {
    "worklet";
    const cw = cellW.value;
    const ch = cellH.value;
    const op = opacitySv.value;
    if (cw <= 0 || ch <= 0) {
      return { opacity: op };
    }
    const f = Math.floor(frameIdx.value) % tf;
    const col = f % columns;
    const row = Math.floor(f / columns);
    return {
      position: "absolute" as const,
      left: 0,
      top: 0,
      width: cw * columns,
      height: ch * rows,
      opacity: op,
      transform: [{ translateX: -col * cw }, { translateY: -row * ch }],
    };
  }, [columns, rows, tf]);

  return (
    <View style={[styles.clip, style]} onLayout={onLayout}>
      <AnimatedImage
        source={source}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
        style={animatedImageStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    width: "100%",
    height: "100%",
  },
});
