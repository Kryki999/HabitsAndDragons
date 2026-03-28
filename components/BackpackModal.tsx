import React, { useCallback } from "react";
import { View, Text, StyleSheet, Modal, Pressable, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Backpack } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import BackpackInventoryBody from "@/components/BackpackInventoryBody";

interface BackpackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BackpackModal({ visible, onClose }: BackpackModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalPad = 16;
  const contentWidth = width - horizontalPad * 2;

  const handleClose = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.shell}>
        <LinearGradient
          colors={["#1a0f2e", "#120a1c", "#080510"]}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={[styles.body, { paddingTop: Math.max(insets.top, 10), paddingBottom: insets.bottom }]}>
          <View style={styles.headerBar}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              hitSlop={12}
              accessibilityLabel="Close backpack"
            >
              <X size={24} color={Colors.dark.text} />
            </Pressable>
            <View style={styles.titleCenter}>
              <Backpack size={22} color={Colors.dark.gold} />
              <Text style={styles.title}>Backpack</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.planningSubtitle}>Inventory</Text>
          <Text style={styles.subtitle}>Cosmetic trophies from your dungeon runs</Text>

          <View style={styles.listWrap}>
            <BackpackInventoryBody
              scrollable
              fillAvailableHeight
              contentWidth={contentWidth}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface + "ee",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border + "aa",
  },
  headerIconBtnPressed: {
    opacity: 0.88,
  },
  titleCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  planningSubtitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.6,
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 12,
    lineHeight: 17,
    textAlign: "center" as const,
  },
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
});
