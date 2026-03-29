import React, { useMemo } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Lock } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import { KINGDOM_PROGRESSION_STAGES } from "@/constants/kingdomVisuals";

const COLUMNS = 2;
const COL_GAP = 12;
const ROW_GAP = 14;
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

  const rows = useMemo(() => chunkStages(KINGDOM_PROGRESSION_STAGES, COLUMNS), []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxWidth: modalMaxW }]} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={["#1e1628", "#120c1a", "#0a0710"]}
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
                  {row.map((stage, col) => (
                    <View
                      key={stage.unlockLevel}
                      style={{
                        width: cellW,
                        marginRight: col < row.length - 1 ? COL_GAP : 0,
                      }}
                    >
                      <StageCell stage={stage} playerLevel={playerLevel} cellW={cellW} />
                    </View>
                  ))}
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
  const thumbH = Math.round(cellW * 1.22);

  return (
    <View
      style={[
        styles.tile,
        unlocked ? styles.tileUnlocked : styles.tileLocked,
        { width: cellW },
      ]}
    >
      <View style={[styles.artWrap, { width: cellW, height: thumbH }]}>
        {stage.previewSource ? (
          <Image
            source={stage.previewSource}
            style={[styles.art, !unlocked && styles.artDimmed]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artSilhouette, !unlocked && styles.artDimmed]} />
        )}
        {!unlocked ? (
          <View style={styles.lockVeil}>
            <View style={styles.lockBadge}>
              <Lock size={22} color={Colors.dark.gold} strokeWidth={2.6} />
            </View>
          </View>
        ) : null}
      </View>
      <View style={[styles.reqStrip, !unlocked && styles.reqStripLocked]}>
        <Text style={[styles.reqText, !unlocked && styles.reqTextLocked]}>Lvl {stage.unlockLevel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  sheet: {
    width: "100%",
    maxHeight: "88%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "55",
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface + "cc",
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 14,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  tile: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "#06040a",
  },
  tileUnlocked: {
    borderColor: Colors.dark.gold + "88",
  },
  tileLocked: {
    borderColor: "#0d0a12",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 0,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  artWrap: {
    backgroundColor: "#050308",
    overflow: "hidden",
  },
  art: {
    width: "100%",
    height: "100%",
  },
  artDimmed: {
    opacity: 0.32,
  },
  artSilhouette: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0e0c14",
  },
  lockVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(12,10,20,0.94)",
    borderWidth: 2,
    borderColor: Colors.dark.gold + "66",
    alignItems: "center",
    justifyContent: "center",
  },
  reqStrip: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(10,8,18,0.98)",
    borderTopWidth: 2,
    borderTopColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  reqStripLocked: {
    backgroundColor: "rgba(6,5,12,0.98)",
    borderTopColor: "#0a0810",
  },
  reqText: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.dark.gold,
    letterSpacing: 0.6,
  },
  reqTextLocked: {
    color: Colors.dark.textMuted,
  },
});
