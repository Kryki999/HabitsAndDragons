import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  ScrollView,
  useWindowDimensions,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Swords,
  Target,
  Wand2,
  Crown,
  Sparkles,
} from "lucide-react-native";
import { impactAsync, ImpactFeedbackStyle } from "@/lib/hapticsGate";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/lib/supabase";
import { pickCloudGameState } from "@/lib/cloudState";
import { OnboardingService } from "@/services/onboardingService";
import type { OnboardingUserProfile } from "@/types/onboardingProfile";
import type {
  PlayerClass,
  HeroGender,
  SageLifeFocus,
  OnboardingWeakness,
  OnboardingCommitment,
  OnboardingEnergyBaseline,
  OnboardingScreenDistraction,
  OnboardingStressResponse,
  OnboardingPhysicality,
  OnboardingPlanningStyle,
  OnboardingDeepProfile,
} from "@/types/game";

const FORK_STEP = 7;
const LAST_STEP = 12;
const FORGING_MS = 2000;

const SAGE_LINES: Record<number, string> = {
  1: "First: how shall the chronicles depict your silhouette?",
  2: "Every path begins with a calling. Which mantle calls to you?",
  3: "By what name shall the realm know you?",
  4: "Where do you seek the greatest forge?",
  5: "Name the shadow that gnaws at your resolve.",
  6: "How much breath can you give the craft each day?",
  7: "I know enough to forge your path. Shall we open the gates, or do you wish to reveal more?",
  8: "When the sun rises over the ruins, how much life is within you?",
  9: "Magic mirrors (phones) steal souls. How deeply are you under their spell?",
  10: "When a horde of duties charges at you, what do you do?",
  11: "Your body is your only armor. How often do you throw it into battle?",
  12: "Do you carry a map before venturing into the unknown — before each new day?",
};

const DEEP_ENERGY: {
  id: OnboardingEnergyBaseline;
  title: string;
  sub: string;
}[] = [
  { id: "high_energy", title: "Ready for battle", sub: "High energy" },
  { id: "coffee_dependent", title: "I need my elixirs", sub: "Coffee dependent" },
  { id: "low_energy", title: "I drag myself like a zombie", sub: "Low energy" },
];

const DEEP_SCREEN: {
  id: OnboardingScreenDistraction;
  title: string;
  sub: string;
}[] = [
  { id: "low_screen", title: "I command them", sub: "Low screen time" },
  { id: "average_screen", title: "I gaze too often", sub: "Average" },
  { id: "doomscroll", title: "I am trapped in the loop", sub: "Doomscrolling" },
];

const DEEP_STRESS: {
  id: OnboardingStressResponse;
  title: string;
  sub: string;
}[] = [
  { id: "organized", title: "Breathe and strike them down", sub: "Organized" },
  { id: "anxious", title: "Panic, but fight on", sub: "Anxious" },
  { id: "overwhelmed", title: "I freeze and retreat to illusions", sub: "Overwhelmed · procrastination" },
];

const DEEP_PHYSICALITY: {
  id: OnboardingPhysicality;
  title: string;
  sub: string;
}[] = [
  { id: "active", title: "Forged in sweat regularly", sub: "Active" },
  { id: "lightly_active", title: "I walk the paths, but avoid war", sub: "Lightly active" },
  { id: "sedentary", title: "My armor rusts in stillness", sub: "Sedentary" },
];

const DEEP_PLANNING: {
  id: OnboardingPlanningStyle;
  title: string;
  sub: string;
}[] = [
  { id: "todo_lists", title: "I plan every step", sub: "To-do lists" },
  { id: "mental_notes", title: "I keep a rough guide in my mind", sub: "Mental notes" },
  { id: "no_planning", title: "I dive in and rely on luck", sub: "No planning" },
];

