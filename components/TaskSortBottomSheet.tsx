import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { X, Check } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function TaskSortBottomSheet({ visible, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const castleQuestSortMode = useGameStore((s) => s.castleQuestSortMode);
  const setCastleQuestSortMode = useGameStore((s) => s.setCastleQuestSortMode);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const pick = useCallback(
    (mode: "default" | "custom") => {
      impactAsync(ImpactFeedbackStyle.Light);
      setCastleQuestSortMode(mode);
      handleClose();
    },
    [setCastleQuestSortMode, handleClose],
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleBar} />
          <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Close">
            <X size={20} color={Colors.dark.textSecondary} />
          </Pressable>

          <Text style={styles.title}>Quest order</Text>
          <Text style={styles.subtitle}>Choose how your due quests appear on the Castle screen.</Text>

          <Pressable
            onPress={() => pick("default")}
            style={({ pressed }) => [
              styles.optionCard,
              castleQuestSortMode === "default" && styles.optionCardActive,
              pressed && styles.optionCardPressed,
            ]}
          >
            <View style={styles.optionHeaderRow}>
              <Text style={[styles.optionTitle, castleQuestSortMode === "default" && styles.optionTitleActive]}>
                Default order
              </Text>
              {castleQuestSortMode === "default" ? (
                <View style={styles.activeCheckBadge}>
                  <Check size={13} color={Colors.dark.gold} strokeWidth={3} />
                </View>
              ) : null}
            </View>
            <Text style={styles.optionHint}>Same order as when you added quests (stable roster).</Text>
          </Pressable>

          <Pressable
            onPress={() => pick("custom")}
            style={({ pressed }) => [
              styles.optionCard,
              castleQuestSortMode === "custom" && styles.optionCardActive,
              pressed && styles.optionCardPressed,
            ]}
          >
            <View style={styles.optionHeaderRow}>
              <Text style={[styles.optionTitle, castleQuestSortMode === "custom" && styles.optionTitleActive]}>
                Custom order
              </Text>
              {castleQuestSortMode === "custom" ? (
                <View style={styles.activeCheckBadge}>
                  <Check size={13} color={Colors.dark.gold} strokeWidth={3} />
                </View>
              ) : null}
            </View>
            <Text style={styles.optionHint}>
              Grab the grip handles on each quest card to drag and reorder. Your layout is saved automatically.
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.55,
    minHeight: SCREEN_HEIGHT * 0.38,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.dark.textMuted,
    borderRadius: 2,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 18,
    lineHeight: 17,
  },
  optionCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.dark.surface + "ee",
    borderWidth: 2,
    borderColor: Colors.dark.border + "aa",
  },
  optionCardActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + "18",
  },
  optionCardPressed: {
    opacity: 0.92,
  },
  optionHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 6,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    flex: 1,
  },
  optionTitleActive: {
    color: Colors.dark.gold,
  },
  activeCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.gold + "22",
    borderWidth: 1.5,
    borderColor: Colors.dark.gold + "88",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  optionHint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
});
