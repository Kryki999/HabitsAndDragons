import React from "react";
import Colors from "@/constants/colors";
import type { DungeonLootEntry } from "@/types/dungeonLoot";
import { DoorOpen, Skull, Gem, Snowflake, Waves, Castle } from "lucide-react-native";

export interface DungeonData {
  id: string;
  name: string;
  subtitle: string;
  colors: readonly [string, string];
  accentColor: string;
  icon: React.ReactNode;
  lootTable: DungeonLootEntry[];
}

export const DUNGEONS: DungeonData[] = [
  {
    id: "portal",
    name: "Mysterious Portal",
    subtitle: "Where paths converge",
    colors: ["#6b44a0", "#2a1840"] as const,
    accentColor: Colors.dark.gold,
    icon: <DoorOpen size={28} color="#fff" />,
    lootTable: [
      {
        id: "p-sigil",
        kind: "item",
        name: "Void-Touched Sigil",
        rarity: "rare",
        description:
          "A disc that hums with unstable magic. Displayed on your profile banner as a mark of conquest.",
        icon: "orb",
      },
      {
        id: "p-chaos",
        kind: "item",
        name: "Chaos Shard",
        rarity: "epic",
        description:
          "Crystallized entropy from between worlds. Purely cosmetic trophy sparkles in your lair.",
        icon: "gem",
      },
      {
        id: "p-gold",
        kind: "gold",
        name: "Bonus gold",
        rarity: "uncommon",
        description:
          "Coins shaken loose from the portal's edge — a reliable purse filler after a hard run.",
        goldMin: 25,
        goldMax: 75,
      },
    ],
  },
  {
    id: "crypt",
    name: "Crypt of Whispers",
    subtitle: "Echoes of the fallen",
    colors: ["#3d2e5c", "#1a1220"] as const,
    accentColor: "#a89bb0",
    icon: <Skull size={28} color="#fff" />,
    lootTable: [
      {
        id: "c-bone",
        kind: "item",
        name: "Bone Key Fragment",
        rarity: "uncommon",
        description: "Too brittle to open real locks — a grim keepsake for your trophy shelf.",
        icon: "key",
      },
      {
        id: "c-essence",
        kind: "item",
        name: "Wailing Essence",
        rarity: "rare",
        description:
          "Trapped in a glass vial, it flickers when heroes pass. Cosmetic aura hook for future flair.",
        icon: "skull",
      },
      {
        id: "c-relic",
        kind: "item",
        name: "Cursed Relic",
        rarity: "rare",
        description: "A tarnished icon that whispers in menus. No stats — just undeniable edge.",
        icon: "moon",
      },
    ],
  },
  {
    id: "vault",
    name: "Ruby Vault",
    subtitle: "Kings once hoarded here",
    colors: ["#cc2a4a", "#5c1020"] as const,
    accentColor: "#ff6b8a",
    icon: <Gem size={28} color="#fff" />,
    lootTable: [
      {
        id: "v-ingot",
        kind: "item",
        name: "Ruby Ingot",
        rarity: "epic",
        description: "Too heavy for a pocket, perfect for bragging rights. Melts in story, not in combat.",
        icon: "gem",
      },
      {
        id: "v-seal",
        kind: "item",
        name: "Royal Seal Ring",
        rarity: "legendary",
        description: "The wax seal is long gone; the ring remains a symbol of old thrones.",
        icon: "crown",
      },
      {
        id: "v-gold",
        kind: "gold",
        name: "Vault spillover",
        rarity: "uncommon",
        description: "Loose coins from a king's coffer — still counts toward your daily dreams.",
        goldMin: 80,
        goldMax: 120,
      },
    ],
  },
  {
    id: "frozen",
    name: "Frozen Catacombs",
    subtitle: "Ice-bound tombs",
    colors: ["#45d4e8", "#1a4a6a"] as const,
    accentColor: "#45d4e8",
    icon: <Snowflake size={28} color="#fff" />,
    lootTable: [
      {
        id: "f-core",
        kind: "item",
        name: "Glacial Core",
        rarity: "rare",
        description: "Never melts — a centerpiece for your winter-themed profile ornaments.",
        icon: "snowflake",
      },
      {
        id: "f-crown",
        kind: "item",
        name: "Permafrost Crown",
        rarity: "epic",
        description: "Miniature, purely ornamental. Makes you look like you survived the long night.",
        icon: "crown",
      },
      {
        id: "f-charm",
        kind: "item",
        name: "Frostbite Charm",
        rarity: "uncommon",
        description: "Tickles the UI with frost motes. Zero damage, maximum style.",
        icon: "star",
      },
      {
        id: "f-gold",
        kind: "gold",
        name: "Scraped hoard",
        rarity: "common",
        description: "Coins frozen in ice — chipped free after a clean run.",
        goldMin: 15,
        goldMax: 45,
      },
    ],
  },
  {
    id: "tide",
    name: "Sunken Sanctum",
    subtitle: "Tides hide the door",
    colors: ["#2ba5b8", "#0d2830"] as const,
    accentColor: "#5dd4e8",
    icon: <Waves size={28} color="#fff" />,
    lootTable: [
      {
        id: "t-pearl",
        kind: "item",
        name: "Pearl of Depths",
        rarity: "rare",
        description: "A black pearl that pulses with bioluminescent UI particles. Pure vanity.",
        icon: "gem",
      },
      {
        id: "t-relic",
        kind: "item",
        name: "Tidal Relic",
        rarity: "epic",
        description: "Carved from shipwreck oak. Grants no swim speed — only prestige.",
        icon: "anchor",
      },
      {
        id: "t-sap",
        kind: "item",
        name: "Saltwater Sapphire",
        rarity: "rare",
        description: "Salt-crusted but still brilliant. A collector's flex.",
        icon: "sparkles",
      },
    ],
  },
  {
    id: "citadel",
    name: "Shadow Citadel",
    subtitle: "Last bastion of dread",
    colors: ["#4a2a6a", "#120818"] as const,
    accentColor: "#c49bff",
    icon: <Castle size={28} color="#fff" />,
    lootTable: [
      {
        id: "s-banner",
        kind: "item",
        name: "Dreadlord Banner",
        rarity: "rare",
        description:
          "Tattered silk that still snaps in an imaginary wind. Hang it in your hall of glory.",
        icon: "shield",
      },
      {
        id: "s-plate",
        kind: "item",
        name: "Umbral Plate",
        rarity: "epic",
        description: "Too heavy for a habit app — perfect as a cosmetic armor slot later.",
        icon: "shield",
      },
      {
        id: "s-key",
        kind: "item",
        name: "Shadowforged Key",
        rarity: "legendary",
        description: "Opens nothing yet — a promise of future content. Still shiny.",
        icon: "key",
      },
      {
        id: "s-gold",
        kind: "gold",
        name: "Citadel treasury",
        rarity: "rare",
        description:
          "Skimmed from the vault of a fallen tyrant — a hefty chunk of gold when luck rolls high.",
        goldMin: 90,
        goldMax: 130,
      },
    ],
  },
];
