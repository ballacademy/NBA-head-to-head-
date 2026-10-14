export const DEFAULT_PLAY_IN_TITLE = "NBA PLAY-IN";
export const PLAY_IN_SIZES = [8, 10] as const;
export type PlayInSize = (typeof PLAY_IN_SIZES)[number];

export const playInSeeds = (size: PlayInSize) =>
  size === 10 ? [6, 7, 8, 9, 10] : [7, 8, 9, 10];

export interface PlayInDraft {
  title: string;
  size: PlayInSize;
  east: Array<string | null>;
  west: Array<string | null>;
  showBa?: boolean;
}

export const parsePlayInSize = (value: unknown): PlayInSize =>
  value === 10 ? 10 : 8;

export const emptySide = (size: PlayInSize): Array<string | null> =>
  playInSeeds(size).map(() => null);

export const resizeSide = (
  slots: Array<string | null> | undefined,
  size: PlayInSize,
): Array<string | null> => {
  const next = emptySide(size);
  (slots ?? []).slice(0, next.length).forEach((id, index) => {
    next[index] = id ?? null;
  });
  return next;
};

export const isPlayInDraft = (value: unknown): value is PlayInDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PlayInDraft).title === "string" &&
      Array.isArray((value as PlayInDraft).east) &&
      Array.isArray((value as PlayInDraft).west),
  );

export const defaultPlayInDraft = (): PlayInDraft => ({
  title: DEFAULT_PLAY_IN_TITLE,
  size: 8,
  east: emptySide(8),
  west: emptySide(8),
  showBa: true,
});