const CLASS_CARDS: {
  id: PlayerClass;
  name: string;
  title: string;
  blurb: string;
  emoji: string;
  colors: readonly [string, string];
  accent: string;
  Icon: typeof Swords;
}[] = [
  {
    id: "warrior",
    name: "Warrior",
    title: "The Iron Vanguard",
    blurb: "Discipline and raw power — you meet resistance head-on.",
    emoji: "⚔️",
    colors: ["#ff4d6a", "#cc2244"],
    accent: Colors.dark.ruby,
    Icon: Swords,
  },
  {
    id: "hunter",
    name: "Ranger",
    title: "The Swift Shadow",
    blurb: "Precision and pace — you strike where it matters.",
    emoji: "🏹",
    colors: ["#3dd68c", "#28a06a"],
    accent: Colors.dark.emerald,
    Icon: Target,
  },
  {
    id: "mage",
    name: "Mage",
    title: "The Arcane Scholar",
    blurb: "Mind and mystery — you grow through study and focus.",
    emoji: "🔮",
    colors: ["#45d4e8", "#2ba5b8"],
    accent: Colors.dark.cyan,
    Icon: Wand2,
  },
  {
    id: "paladin",
    name: "Paladin",
    title: "The Sacred Balance",
    blurb: "Body and spirit in measure — you hold the line.",
    emoji: "🛡️",
    colors: ["#f4ca73", "#8f6ee6"],
    accent: Colors.dark.gold,
    Icon: Crown,
  },
];

