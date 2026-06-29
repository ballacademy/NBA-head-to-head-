import { containsProfanity, PROFANITY_TEAM_NAME_ERROR } from "./profanity";
import { syncTeamNameToLeaderboards } from "./syncLeaderboardTeamName";

export interface TeamProfile {
  name: string;
}

export const MAX_TEAM_NAME_LENGTH = 32;

export type TeamProfileValidationError = "empty" | "profanity";

export type TeamProfileValidationResult =
  | { ok: true; profile: TeamProfile }
  | { ok: false; error: TeamProfileValidationError };

const STORAGE_KEY = "nba-head-to-head-team-profile";

export const validateTeamProfile = (
  name: string,
): TeamProfileValidationResult => {
  const trimmedName = name.trim().slice(0, MAX_TEAM_NAME_LENGTH);

  if (!trimmedName) {
    return { ok: false, error: "empty" };
  }

  if (containsProfanity(trimmedName)) {
    return { ok: false, error: "profanity" };
  }

  return {
    ok: true,
    profile: {
      name: trimmedName,
    },
  };
};

export const getTeamProfileValidationMessage = (
  error: TeamProfileValidationError,
) => {
  switch (error) {
    case "profanity":
      return PROFANITY_TEAM_NAME_ERROR;
    default:
      return "Enter a team name to start drafting.";
  }
};

export const normalizeTeamProfile = (name: string): TeamProfile | null => {
  const result = validateTeamProfile(name);

  return result.ok ? result.profile : null;
};

interface ProfileStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const getStorage = (): ProfileStorage | null => {
  const candidate = globalThis as typeof globalThis & {
    localStorage?: ProfileStorage;
  };

  return candidate.localStorage ?? null;
};

export const loadTeamProfile = (): TeamProfile | null => {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<TeamProfile>;

    if (typeof parsed.name === "string") {
      const trimmedName = parsed.name.trim().slice(0, MAX_TEAM_NAME_LENGTH);

      if (!trimmedName) {
        return null;
      }

      return { name: trimmedName };
    }

    return null;
  } catch {
    return null;
  }
};

export const saveTeamProfile = (profile: TeamProfile) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const validated = validateTeamProfile(profile.name);

  if (!validated.ok) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(validated.profile));
  syncTeamNameToLeaderboards(validated.profile);
};
