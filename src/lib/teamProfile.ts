export interface TeamProfile {
  city: string;
  name: string;
}

const STORAGE_KEY = "nba-head-to-head-team-profile";

export const normalizeTeamProfile = (
  city: string,
  name: string,
): TeamProfile | null => {
  const trimmedCity = city.trim();
  const trimmedName = name.trim();

  if (!trimmedCity || !trimmedName) {
    return null;
  }

  return {
    city: trimmedCity,
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

    if (typeof parsed.city !== "string" || typeof parsed.name !== "string") {
      return null;
    }

    return normalizeTeamProfile(parsed.city, parsed.name);
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
