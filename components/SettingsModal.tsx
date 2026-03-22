import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Vibrate } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SettingsModal({ visible, onClose }: Props) {
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useGameStore((s) => s.setHapticsEnabled);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      slide.setValue(24);
    }
  }, [visible, fade, slide]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fade }]} />
        </Pressable>
        <Animated.View style={[styles.sheetWrap, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <LinearGradient
            colors={["#1e1830", "#120e1c"]}
            style={styles.sheet}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ustawienia</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <X size={22} color={Colors.dark.textMuted} />
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Vibrate size={20} color={Colors.dark.gold} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Wibracje</Text>
                <Text style={styles.rowSub}>Haptic feedback przy akcjach w grze</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: "#3a3248", true: Colors.dark.emerald + "88" }}
                thumbColor={hapticsEnabled ? Colors.dark.emerald : "#9a8fb0"}
              />
            </View>

            <Pressable onPress={onClose} style={styles.doneOuter}>
              <LinearGradient colors={[...Colors.gradients.purple]} style={styles.doneBtn}>
                <Text style={styles.doneText}>Gotowe</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  sheetWrap: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sheet: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  closeBtn: {
    padding: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border + "55",
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  rowSub: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  doneOuter: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  doneBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});
