import type { Player } from "./types";
import type { PlayerRecord } from "./playerRecord";

export type EraId = "2010s" | "1990s";

export const ERA_2010S_WIN_THRESHOLD = 50;
export const ERA_1990S_WIN_THRESHOLD = 100;

export interface EraDefinition {
  id: EraId;
  title: string;
  description: string;
  winThreshold: number;
}

export const ERA_DEFINITIONS: EraDefinition[] = [
  {
    id: "2010s",
    title: "2010s Legends",
    description: "Unlock Prime Harden, Heat LeBron, and more after 50 wins.",
    winThreshold: ERA_2010S_WIN_THRESHOLD,
  },
  {
    id: "1990s",
    title: "90s Legends",
    description: "Unlock Jordan, Hakeem, Mailman, and more after 100 wins.",
    winThreshold: ERA_1990S_WIN_THRESHOLD,
  },
];

export const getUnlockedEras = (
  record: Pick<PlayerRecord, "wins">,
): EraId[] => {
  const unlocked: EraId[] = [];

  if (record.wins >= ERA_2010S_WIN_THRESHOLD) {
    unlocked.push("2010s");
  }

  if (record.wins >= ERA_1990S_WIN_THRESHOLD) {
    unlocked.push("1990s");
  }

  return unlocked;
};

export const isEraUnlocked = (
  era: EraId,
  record: Pick<PlayerRecord, "wins">,
) => getUnlockedEras(record).includes(era);

export const getEraProgress = (record: Pick<PlayerRecord, "wins">) =>
  ERA_DEFINITIONS.map((era) => ({
    ...era,
    isUnlocked: record.wins >= era.winThreshold,
    winsRemaining: Math.max(era.winThreshold - record.wins, 0),
  }));

export const isEraPlayer = (player: Pick<Player, "era">) => Boolean(player.era);
