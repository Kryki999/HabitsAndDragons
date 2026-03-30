import type { StatType } from "@/types/game";

export type HeroQuestCategory = "daily" | "epic";

/** In-app tab routes for deep links from Hero quests */
export type HeroQuestRoute =
  | "/(tabs)/sage"
  | "/(tabs)/index"
  | "/(tabs)/dragon-lair"
  | "/(tabs)/kingdom";

export type HeroQuestDefinition = {
  id: string;
  category: HeroQuestCategory;
  icon: string;
  title: string;
  description: string;
  /** Copy for the hint sheet */
  hint: string;
  rewardGold: number;
  rewardXP?: { stat: StatType; amount: number };
  /** Optional deep link — arrow button */
  navigateTo?: HeroQuestRoute;
  /**
   * Tiered milestone support (epic only).
   * tiers[tierIndex] is the current tier target.
   * After claiming, the UI advances tierIndex → tierIndex+1.
   */
  tiers?: number[];
  tierIndex?: number;
  tierProgress?: number;
};

/** Codzienne rytuały — odświeżane co kalendarzowy dzień (claim reset). */
export const HERO_DAILY_RITUALS: HeroQuestDefinition[] = [
  {
    id: "daily_visit_sage",
    category: "daily",
    icon: "💬",
    title: "Powiedz mędrcowi jak się czujesz",
    description: "Porozmawiaj z Mędrcem — choć jedną wiadomość od ciebie.",
    hint: "Otwórz zakładkę Mędrzec, dotknij pola rozmowy i wyślij pierwszą myśl dnia.",
    rewardGold: 18,
    rewardXP: { stat: "intelligence", amount: 6 },
    navigateTo: "/(tabs)/sage",
  },
  {
    id: "daily_complete_quest",
    category: "daily",
    icon: "⚔️",
    title: "Zrób zadanie",
    description: "Ukończ dowolny nawyk lub side quest przypisany na dziś.",
    hint: "Na Zamku odhacz przynajmniej jedno zadanie. Postęp liczy się od północy czasu urządzenia.",
    rewardGold: 28,
    rewardXP: { stat: "strength", amount: 8 },
    navigateTo: "/(tabs)/index",
  },
  {
    id: "daily_dungeon",
    category: "daily",
    icon: "🏰",
    title: "Walcz w lochach",
    description: "Weź udział w co najmniej jednej wyprawie do lochu.",
    hint: "Przejdź do zakładki Dragon Lair, użyj klucza i pokonaj locha.",
    rewardGold: 35,
    rewardXP: { stat: "strength", amount: 10 },
    navigateTo: "/(tabs)/dragon-lair",
  },
  {
    id: "daily_save_progress",
    category: "daily",
    icon: "💾",
    title: "Save your progress",
    description: "Zsynchronizuj swój postęp z chmurą.",
    hint: "Upewnij się, że jesteś zalogowany. Progres zapisuje się automatycznie po każdej akcji.",
    rewardGold: 12,
    rewardXP: { stat: "intelligence", amount: 4 },
    navigateTo: "/(tabs)/kingdom",
  },
  {
    id: "daily_affirmations",
    category: "daily",
    icon: "🌟",
    title: "Powtórz afirmacje",
    description: "Powiedz Mędrcowi swoje codzienne afirmacje.",
    hint: "W zakładce Mędrzec napisz swoje dzisiejsze afirmacje lub poproś o ich wygenerowanie.",
    rewardGold: 20,
    rewardXP: { stat: "intelligence", amount: 7 },
    navigateTo: "/(tabs)/sage",
  },
  {
    id: "daily_gratitude",
    category: "daily",
    icon: "😊",
    title: "Z czego jesteś dzisiaj zadowolony?",
    description: "Podziel się z Mędrcem jedną pozytywną rzeczą z dnia.",
    hint: "Napisz do Mędrzeca co najmniej jedną rzecz, za którą jesteś wdzięczny lub zadowolony.",
    rewardGold: 18,
    rewardXP: { stat: "intelligence", amount: 6 },
    navigateTo: "/(tabs)/sage",
  },
  {
    id: "daily_mood",
    category: "daily",
    icon: "🎭",
    title: "Wybierz dzisiejszy nastrój",
    description: "Oceń swój nastrój w codziennej refleksji.",
    hint: "W Czasowej na Zamku otwórz dzisiejszy dzień i wypełnij sekcję Daily Reflection.",
    rewardGold: 15,
    rewardXP: { stat: "intelligence", amount: 5 },
    navigateTo: "/(tabs)/index",
  },
  {
    id: "daily_refresh_epic",
    category: "daily",
    icon: "🔄",
    title: "Odśwież epickiego questa",
    description: "Użyj rerollu epickiego questa u Mędrzeca.",
    hint: "Otwórz zakładkę Mędrzec, przewiń do sekcji Epic Quest i naciśnij przycisk rerollu.",
    rewardGold: 22,
    rewardXP: { stat: "agility", amount: 7 },
    navigateTo: "/(tabs)/sage",
  },
  {
    id: "daily_plan_tomorrow",
    category: "daily",
    icon: "📅",
    title: "Dodaj zadanie na jutro",
    description: "Zaplanuj przynajmniej jedno zadanie na następny dzień.",
    hint: "Wejdź w Oś Czasu na Zamku, wybierz jutrzejszy dzień i dodaj zadanie.",
    rewardGold: 20,
    rewardXP: { stat: "agility", amount: 6 },
    navigateTo: "/(tabs)/index",
  },
  {
    id: "daily_spend_gold",
    category: "daily",
    icon: "💰",
    title: "Wydaj 100 złota",
    description: "Dokonaj zakupu za minimum 100 złota w Dragon Lair.",
    hint: "Przejdź do Dragon Lair i kup klucz lochu lub Eliksir Czasu. Każdy zakup liczy się.",
    rewardGold: 30,
    rewardXP: { stat: "agility", amount: 8 },
    navigateTo: "/(tabs)/dragon-lair",
  },
  {
    id: "daily_notifications",
    category: "daily",
    icon: "🔔",
    title: "Włącz powiadomienia",
    description: "Upewnij się, że powiadomienia są aktywne.",
    hint: "Sprawdź ustawienia systemu i zezwól aplikacji na wysyłanie przypomnień.",
    rewardGold: 10,
    rewardXP: { stat: "intelligence", amount: 3 },
  },
  {
    id: "daily_check_history",
    category: "daily",
    icon: "📜",
    title: "Sprawdź historię nawyku",
    description: "Przejrzyj statystyki lub historię swojego nawyku.",
    hint: "W Kronikach lub Osi Czasu sprawdź historię ukończeń. Zobaczysz wzorce swojej aktywności.",
    rewardGold: 14,
    rewardXP: { stat: "intelligence", amount: 5 },
    navigateTo: "/(tabs)/index",
  },
  {
    id: "daily_reflection",
    category: "daily",
    icon: "📝",
    title: "Dodaj refleksję",
    description: "Zapisz krótką refleksję za dzisiejszy lub wczorajszy dzień.",
    hint: "Wejdź w Oś Czasu, wybierz dzień i wypełnij Daily Reflection. Nawet jedno zdanie wystarczy.",
    rewardGold: 22,
    rewardXP: { stat: "intelligence", amount: 10 },
    navigateTo: "/(tabs)/index",
  },
];

