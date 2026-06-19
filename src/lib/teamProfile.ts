export interface TeamProfile {
  name: string;
}

const STORAGE_KEY = "nba-head-to-head-team-profile";

export const normalizeTeamProfile = (name: string): TeamProfile | null => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return null;
  }

  return {
    name: trimmedName,
  };
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
      return normalizeTeamProfile(parsed.name);
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

  storage.setItem(STORAGE_KEY, JSON.stringify(profile));
};
