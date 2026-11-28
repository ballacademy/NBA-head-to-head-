export const nextEmptySlotIndex = <T>(
  slots: T[],
  from: number,
  empty: (slot: T) => boolean,
) => {
  if (!slots.length) {
    return null;
  }
  for (let step = 1; step <= slots.length; step += 1) {
    const index = (from + step) % slots.length;
    if (empty(slots[index] as T)) {
      return index;
    }
  }
  return null;
};

export const slotMissingPlayer = (slot: { playerId?: string | null } | null | undefined) =>
  !slot?.playerId;
