import salaryData from "../../data/nba-salaries-202526.json";

interface SalaryDataFile {
  season: string;
  source: string;
  salaries: Record<string, number>;
}

const salaryFile = salaryData as SalaryDataFile;

const salariesByKey = new Map(Object.entries(salaryFile.salaries));

export const PLAYER_SALARY_SEASON = salaryFile.season;

export const getPlayerSalary = (bbrPlayerId?: string, playerId?: string) => {
  if (bbrPlayerId && salariesByKey.has(bbrPlayerId)) {
    return salariesByKey.get(bbrPlayerId)!;
  }

  if (playerId && salariesByKey.has(playerId)) {
    return salariesByKey.get(playerId)!;
  }

  return undefined;
};
