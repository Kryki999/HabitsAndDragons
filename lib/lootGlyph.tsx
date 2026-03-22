import React from "react";
import {
  Gem,
  Crown,
  Shield,
  Sparkles,
  Skull,
  Flame,
  Snowflake,
  KeyRound,
  Scroll,
  Star,
  Coins,
  Swords,
  CircleDot,
  Anchor,
  Moon,
} from "lucide-react-native";
import type { LootIconId } from "@/types/dungeonLoot";

export function LootGlyph({
  icon,
  size,
  color,
}: {
  icon: LootIconId;
  size: number;
  color: string;
}) {
  const p = { size, color };
  switch (icon) {
    case "gem":
      return <Gem {...p} />;
    case "crown":
      return <Crown {...p} />;
    case "shield":
      return <Shield {...p} />;
    case "sparkles":
      return <Sparkles {...p} />;
    case "skull":
      return <Skull {...p} />;
    case "flame":
      return <Flame {...p} />;
    case "snowflake":
      return <Snowflake {...p} />;
    case "key":
      return <KeyRound {...p} />;
    case "scroll":
      return <Scroll {...p} />;
    case "star":
      return <Star {...p} />;
    case "coins":
      return <Coins {...p} />;
    case "sword":
      return <Swords {...p} />;
    case "orb":
      return <CircleDot {...p} />;
    case "anchor":
      return <Anchor {...p} />;
    case "moon":
      return <Moon {...p} />;
    default:
      return <Sparkles {...p} />;
  }
}
