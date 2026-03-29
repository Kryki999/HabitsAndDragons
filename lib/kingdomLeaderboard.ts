import type { RealmMockHero } from "@/constants/realmMockHeroes";
import type { PlayerClass } from "@/types/game";
import { minTotalXPForLevel } from "@/lib/playerLevel";

export type KingdomLeaderboardEntry = {
  id: string;
  name: string;
  level: number;
  streak: number;
  playerClass: PlayerClass;
  totalXP: number;
  isPlayer: boolean;
  rank: number;
};

export type KingdomProfileSubject = {
  name: string;
  level: number;
  streak: number;
  playerClass: PlayerClass;
  totalXP: number;
};

export function entryToProfileSubject(e: KingdomLeaderboardEntry): KingdomProfileSubject {
  return {
    name: e.name,
    level: e.level,
    streak: e.streak,
    playerClass: e.playerClass,
    totalXP: e.totalXP,
  };
}

export function buildKingdomLeaderboard(
  player: {
    name: string;
    level: number;
    streak: number;
    playerClass: PlayerClass | null;
    totalXP: number;
  },
  mocks: RealmMockHero[],
): KingdomLeaderboardEntry[] {
  const cls: PlayerClass = player.playerClass ?? "warrior";
  const rows: Omit<KingdomLeaderboardEntry, "rank">[] = [
    ...mocks.map((m) => ({
      id: m.id,
      name: m.name,
      level: m.level,
      streak: m.streak,
      playerClass: m.playerClass,
      totalXP: minTotalXPForLevel(m.level),
      isPlayer: false as const,
    })),
    {
      id: "local_player",
      name: player.name,
      level: player.level,
      streak: player.streak,
      playerClass: cls,
      totalXP: player.totalXP,
      isPlayer: true as const,
    },
  ];
  rows.sort((a, b) => b.streak - a.streak);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function sliceMyRankingWindow(entries: KingdomLeaderboardEntry[]): KingdomLeaderboardEntry[] {
  const idx = entries.findIndex((e) => e.isPlayer);
  if (idx < 0) return entries.slice(0, Math.min(9, entries.length));
  const n = entries.length;
  const start = Math.max(0, idx - 4);
  const end = Math.min(n, idx + 5);
  return entries.slice(start, end);
}
