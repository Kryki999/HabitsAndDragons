import React from "react";
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
import { X } from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";

const H_PAD = 18;

interface GuideInfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
}

export default function GuideInfoModal({ visible, onClose, title, body }: GuideInfoModalProps) {
  const { width } = useWindowDimensions();
  const modalMaxW = Math.min(width - 28, 440);

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
              <Text style={styles.title}>{title}</Text>
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
              <Text style={styles.body}>{body}</Text>
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
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
    maxHeight: "78%",
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
    paddingBottom: 18,
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
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: 0.3,
    paddingRight: 8,
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
    maxHeight: 320,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
});
