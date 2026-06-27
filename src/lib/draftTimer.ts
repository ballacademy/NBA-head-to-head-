const DRAFT_DEADLINE_KEY = "nba-head-to-head-draft-deadline";

export const getDraftDeadlineKey = (matchKey: string, slot: number) =>
  `${DRAFT_DEADLINE_KEY}:${matchKey}:${slot}`;

export const saveDraftDeadline = (
  matchKey: string,
  slot: number,
  deadlineMs: number,
) => {
  sessionStorage.setItem(getDraftDeadlineKey(matchKey, slot), String(deadlineMs));
};

export const loadDraftDeadline = (matchKey: string, slot: number) => {
  const raw = sessionStorage.getItem(getDraftDeadlineKey(matchKey, slot));

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const clearDraftDeadline = (matchKey: string, slot: number) => {
  sessionStorage.removeItem(getDraftDeadlineKey(matchKey, slot));
};

export const getSecondsUntilDeadline = (deadlineMs: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadlineMs - now) / 1000));

export const isDraftDeadlineElapsed = (deadlineMs: number, now = Date.now()) =>
  now >= deadlineMs;
