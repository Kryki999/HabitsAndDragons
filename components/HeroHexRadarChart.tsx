import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import Svg, { Line, Polygon } from "react-native-svg";
import {
  Swords,
  Footprints,
  BookOpen,
  Heart,
  Eye,
  Shield,
  type LucideIcon,
} from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import {
  type HeroHexStatId,
  type HeroHexStats,
  HERO_HEX_LABELS,
  HERO_HEX_STAT_AXIS_ORDER,
  MOCK_HERO_HEX_STATS,
  formatStatValue,
  radarDynamicMax,
} from "@/constants/heroHexStats";

const N = 6;

const AXIS_META: Record<
  HeroHexStatId,
  { Icon: LucideIcon; color: string }
> = {
  strength: { Icon: Swords, color: "#dc2626" },
  agility: { Icon: Footprints, color: "#22c55e" },
  intelligence: { Icon: BookOpen, color: "#2563eb" },
  vitality: { Icon: Heart, color: "#f59e0b" },
  spirit: { Icon: Eye, color: "#7c3aed" },
  discipline: { Icon: Shield, color: "#94a3b8" },
};

function hexPointsString(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function dataPolygonPoints(
  cx: number,
  cy: number,
  maxScale: number,
  innerR: number,
  values: HeroHexStats,
): string {
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const id = HERO_HEX_STAT_AXIS_ORDER[i]!;
    const v = values[id];
    const t = Math.max(0, Math.min(1, v / maxScale));
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const r = innerR * t;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

type TooltipState = {
  statId: HeroHexStatId;
  /** Chart-relative x center of the stat icon */
  iconCx: number;
  /** Chart-relative y center of the stat icon */
  iconCy: number;
};

const TOOLTIP_AUTO_MS = 3000;
const ICON_HIT = 40;
const TOOLTIP_W = 180;
const TOOLTIP_H = 40;

type Props = {
  size?: number;
  stats?: HeroHexStats;
};

export default function HeroHexRadarChart({ size = 220, stats: statsProp }: Props) {
  const stats = statsProp ?? MOCK_HERO_HEX_STATS;
  const maxScale = useMemo(() => radarDynamicMax(stats), [stats]);

  const pad = 36;
  const w = size + pad * 2;
  const h = size + pad * 2;
  const cx = w / 2;
  const cy = h / 2;
  const gridR = size * 0.4;
  const dataR = size * 0.38;
  const iconR = size * 0.48;

  const rings = useMemo(() => [1 / 3, 2 / 3, 1] as const, []);

  const spokeLines = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      out.push({
        x1: cx,
        y1: cy,
        x2: cx + gridR * Math.cos(a),
        y2: cy + gridR * Math.sin(a),
      });
    }
    return out;
  }, [cx, cy, gridR]);

  const dataPoints = useMemo(
    () => dataPolygonPoints(cx, cy, maxScale, dataR, stats),
    [cx, cy, maxScale, dataR, stats],
  );

  const [tip, setTip] = useState<TooltipState | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTipTimer = useCallback(() => {
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
  }, []);

  const dismissTip = useCallback(() => {
    clearTipTimer();
    setTip(null);
  }, [clearTipTimer]);

  useEffect(() => () => clearTipTimer(), [clearTipTimer]);

  const openTip = useCallback(
    (statId: HeroHexStatId, iconCx: number, iconCy: number) => {
      clearTipTimer();
      // Toggle: tap same stat again to dismiss
      setTip((prev) => {
        if (prev?.statId === statId) return null;
        impactAsync(ImpactFeedbackStyle.Light);
        tipTimerRef.current = setTimeout(() => {
          setTip(null);
          tipTimerRef.current = null;
        }, TOOLTIP_AUTO_MS);
        return { statId, iconCx, iconCy };
      });
    },
    [clearTipTimer],
  );

  /** Compute chart-relative tooltip position, clamped inside the chart box */
  const tooltipPos = useMemo(() => {
    if (!tip) return null;
    let left = tip.iconCx - TOOLTIP_W / 2;
    left = Math.max(4, Math.min(left, w - TOOLTIP_W - 4));
    let top = tip.iconCy - ICON_HIT / 2 - TOOLTIP_H - 6;
    if (top < 4) top = tip.iconCy + ICON_HIT / 2 + 6; // flip below
    top = Math.max(4, Math.min(top, h - TOOLTIP_H - 4));
    return { left, top };
  }, [tip, w, h]);

  const tipLabel = tip ? HERO_HEX_LABELS[tip.statId] : "";
  const tipValue = tip ? formatStatValue(stats[tip.statId]) : "";

  return (
    <View style={styles.wrap}>
      {/* Chart frame — overflow visible so tooltip can sit over icons */}
      <View style={[styles.chartFrame, { width: w, height: h }]} collapsable={false}>
        <Svg width={w} height={h}>
          {rings.map((k) => (
            <Polygon
              key={k}
              points={hexPointsString(cx, cy, gridR * k)}
              fill="none"
              stroke={Colors.dark.border + "66"}
              strokeWidth={0.8}
            />
          ))}
          {spokeLines.map((s, i) => (
            <Line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={Colors.dark.border + "44"}
              strokeWidth={0.7}
            />
          ))}
          <Polygon
            points={dataPoints}
            fill="rgba(139, 21, 56, 0.28)"
            stroke="rgba(220, 38, 38, 0.55)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>

        {HERO_HEX_STAT_AXIS_ORDER.map((statId, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
          const ix = cx + iconR * Math.cos(a) - ICON_HIT / 2;
          const iy = cy + iconR * Math.sin(a) - ICON_HIT / 2;
          const iconCx = ix + ICON_HIT / 2;
          const iconCy = iy + ICON_HIT / 2;
          const { Icon, color } = AXIS_META[statId];
          const isActive = tip?.statId === statId;
          return (
            <View
              key={statId}
              collapsable={false}
              style={[
                styles.iconHit,
                { left: ix, top: iy },
                isActive && styles.iconHitActive,
              ]}
            >
              <Pressable
                onPress={() => openTip(statId, iconCx, iconCy)}
                style={styles.iconHitInner}
                accessibilityLabel={`${HERO_HEX_LABELS[statId]} stat`}
                accessibilityRole="button"
              >
                <Icon size={20} color={color} strokeWidth={2.2} />
              </Pressable>
            </View>
          );
        })}

        {/* Inline tooltip — no Modal, so scroll is never blocked */}
        {tip && tooltipPos ? (
          <Pressable
            onPress={dismissTip}
            style={[styles.tooltip, { left: tooltipPos.left, top: tooltipPos.top, width: TOOLTIP_W }]}
            accessibilityLabel="Dismiss tooltip"
          >
            <Text style={styles.tooltipText}>
              {tipLabel}: {tipValue}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  chartFrame: {
    position: "relative",
    overflow: "visible",
  },
  iconHit: {
    position: "absolute",
    width: ICON_HIT,
    height: ICON_HIT,
    borderRadius: 10,
    backgroundColor: "rgba(10, 8, 16, 0.45)",
    borderWidth: 1,
    borderColor: Colors.dark.border + "66",
    overflow: "hidden",
  },
  iconHitActive: {
    borderColor: Colors.dark.gold + "aa",
    backgroundColor: Colors.dark.gold + "18",
  },
  iconHitInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tooltip: {
    position: "absolute",
    height: TOOLTIP_H,
    paddingVertical: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(18, 12, 28, 0.97)",
    borderWidth: 1,
    borderColor: Colors.dark.gold + "88",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.dark.text,
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
