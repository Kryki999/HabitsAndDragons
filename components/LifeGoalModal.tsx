import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Target } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Placeholder — docelowo wybór życiowego celu gracza (spójny z onboardingiem klas). */
export default function LifeGoalModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.cardWrap} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={["#1e1530", "#140f1a"]}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconRow}>
              <LinearGradient colors={[...Colors.gradients.purple]} style={styles.iconBg}>
                <Target size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>Twój życiowy cel</Text>
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.body}>
                Tutaj połączymy Twój główny cel życiowy z progresją w grze — spójnie z wyborem klasy i
                motywacją. Wkrótce ustawisz tu priorytet, a Mędrzec dopasuje podpowiedzi i wyzwania.
              </Text>
            </ScrollView>
            <Pressable onPress={onClose} style={styles.btnOuter}>
              <LinearGradient colors={[...Colors.gradients.gold]} style={styles.btn}>
                <Text style={styles.btnText}>Zamknij</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.dark.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardWrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  card: {
    padding: 22,
    maxHeight: "80%",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBg: {
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
    flex: 1,
  },
  scroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.dark.textSecondary,
  },
  btnOuter: {
    borderRadius: 14,
    overflow: "hidden",
  },
  btn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1228",
  },
});