function StepFade({ stepKey, children }: { stepKey: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [stepKey, opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export default function SageOnboardingWizard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const completeRealmOnboarding = useGameStore((s) => s.completeRealmOnboarding);

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<HeroGender | null>(null);
  const [cls, setCls] = useState<PlayerClass | null>(null);
  const [nickname, setNickname] = useState("");
  const [focus, setFocus] = useState<SageLifeFocus | null>(null);
  const [weakness, setWeakness] = useState<OnboardingWeakness | null>(null);
  const [commitment, setCommitment] = useState<OnboardingCommitment | null>(null);
  const [energy, setEnergy] = useState<OnboardingEnergyBaseline | null>(null);
  const [screenHabit, setScreenHabit] = useState<OnboardingScreenDistraction | null>(null);
  const [stress, setStress] = useState<OnboardingStressResponse | null>(null);
  const [physicality, setPhysicality] = useState<OnboardingPhysicality | null>(null);
  const [planning, setPlanning] = useState<OnboardingPlanningStyle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forging, setForging] = useState(false);
  const forgeSpin = useRef(new Animated.Value(0)).current;
  const deepFinishLock = useRef(false);

  const cardMaxW = Math.min(width - 32, 400);

  const progressDenom = step > FORK_STEP ? LAST_STEP : FORK_STEP;

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1:
        return gender !== null;
      case 2:
        return cls !== null;
      case 3:
        return nickname.trim().length >= 2;
      case 4:
        return focus !== null;
      case 5:
        return weakness !== null;
      case 6:
        return commitment !== null;
      case 8:
        return energy !== null;
      case 9:
        return screenHabit !== null;
      case 10:
        return stress !== null;
      case 11:
        return physicality !== null;
      default:
        return false;
    }
  }, [step, gender, cls, nickname, focus, weakness, commitment, energy, screenHabit, stress, physicality]);

  const resetDeepSelections = useCallback(() => {
    setEnergy(null);
    setScreenHabit(null);
    setStress(null);
    setPhysicality(null);
    setPlanning(null);
  }, []);

  const goNext = useCallback(() => {
    if (!canAdvance || step === FORK_STEP || step >= LAST_STEP) return;
    impactAsync(ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(LAST_STEP, s + 1));
  }, [canAdvance, step]);

  const goBack = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    if (step === 8) {
      resetDeepSelections();
      setStep(FORK_STEP);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  }, [step, resetDeepSelections]);

  useEffect(() => {
    if (!forging) {
      forgeSpin.setValue(0);
      return;
    }
    forgeSpin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(forgeSpin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [forging, forgeSpin]);

  const openGates = useCallback(async () => {
    if (!user?.id || !cls || !gender || !focus || !weakness || !commitment) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    completeRealmOnboarding({
      playerClass: cls,
      heroDisplayName: nickname.trim(),
      heroGender: gender,
      sageFocus: focus,
      weakness,
      commitment,
      deepProfile: null,
    });
    const snapshot = pickCloudGameState(useGameStore.getState());
    await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        player_class: cls,
        sage_focus: focus,
        game_state: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSubmitting(false);
    router.replace("/(tabs)" as any);
  }, [user?.id, cls, gender, focus, weakness, commitment, nickname, completeRealmOnboarding, router]);

  const askMore = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setStep(8);
  }, []);

  const completeDeepPath = useCallback(
    async (profile: OnboardingDeepProfile) => {
      if (!user?.id || !cls || !gender || !focus || !weakness || !commitment) return;
      impactAsync(ImpactFeedbackStyle.Medium);
      setForging(true);
      await new Promise((r) => setTimeout(r, FORGING_MS));
      completeRealmOnboarding({
        playerClass: cls,
        heroDisplayName: nickname.trim(),
        heroGender: gender,
        sageFocus: focus,
        weakness,
        commitment,
        deepProfile: profile,
      });
      const starterProfile: OnboardingUserProfile = {
        playerClass: cls,
        heroDisplayName: nickname.trim(),
        heroGender: gender,
        sageFocus: focus,
        weakness,
        commitment,
        deepProfile: profile,
      };
      const addHabit = useGameStore.getState().addHabit;
      for (const draft of OnboardingService.generateStarterHabits(starterProfile)) {
        addHabit(draft);
      }
      const snapshot = pickCloudGameState(useGameStore.getState());
      await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          player_class: cls,
          sage_focus: focus,
          game_state: snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setForging(false);
      router.replace("/(tabs)" as any);
    },
    [user?.id, cls, gender, focus, weakness, commitment, nickname, completeRealmOnboarding, router],
  );

  const onPickPlanning = useCallback(
    (id: OnboardingPlanningStyle) => {
      if (deepFinishLock.current || !energy || !screenHabit || !stress || !physicality) return;
      deepFinishLock.current = true;
      impactAsync(ImpactFeedbackStyle.Light);
      setPlanning(id);
      void completeDeepPath({
        energy,
        screen: screenHabit,
        stress,
        physicality,
        planning: id,
      });
    },
    [energy, screenHabit, stress, physicality, completeDeepPath],
  );

  const renderStepBody = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.choiceRow}>
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setGender("male");
              }}
              style={({ pressed }) => [
                styles.genderCard,
                { width: (cardMaxW - 12) / 2 },
                gender === "male" && styles.genderCardActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.genderEmoji}>🧙‍♂️</Text>
              <Text style={styles.genderLabel}>Masculine</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setGender("female");
              }}
              style={({ pressed }) => [
                styles.genderCard,
                { width: (cardMaxW - 12) / 2 },
                gender === "female" && styles.genderCardActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.genderEmoji}>🧙‍♀️</Text>
              <Text style={styles.genderLabel}>Feminine</Text>
            </Pressable>
          </View>
        );
      case 2:
        return (
          <View style={[styles.classGrid, { maxWidth: cardMaxW }]}>
            {CLASS_CARDS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setCls(c.id);
                }}
                style={({ pressed }) => [
                  styles.classCard,
                  cls === c.id && { borderColor: c.accent, backgroundColor: c.accent + "18" },
                  pressed && styles.pressed,
                ]}
              >
                <LinearGradient colors={[...c.colors]} style={styles.classIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <c.Icon size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.classEmoji}>{c.emoji}</Text>
                <Text style={styles.className}>{c.name}</Text>
                <Text style={styles.classTitle}>{c.title}</Text>
                <Text style={styles.classBlurb}>{c.blurb}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 3:
        return (
          <TextInput
            style={[styles.nameInput, { maxWidth: cardMaxW }]}
            placeholder="Hero name or nickname"
            placeholderTextColor={Colors.dark.textMuted}
            value={nickname}
            onChangeText={setNickname}
            maxLength={32}
            autoCapitalize="words"
          />
        );
      case 4:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {(
              [
                { id: "body" as const, title: "Health & fitness", sub: "Body, energy, movement" },
                { id: "work" as const, title: "Focus & work", sub: "Career, craft, deep work" },
                { id: "mind" as const, title: "Mindfulness", sub: "Calm, reflection, clarity" },
              ] as const
            ).map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setFocus(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  focus === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 5:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {(
              [
                { id: "procrastination" as const, title: "Procrastination", sub: "Starting is the hardest battle" },
                { id: "bad_diet" as const, title: "Poor diet", sub: "Fuel that fails the quest" },
                { id: "lack_of_sleep" as const, title: "Lack of sleep", sub: "Rest denied, will frayed" },
              ] as const
            ).map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setWeakness(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  weakness === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 6:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {(
              [
                { id: "15min" as const, title: "15 minutes", sub: "A spark each day" },
                { id: "1hour" as const, title: "About an hour", sub: "A solid session" },
                { id: "limitless" as const, title: "Limitless", sub: "I go as deep as the day allows" },
              ] as const
            ).map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setCommitment(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  commitment === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 7:
        return (
          <View style={[styles.forkRow, { maxWidth: cardMaxW }]}>
            <Pressable
              onPress={openGates}
              disabled={submitting || forging}
              style={({ pressed }) => [
                styles.gateBtn,
                styles.gateBtnPrimary,
                (submitting || forging) && styles.optionDisabled,
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient colors={[...Colors.gradients.gold]} style={styles.gateBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.gateBtnPrimaryText}>Open the Gates</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={askMore} style={({ pressed }) => [styles.gateBtn, styles.gateBtnSecondary, pressed && styles.pressed]}>
              <Text style={styles.gateBtnSecondaryText}>Ask More</Text>
            </Pressable>
          </View>
        );
      case 8:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {DEEP_ENERGY.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setEnergy(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.deepOptionCard,
                  energy === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 9:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {DEEP_SCREEN.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setScreenHabit(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.deepOptionCard,
                  screenHabit === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 10:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {DEEP_STRESS.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setStress(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.deepOptionCard,
                  stress === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 11:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {DEEP_PHYSICALITY.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setPhysicality(o.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.deepOptionCard,
                  physicality === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 12:
        return (
          <View style={[styles.optionCol, { maxWidth: cardMaxW }]}>
            {DEEP_PLANNING.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => onPickPlanning(o.id)}
                disabled={forging}
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.deepOptionCard,
                  planning === o.id && styles.optionCardActive,
                  pressed && styles.pressed,
                  forging && styles.optionDisabled,
                ]}
              >
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </Pressable>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  const forgeRotate = forgeSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <LinearGradient colors={["#120a18", "#1a0f28", "#0a0810"]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          {step > 1 ? (
            <Pressable
              onPress={goBack}
              disabled={forging}
              style={({ pressed }) => [styles.navIcon, pressed && !forging && styles.pressed, forging && { opacity: 0.35 }]}
              hitSlop={12}
            >
              <ChevronLeft size={26} color={Colors.dark.gold} />
            </Pressable>
          ) : (
            <View style={styles.navIcon} />
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / progressDenom) * 100}%` }]} />
          </View>
          <View style={styles.navIcon} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sageRow}>
            <Sparkles size={20} color={Colors.dark.purple} />
            <Text style={styles.sageLabel}>The Sage</Text>
          </View>
          <StepFade stepKey={step}>
            <Text style={[styles.sageLine, { maxWidth: cardMaxW }]}>{SAGE_LINES[step]}</Text>
            <View style={styles.bodyWrap}>{renderStepBody()}</View>
          </StepFade>
        </ScrollView>

        {step < FORK_STEP || (step > FORK_STEP && step < LAST_STEP) ? (
          <View style={styles.footer}>
            <Pressable
              onPress={goNext}
              disabled={!canAdvance || forging}
              style={({ pressed }) => [
                styles.nextBtn,
                (!canAdvance || forging) && styles.nextBtnDisabled,
                pressed && canAdvance && !forging && styles.pressed,
              ]}
            >
              <Text style={[styles.nextBtnText, (!canAdvance || forging) && styles.nextBtnTextMuted]}>Next</Text>
              <ChevronRight size={20} color={canAdvance && !forging ? "#1a1228" : Colors.dark.textMuted} />
            </Pressable>
          </View>
        ) : (
          <View style={{ height: 12 }} />
        )}
      </SafeAreaView>

      {forging ? (
        <View style={styles.forgingOverlay} pointerEvents="auto">
          <Animated.View style={{ transform: [{ rotate: forgeRotate }] }}>
            <Text style={styles.forgeRune}>ᚲ</Text>
          </Animated.View>
          <Text style={styles.forgingLine}>Forging your path...</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  navIcon: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border + "66",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: Colors.dark.gold,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  sageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  sageLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: Colors.dark.purple,
    textTransform: "uppercase",
  },
  sageLine: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    lineHeight: 26,
    textAlign: "center",
    alignSelf: "center",
    marginBottom: 22,
  },
  bodyWrap: { alignItems: "center", width: "100%" },
  choiceRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  genderCard: {
    aspectRatio: 0.85,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface + "aa",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  genderCardActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + "14",
  },
  genderEmoji: { fontSize: 48, marginBottom: 10 },
  genderLabel: { fontSize: 15, fontWeight: "800", color: Colors.dark.text },
  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  classCard: {
    width: "47%",
    minWidth: 150,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.dark.border + "aa",
    backgroundColor: Colors.dark.surface + "88",
    padding: 12,
    paddingTop: 14,
  },
  classIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  classEmoji: { fontSize: 20, marginBottom: 4 },
  className: { fontSize: 16, fontWeight: "900", color: Colors.dark.text },
  classTitle: { fontSize: 11, fontWeight: "700", color: Colors.dark.gold, marginTop: 2 },
  classBlurb: { fontSize: 11, color: Colors.dark.textMuted, marginTop: 6, lineHeight: 15 },
  nameInput: {
    width: "100%",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  optionCol: { gap: 10, width: "100%" },
  optionCard: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.dark.border + "88",
    backgroundColor: Colors.dark.surface + "99",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionCardActive: {
    borderColor: Colors.dark.gold,
    backgroundColor: Colors.dark.gold + "12",
  },
  optionTitle: { fontSize: 16, fontWeight: "800", color: Colors.dark.text },
  optionSub: { fontSize: 12, color: Colors.dark.textMuted, marginTop: 4, lineHeight: 17 },
  deepOptionCard: {
    backgroundColor: Colors.dark.surface + "bb",
    borderColor: Colors.dark.border + "aa",
  },
  optionDisabled: { opacity: 0.45 },
  forkRow: { gap: 12, width: "100%" },
  gateBtn: { borderRadius: 16, overflow: "hidden" },
  gateBtnPrimary: {},
  gateBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gateBtnPrimaryText: { fontSize: 16, fontWeight: "900", color: "#1a1228" },
  gateBtnSecondary: {
    borderWidth: 2,
    borderColor: Colors.dark.gold + "55",
    backgroundColor: "transparent",
    paddingVertical: 18,
    alignItems: "center",
  },
  gateBtnSecondaryText: { fontSize: 16, fontWeight: "800", color: Colors.dark.gold },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.gold,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextBtnDisabled: { backgroundColor: Colors.dark.surfaceLight, opacity: 0.7 },
  nextBtnText: { fontSize: 16, fontWeight: "900", color: "#1a1228" },
  nextBtnTextMuted: { color: Colors.dark.textMuted },
  pressed: { opacity: 0.88 },
  forgingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#07050cee",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  forgeRune: {
    fontSize: 72,
    fontWeight: "300" as const,
    color: Colors.dark.gold,
    textAlign: "center" as const,
  },
  forgingLine: {
    marginTop: 28,
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.4,
  },
});
