export const parseDailyLineupJson = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    const lineup = parsed.filter((id): id is string => typeof id === "string");

    return lineup.length === 5 ? lineup : null;
  } catch {
    return null;
  }
};

export const parseDailyMode = (
  value: string | null | undefined,
  allowed = new Set(["basic", "advanced"]),
) => (value && allowed.has(value) ? value : "basic");
