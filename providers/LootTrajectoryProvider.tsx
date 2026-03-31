import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Coins } from "lucide-react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

type Point = { x: number; y: number };

type LootTriggerPayload = {
  from: Point;
  amount?: number;
};

type LootParticle = {
  id: string;
  from: Point;
  to: Point;
  jumpHeight: number;
  controlDx: number;
  durationMs: number;
  delayMs: number;
  size: number;
};

type LootTrajectoryContextValue = {
  triggerLootTrajectory: (payload: LootTriggerPayload) => void;
  registerGoldTarget: (point: Point | null) => void;
  onGoldTargetLayout: (event: LayoutChangeEvent) => void;
  goldPulseStyle: ReturnType<typeof useAnimatedStyle>;
  pendingGoldInFlight: number;
};

const LootTrajectoryContext = createContext<LootTrajectoryContextValue | null>(null);

function clampCoins(amount: number): number {
  if (amount >= 180) return 10;
  if (amount >= 100) return 9;
  if (amount >= 60) return 8;
  if (amount >= 30) return 7;
  if (amount >= 15) return 6;
  if (amount >= 5) return 5;
  return 4;
}

function LootParticleSprite({
  particle,
  onDone,
}: {
  particle: LootParticle;
  onDone: (id: string) => void;
}) {
  const progress = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const oneMinusT = 1 - t;
    const midX = (particle.from.x + particle.to.x) / 2 + particle.controlDx;
    const midY = Math.min(particle.from.y, particle.to.y) - particle.jumpHeight;

    const x =
      oneMinusT * oneMinusT * particle.from.x +
      2 * oneMinusT * t * midX +
      t * t * particle.to.x;
    const y =
      oneMinusT * oneMinusT * particle.from.y +
      2 * oneMinusT * t * midY +
      t * t * particle.to.y;

    const scale = interpolate(t, [0, 0.18, 0.72, 1], [0.92, 1.26, 1.04, 0.86], Extrapolation.CLAMP);
    const opacity = interpolate(t, [0, 0.08, 0.92, 1], [0, 1, 1, 0], Extrapolation.CLAMP);
    const rotate = `${interpolate(t, [0, 1], [0, 680])}deg`;

    return {
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { rotate }, { scale }],
    };
  });

  React.useEffect(() => {
    progress.value = withTiming(
      1,
      {
        duration: particle.durationMs,
        delay: particle.delayMs,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (!finished) return;
        runOnJS(onDone)(particle.id);
      },
    );
  }, [onDone, particle.delayMs, particle.durationMs, particle.id, progress]);

  return (
    <Animated.View style={[styles.particle, style]}>
      <Coins color={Colors.dark.gold} size={particle.size} strokeWidth={2.5} />
    </Animated.View>
  );
}

export function LootTrajectoryProvider({ children }: { children: React.ReactNode }) {
  const [particles, setParticles] = useState<LootParticle[]>([]);
  const [pendingGoldInFlight, setPendingGoldInFlight] = useState(0);
  const idCounter = useRef(0);
  const goldTargetRef = useRef<Point | null>(null);
  const pendingImpactRef = useRef<Record<string, number>>({});
  const pendingGoldBySequenceRef = useRef<Record<string, number>>({});
  const goldPulse = useSharedValue(1);

  const pulseGoldHud = useCallback(() => {
    goldPulse.value = withSequence(
      withTiming(1.24, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 170, easing: Easing.inOut(Easing.quad) }),
    );
  }, [goldPulse]);

  const goldPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goldPulse.value }],
  }));

  const onParticleDone = useCallback(
    (id: string) => {
      setParticles((prev) => prev.filter((p) => p.id !== id));

      const sequenceId = id.split(":")[0];
      if (!sequenceId) return;
      const left = (pendingImpactRef.current[sequenceId] ?? 1) - 1;
      if (left <= 0) {
        delete pendingImpactRef.current[sequenceId];
        const releasedGold = pendingGoldBySequenceRef.current[sequenceId] ?? 0;
        delete pendingGoldBySequenceRef.current[sequenceId];
        if (releasedGold > 0) {
          setPendingGoldInFlight((prev) => Math.max(0, prev - releasedGold));
        }
        pulseGoldHud();
      } else {
        pendingImpactRef.current[sequenceId] = left;
      }
    },
    [pulseGoldHud],
  );

  const registerGoldTarget = useCallback((point: Point | null) => {
    goldTargetRef.current = point;
  }, []);

  const onGoldTargetLayout = useCallback((_event: LayoutChangeEvent) => {
    // Layout hook kept for easy future extension.
  }, []);

  const triggerLootTrajectory = useCallback((payload: LootTriggerPayload) => {
    const target = goldTargetRef.current;
    if (!target) return;

    const amount = Math.max(1, payload.amount ?? 1);
    const coinsCount = clampCoins(amount);
    const sequenceId = `${Date.now()}-${idCounter.current++}`;
    pendingImpactRef.current[sequenceId] = coinsCount;
    pendingGoldBySequenceRef.current[sequenceId] = amount;
    setPendingGoldInFlight((prev) => prev + amount);

    const nextParticles: LootParticle[] = Array.from({ length: coinsCount }, (_, index) => {
      const spreadX = (Math.random() - 0.5) * 36;
      const spreadY = (Math.random() - 0.5) * 16;
      return {
        id: `${sequenceId}:${index}`,
        from: { x: payload.from.x + spreadX, y: payload.from.y + spreadY },
        to: target,
        jumpHeight: 74 + Math.random() * 56,
        controlDx: (Math.random() - 0.5) * 58,
        durationMs: 1180 + Math.floor(Math.random() * 280),
        delayMs: index * 60,
        size: 20 + Math.floor(Math.random() * 6),
      };
    });

    setParticles((prev) => [...prev, ...nextParticles]);
  }, []);

  const value = useMemo<LootTrajectoryContextValue>(
    () => ({
      triggerLootTrajectory,
      registerGoldTarget,
      onGoldTargetLayout,
      goldPulseStyle,
      pendingGoldInFlight,
    }),
    [goldPulseStyle, onGoldTargetLayout, pendingGoldInFlight, registerGoldTarget, triggerLootTrajectory],
  );

  return (
    <LootTrajectoryContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={styles.overlay}>
        {particles.map((particle) => (
          <LootParticleSprite key={particle.id} particle={particle} onDone={onParticleDone} />
        ))}
      </View>
    </LootTrajectoryContext.Provider>
  );
}

export function useLootTrajectory() {
  const context = useContext(LootTrajectoryContext);
  if (!context) {
    throw new Error("useLootTrajectory must be used inside LootTrajectoryProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  particle: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