/** Progresywne kamienie milowe — system warstwowy (Tiers). */
export const HERO_EPIC_MILESTONES: HeroQuestDefinition[] = [
  {
    id: "epic_collect_items",
    category: "epic",
    icon: "🎒",
    title: "Zdobądź 1 item",
    description: "Zdobądź przedmiot z lochu i dodaj go do plecaka.",
    hint: "Pokonaj locha w Dragon Lair — każdy bos może upuścić item. Sprawdź plecak na ekranie Hero.",
    rewardGold: 60,
    rewardXP: { stat: "agility", amount: 18 },
    navigateTo: "/(tabs)/dragon-lair",
    tiers: [1, 2, 4, 8, 16],
    tierIndex: 0,
    tierProgress: 0,
  },
  {
    id: "epic_castle_level",
    category: "epic",
    icon: "🏯",
    title: "Ewoluuj zamek na poziom 2",
    description: "Rozwiń swoją twierdzę do następnego poziomu.",
    hint: "Zdobywaj XP przez ukończone nawyki i zadania. Zamek ewoluuje automatycznie wraz z poziomem gracza.",
    rewardGold: 100,
    rewardXP: { stat: "strength", amount: 25 },
    navigateTo: "/(tabs)/kingdom",
    tiers: [2, 4, 8, 16, 32],
    tierIndex: 0,
    tierProgress: 1,
  },
  {
    id: "epic_defeat_bosses",
    category: "epic",
    icon: "👹",
    title: "Pokonaj 1 różnych bossów",
    description: "Staw czoła i pokonaj unikatowych bossów w lochach.",
    hint: "Każdy locha ma innego bossa. Kolekcjonuj zwycięstwa — postęp widoczny w Dragon Lair.",
    rewardGold: 80,
    rewardXP: { stat: "strength", amount: 22 },
    navigateTo: "/(tabs)/dragon-lair",
    tiers: [1, 3, 7, 15, 30],
    tierIndex: 0,
    tierProgress: 0,
  },
  {
    id: "epic_add_friend",
    category: "epic",
    icon: "👥",
    title: "Dodaj 1 znajomego",
    description: "Połącz się z innymi graczami w Królestwie.",
    hint: "Wejdź do Królestwa i wyszukaj gracza po nazwie lub ID. Wyślij zaproszenie do gry.",
    rewardGold: 70,
    rewardXP: { stat: "intelligence", amount: 20 },
    navigateTo: "/(tabs)/kingdom",
    tiers: [1, 3, 7, 15, 30],
    tierIndex: 0,
    tierProgress: 0,
  },
  {
    id: "epic_rare_item",
    category: "epic",
    icon: "💎",
    title: "Zdobądź rzadki przedmiot",
    description: "Zdobądź przedmiot o rzadkości Rare lub wyższej.",
    hint: "Rzadkie itemy mają niski % drop z lochów wyższego poziomu. Zbieraj klucze i walcz!",
    rewardGold: 120,
    rewardXP: { stat: "agility", amount: 30 },
    navigateTo: "/(tabs)/dragon-lair",
    tiers: [1, 2, 4, 8, 16],
    tierIndex: 0,
    tierProgress: 0,
  },
];
