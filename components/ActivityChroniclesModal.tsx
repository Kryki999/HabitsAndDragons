import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, ScrollText } from "lucide-react-native";
import Colors from "@/constants/colors";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";

type Props = {
  visible: boolean;
  onClose: () => void;
  activityByDate: Record<string, { completions: number; xpFromHabits: number }>;
};

/** Modal w stylu plecaka — historia aktywności (heatmapa). */
export default function ActivityChroniclesModal({ visible, onClose, activityByDate }: Props) {
  const { width } = useWindowDimensions();
  const modalMaxW = Math.min(width - 32, 400);

  const handleClose = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <View style={styles.backdrop} />
        </Pressable>

        <View style={[styles.sheet, { width: modalMaxW }]}>
          <LinearGradient
            colors={["#2a1f42", "#1a1228", "#120c1c"]}
            style={styles.sheetGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <ScrollText size={22} color={Colors.dark.emerald} />
                <Text style={styles.title}>Kroniki</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                <X size={22} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Archiwum aktywności — ostatnie tygodnie Twojej drogi</Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.heatmapWrap}>
                <ActivityHeatmap activityByDate={activityByDate} embedded />
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  sheet: {
    maxHeight: "92%" as const,
  },
  sheetGradient: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderGlow + "55",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 14,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface + "99",
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  heatmapWrap: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: Colors.dark.background + "dd",
    borderWidth: 1,
    borderColor: Colors.dark.emerald + "28",
  },
});
