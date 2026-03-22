# 🐉 Habits & Dragons

> **Projekt: Habits & Dragons (Kryptonim)**

## 📱 Czym to jest (Elevator Pitch)
To aplikacja typu Habit Tracker (śledzenie nawyków), która używa zaawansowanej psychologii gier (Game Designu), aby uzależnić użytkowników od... dbania o siebie. Zamiast nudnych list To-Do, gracz staje się bohaterem RPG, a jego codzienne, realne zadania zasilają wirtualne królestwo.

## 🛠️ Technologia i "Sok" (Game Feel)
*   **Silnik:** React Native (Expo) + Zustand (zarządzanie stanem). Nie robimy ociężałego 3D, które zżera baterię jak konkurencja (np. Goal Hero).
*   **Grafika:** Piękne, komiksowe, izometryczne 2D (w stylu Shakes & Fidget).
*   **Wydajność:** Ożywiamy świat metodą "Kanapki" – na statyczne, śliczne tła nakładamy lekkie, wektorowe animacje LottieFiles (np. płonące ognisko, padający śnieg), co daje 60 FPS i natychmiastowe reakcje z mocnymi wibracjami (Haptics).

---

## ⚔️ Główne Mechaniki (Rozgrywka)

### 1. Personalizacja (4 Klasy i Płeć)
Gracz na starcie wybiera płeć oraz jedną z 4 klas, które odpowiadają jego życiowym celom (choć nie blokują mu żadnej drogi rozwoju):
*   🗡️ **Wojownik (Siła):** Nastawiony na siłownię, sylwetkę i dietę.
*   🏹 **Łowca (Zwinność):** Nastawiony na cardio, bieganie, sen i zrzucanie wagi.
*   📖 **Mag (Inteligencja):** Nastawiony na czytanie, języki, biznes i zdrowie mentalne.
*   🛡️ **Paladyn (Zrównoważony):** Dla tych, którzy chcą poprawić każdy aspekt życia po równo.

### 2. Dynamiczne Obozowisko i "Ognisko Streaku"
Za wykonywanie nawyków gracz zdobywa EXP (doświadczenie) i Złoto. Wraz z poziomami jego obóz ewoluuje przez 10 etapów – od zwykłego namiotu, przez drewniany fort, aż po Legendarną Cytadelę z lewitującymi wieżami. 

> 🏕️ **Haczyk UX:** Serce obozu to animowane ognisko. Jeśli gracz utrzymuje Streak (wykonuje zadania codziennie), ogień płonie jasno, a pogoda jest słoneczna. Jeśli straci Streak – ognisko gaśnie do żarzących się węgli, a nad zamkiem zbierają się deszczowe chmury.

### 3. Mędrzec (Charyzmatyczna Maskotka)
Nasz odpowiednik "sówki z Duolingo". Zwariowany, hiperaktywny czarodziej z wielką klepsydrą, który lewituje na ekranie. Komentuje postępy, daje codzienne "Epickie Questy" (np. "Zrób 30 pajacyków teraz!") za bonusowe Złoto i obraża się, gdy łamiemy Streak.

---

## 🧠 Mechaniki Uzależniające (End-game i Retencja)

### 4. Legowisko Smoków (Pety)
Utrzymywanie długich streaków (np. 10, 20, 30 dni) odblokowuje Smoki, które dołączają do obozu gracza jako strażnicy.

### 5. Lochy (Dungeons) – Zmienna Nagroda (Od 10 Poziomu)
Absolutny killer-feature. Lochy to szybka, klikana wyprawa (Auto-Resolve).
*   🕒 **Jak to działa:** Dostępne tylko 1 razy dziennie (blokada czasowa, żeby zapobiegać wypaleniu).
*   💰 **Ekonomia:** Klucze do lochów kosztują ogromne ilości Złota (Gold Sink) lub mają 5% szansy na wypadnięcie z każdego zwykłego odhaczonego nawyku (efekt kasyna – nagle nawet wypicie wody jest ekscytujące!).
*   👑 **Nagrody:** Wyłącznie kosmetyczne dodatki (skiny, aury, gadżety jak latający dywan). Brak statystyk, żeby nie psuć balansu RPG. Gracz po prostu chce niesamowicie wyglądać.

### 6. Mapa Prowincji (Faza 2 - Social Accountability)
Zamiast "listy znajomych", gracz przesuwa izometryczną mapę, na której widzi zamki i avatary (w tym zdobyte kosmetyki i smoki) swoich znajomych z prawdziwego życia. Presja społeczna i chęć pokazania swojego statusu to najlepszy "anty-cheat" przeciwko oszukiwaniu w nawykach.

---

## V2 / Future Backlog

Planowany rozwój (wysokopoziomowo — bez obietnic terminów):

- **Friends System & Direct Messaging (Czat)** — znajomi w grze, wiadomości bezpośrednie, obecność online.
- **Leaderboard filtering (Global vs. Friends)** — przełącznik zakresu rankingu: świat vs. znajomi.
- **Guilds / Clans with Co-op Weekly Quests** — gildie, tygodniowe questy drużynowe, wspólne cele.
- **Global World Bosses (Weekend events)** — światowi bossowie w weekendy, eventy sezonowe.
- **Crafting System (Forging duplicate items into higher rarity)** — przepalanie duplikatów w wyższą rzadkość.
- **Player-to-Player Marketplace (Trading)** — handel między graczami, giełda przedmiotów kosmetycznych.
- **SFX & Epic UI sounds** — pełna warstwa audio: UI, lochy, nagrody, ambient.

*Ten backlog może się zmieniać w miarę rozwoju produktu.*
