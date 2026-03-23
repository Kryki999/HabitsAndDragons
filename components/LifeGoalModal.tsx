import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Target, Dumbbell, Brain, Briefcase, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useGameStore } from "@/store/gameStore";
import type { SageLifeFocus } from "@/types/game";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const OPTIONS: {
  id: SageLifeFocus;
  title: string;
  desc: string;
  Icon: typeof Dumbbell;
}[] = [
  {
    id: "body",
    title: "Ciało",
    desc: "Zdrowie, ruch, sen i siła — Mędrzec prowadzi cię przez nawyki ciała.",
    Icon: Dumbbell,
  },
  {
    id: "mind",
    title: "Umysł",
    desc: "Nauka, fokus i spokój — rady pod kątem rozwoju mentalnego.",
    Icon: Brain,
  },
  {
    id: "work",
    title: "Praca",
    desc: "Kariera i dyscyplina — małe kroki w codziennej pracy.",
    Icon: Briefcase,
  },
];

export default function LifeGoalModal({ visible, onClose }: Props) {
  const sageFocus = useGameStore((s) => s.sageFocus);
  const setSageFocus = useGameStore((s) => s.setSageFocus);

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
            <Text style={styles.lead}>
              Wybierz fokus — Starszy Mędrzec (i jego kryształowa kula) dostosuje rady do tego wątku.
            </Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {OPTIONS.map((opt) => {
                const selected = sageFocus === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSageFocus(opt.id)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={styles.optionIconWrap}>
                      <opt.Icon size={22} color={selected ? Colors.dark.gold : Colors.dark.textSecondary} />
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    {selected ? (
                      <View style={styles.checkWrap}>
                        <Check size={22} color={Colors.dark.emerald} />
                      </View>
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={onClose} style={styles.btnOuter}>
              <LinearGradient colors={[...Colors.gradients.gold]} style={styles.btn}>
                <Text style={styles.btnText}>Gotowe</Text>
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
    maxHeight: "85%",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
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
  lead: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.dark.textSecondary,
    marginBottom: 14,
  },
  scroll: {
    maxHeight: 320,
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: Colors.dark.surface + "99",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 12,
  },
  optionSelected: {
    borderColor: Colors.dark.gold + "88",
    backgroundColor: "#2a2038",
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionIconWrap: {
    paddingTop: 2,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.dark.textMuted,
  },
  checkWrap: {
    marginTop: 2,
    justifyContent: "center",
  },
  checkPlaceholder: {
    width: 22,
    height: 22,
    marginTop: 2,
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
