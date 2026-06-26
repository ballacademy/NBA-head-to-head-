/** Calendar-month ranked seasons (e.g. `2026-06`). */
export const getCurrentSeasonId = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

export const formatSeasonLabel = (seasonId: string) => {
  const [yearText, monthText] = seasonId.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return seasonId;
  }

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};
