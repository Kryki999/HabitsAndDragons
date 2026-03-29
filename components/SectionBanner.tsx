import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ImageSourcePropType,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Info } from "lucide-react-native";
import Colors from "@/constants/colors";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";

export type SectionBannerProps = {
  title: string;
  /** Omit or pass `null` for a dark placeholder strip (no artwork yet). */
  source?: ImageSourcePropType | null;
  /** When set, shows the info control (top-right). */
  onInfoPress?: () => void;
  infoAccessibilityLabel?: string;
  /** Bottom-left row: counters, currencies, etc. */
  footerSlot?: React.ReactNode;
};

/** Taller strip + `cover` fills banner width (no side letterboxing from `contain`). */
const BANNER_HEIGHT = 204;

export default function SectionBanner({
  title,
  source,
  onInfoPress,
  infoAccessibilityLabel = "Section guide",
  footerSlot,
}: SectionBannerProps) {
  const overlay = (
    <>
      <LinearGradient
        colors={["rgba(6,8,18,0.35)", "rgba(6,8,18,0.55)", "rgba(4,6,14,0.82)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.inner}>
        <View style={[styles.topRow, !onInfoPress && styles.topRowTitleOnly]}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {onInfoPress ? (
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onInfoPress();
              }}
              style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={infoAccessibilityLabel}
              hitSlop={8}
            >
              <Info size={20} color="#fff" strokeWidth={2.6} />
            </Pressable>
          ) : null}
        </View>

        {footerSlot ? <View style={styles.footerRow}>{footerSlot}</View> : null}
      </View>
    </>
  );

  if (source == null) {
    return (
      <View style={[styles.root, styles.placeholderRoot]}>
        <LinearGradient
          colors={["#2a2438", "#1a1628", "#12101c"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {overlay}
      </View>
    );
  }

  return (
    <ImageBackground source={source} style={styles.root} imageStyle={styles.image}>
      {overlay}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%" as const,
    height: BANNER_HEIGHT,
    backgroundColor: "#0c0a12",
    borderRadius: 18,
    overflow: "hidden" as const,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,120,0.22)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  placeholderRoot: {
    backgroundColor: "#1a1628",
  },
  image: {
    resizeMode: "cover" as const,
    width: "100%" as const,
    height: "100%" as const,
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: "space-between" as const,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  topRowTitleOnly: {
    justifyContent: "flex-start" as const,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: "900" as const,
    color: "#fff8f0",
    letterSpacing: 0.4,
    textTransform: "capitalize" as const,
    textShadowColor: "rgba(0,0,0,0.92)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  infoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  infoBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  footerRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    gap: 8,
    alignSelf: "flex-start" as const,
  },
});

/** Compact counter pill for the banner footer row (emoji + value + optional label). */
export function SectionBannerCounter({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string | number;
  label?: string;
}) {
  return (
    <View style={counterStyles.chip}>
      <Text style={counterStyles.emoji}>{emoji}</Text>
      <View style={counterStyles.counterTextCol}>
        <Text style={counterStyles.value}>{value}</Text>
        {label ? (
          <Text style={counterStyles.label} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const counterStyles = StyleSheet.create({
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(8,6,16,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  emoji: {
    fontSize: 20,
  },
  counterTextCol: {
    minWidth: 0,
  },
  value: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.72)",
    marginTop: 1,
    maxWidth: 120,
  },
});
