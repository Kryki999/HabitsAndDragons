import type { PlayerClass } from "@/types/game";

/** MVP: sztuczni rywale na tablicy Kingdom — prawdziwe ID przedmiotów z lochów. */
export interface RealmMockHero {
  id: string;
  name: string;
  playerClass: PlayerClass;
  level: number;
  streak: number;
  outfitItemId: string | null;
  relicItemId: string | null;
}

export const REALM_MOCK_HEROES: RealmMockHero[] = [
  {
    id: "m1",
    name: "Seraphine Blackwell",
    playerClass: "mage",
    level: 24,
    streak: 287,
    outfitItemId: "f-crown",
    relicItemId: "p-chaos",
  },
  {
    id: "m2",
    name: "Garrick Ashford",
    playerClass: "warrior",
    level: 19,
    streak: 164,
    outfitItemId: "s-plate",
    relicItemId: "s-key",
  },
  {
    id: "m3",
    name: "Lyra Nightwind",
    playerClass: "hunter",
    level: 31,
    streak: 142,
    outfitItemId: "s-banner",
    relicItemId: "v-seal",
  },
  {
    id: "m4",
    name: "Orin Thrice-Bound",
    playerClass: "mage",
    level: 15,
    streak: 58,
    outfitItemId: null,
    relicItemId: "t-relic",
  },
  {
    id: "m5",
    name: "Kaelen Frost",
    playerClass: "hunter",
    level: 11,
    streak: 21,
    outfitItemId: "f-crown",
    relicItemId: "c-bone",
  },
  {
    id: "m6",
    name: "Mordred Vane",
    playerClass: "warrior",
    level: 8,
    streak: 7,
    outfitItemId: "s-banner",
    relicItemId: "f-charm",
  },
  {
    id: "m7",
    name: "Sister Morwen",
    playerClass: "mage",
    level: 5,
    streak: 3,
    outfitItemId: null,
    relicItemId: "p-sigil",
  },
  {
    id: "m8",
    name: "Rook Hollow",
    playerClass: "hunter",
    level: 3,
    streak: 0,
    outfitItemId: null,
    relicItemId: null,
  },
];
