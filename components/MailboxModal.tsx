import React, { useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Animated, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Mail } from "lucide-react-native";
import Colors from "@/constants/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MailboxModal({ visible, onClose }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      slide.setValue(20);
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
            colors={["#1a1528", "#0f0c18"]}
            style={styles.sheet}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <LinearGradient colors={[...Colors.gradients.gold]} style={styles.mailIcon}>
                  <Mail size={20} color="#1a1228" />
                </LinearGradient>
                <View>
                  <Text style={styles.title}>Skrzynka</Text>
                  <Text style={styles.subtitle}>Tablica ogłoszeń</Text>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <X size={22} color={Colors.dark.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.msgCard}>
                <Text style={styles.msgFrom}>Zespół Habits & Dragons</Text>
                <Text style={styles.msgDate}>Beta · wiadomość powitalna</Text>
                <Text style={styles.msgBody}>
                  Witaj w fazie Beta Habits & Dragons! Cieszymy się, że jesteś z nami — każdy odhaczony nawyk to krok
                  naprzód. Czekamy na Twój feedback: co Ci się podoba, a co warto dopracować przed premierą.
                </Text>
              </View>
            </ScrollView>

            <Pressable onPress={onClose} style={styles.closeOuter}>
              <Text style={styles.closeText}>Zamknij</Text>
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
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  sheetWrap: {
    maxHeight: "78%",
  },
  sheet: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  mailIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  scroll: {
    maxHeight: 320,
  },
  msgCard: {
    backgroundColor: Colors.dark.surface + "cc",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border + "88",
  },
  msgFrom: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.dark.gold,
  },
  msgDate: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  msgBody: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.dark.text,
  },
  closeOuter: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  closeText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.dark.purple,
  },
});
