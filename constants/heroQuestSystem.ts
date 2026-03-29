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
  title: string;
  description: string;
  /** Copy for the hint sheet */
  hint: string;
  rewardGold: number;
  rewardXP?: { stat: StatType; amount: number };
  /** Optional deep link — arrow button */
  navigateTo?: HeroQuestRoute;
};

/** Codzienne rytuały — odświeżane co kalendarzowy dzień (claim reset). */
export const HERO_DAILY_RITUALS: HeroQuestDefinition[] = [
  {
    id: "daily_visit_sage",
    category: "daily",
    title: "Odwiedź Mędrca",
    description: "Porozmawiaj z Mędrcem — choć jedną wiadomość od ciebie.",
    hint: "Otwórz zakładkę Mędrzec, dotknij pola rozmowy i wyślij pierwszy promień myśli.",
    rewardGold: 18,
    rewardXP: { stat: "intelligence", amount: 6 },
    navigateTo: "/(tabs)/sage",
  },
  {
    id: "daily_complete_quest",
    category: "daily",
    title: "Zalicz dzienne zadanie",
    description: "Ukończ dowolny nawyk lub side quest przypisany na dziś.",
    hint: "Na Zamku odhacz przynajmniej jedno zadanie. Postęp liczy się od północy czasu urządzenia.",
    rewardGold: 28,
    rewardXP: { stat: "strength", amount: 8 },
    navigateTo: "/(tabs)/index",
  },
  {
    id: "daily_yesterday_reflection",
    category: "daily",
    title: "Refleksja ze wczoraj",
    description: "Zapisz krótką refleksję za wczorajszy dzień w Kronikach / planowaniu.",
    hint: "Otwórz kalendarz wypraw na Zamku, wybierz wczoraj i zapisz Daily Reflection (wymaga konta).",
    rewardGold: 22,
    rewardXP: { stat: "intelligence", amount: 10 },
    navigateTo: "/(tabs)/index",
  },
];

/** Jednorazowe kamienie milowe — claim tylko raz na całą grę. */
export const HERO_EPIC_MILESTONES: HeroQuestDefinition[] = [
  {
    id: "epic_bind_email",
    category: "epic",
    title: "Zabezpiecz tożsamość",
    description: "Połącz konto z adresem e-mail (logowanie lub profil).",
    hint: "Stuknij awatar u góry ekranu, by otworzyć profil. Zaloguj się e-mailem lub dodaj go w ustawieniach konta Supabase.",
    rewardGold: 80,
    rewardXP: { stat: "intelligence", amount: 25 },
  },
  {
    id: "epic_first_market_trade",
    category: "epic",
    title: "Pierwszy handel na rynku",
    description: "Dokonaj pierwszego zakupu za złoto w sklepie (klucz lub eliksir).",
    hint: "W zakładce D&D wydaj złoto na klucz do lochu albo Eliksir Czasu — jeden raz zaliczy kamień milowy.",
    rewardGold: 100,
    rewardXP: { stat: "agility", amount: 20 },
    navigateTo: "/(tabs)/dragon-lair",
  },
  {
    id: "epic_bind_relic",
    category: "epic",
    title: "Nałóż relikwię",
    description: "Załóż pierwszą relikwię lub broń z plecaka.",
    hint: "Otwórz plecak z Zamku lub Hero → Equipment i dotknij przedmiotu, by go założyć.",
    rewardGold: 45,
    rewardXP: { stat: "strength", amount: 15 },
    navigateTo: "/(tabs)/index",
  },
];
