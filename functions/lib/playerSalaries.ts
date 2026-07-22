import salaryData from "../../data/nba-salaries-202627.json";

interface SalaryDataFile {
  season: string;
  source: string;
  salaries: Record<string, number>;
}

const salaryFile = salaryData as SalaryDataFile;
const salariesByKey = new Map(Object.entries(salaryFile.salaries));

/** Resolve salary for a stored lineup player id (`bbrId` or `bbrId-team`). */
export const getSalaryForLineupPlayerId = (playerId: string) => {
  const normalized = playerId.trim();
  if (!normalized) {
    return undefined;
  }

  if (salariesByKey.has(normalized)) {
    return salariesByKey.get(normalized);
  }

  const bbrId = normalized.includes("-")
    ? normalized.slice(0, normalized.lastIndexOf("-"))
    : normalized;

  return salariesByKey.get(bbrId);
};

export const computeLineupSalaryTotal = (lineup: string[]) => {
  let total = 0;
  let missing = 0;

  for (const playerId of lineup) {
    const salary = getSalaryForLineupPlayerId(playerId);
    if (salary == null) {
      missing += 1;
      continue;
    }
    total += salary;
  }

  return { total, missing };
};
