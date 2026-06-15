import { DIVISIONS, getDivisionForTeam, isDraftableTeam } from "./divisions";
import type { DraftSlotConstraint, Player, Position } from "./types";

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export const generateDraftSlots = (slotCount = 5): DraftSlotConstraint[] =>
  Array.from({ length: slotCount }, () => ({
    position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
    division: DIVISIONS[Math.floor(Math.random() * DIVISIONS.length)],
  }));

export const filterPlayersForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
) =>
  players.filter(
    (player) =>
      player.position === slot.position &&
      getDivisionForTeam(player.team) === slot.division &&
      isDraftableTeam(player.team) &&
      !pickedIds.has(player.id),
  );

export const sortDraftCandidates = (players: Player[]) =>
  [...players].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name),
  );

export const autoDraftLineup = (
  players: Player[],
  draftSlots: DraftSlotConstraint[],
) => {
  const lineup: string[] = [];
  const pickedIds = new Set<string>();

  for (const slot of draftSlots) {
    const candidates = sortDraftCandidates(
      filterPlayersForSlot(players, slot, pickedIds),
    );
    const selection = candidates[0];

    if (!selection) {
      break;
    }

    lineup.push(selection.id);
    pickedIds.add(selection.id);
  }

  return lineup;
};

export const formatSlotConstraint = (slot: DraftSlotConstraint) =>
  `${slot.position} from the ${slot.division}`;

export const pickBestForSlot = (
  players: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
) => sortDraftCandidates(filterPlayersForSlot(players, slot, pickedIds))[0]?.id;
