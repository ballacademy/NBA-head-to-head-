/** Badge copy for a picker card that is already placed on the board. */
export const usedChipLabel = (usedLabel: string) => {
  if (usedLabel.startsWith("On ")) {
    return `On board · ${usedLabel.slice(3)}`;
  }
  if (usedLabel === "This row") {
    return "On board · this row";
  }
  if (usedLabel.startsWith("Now ")) {
    return `Used · ${usedLabel.slice(4)}`;
  }
  return "On board";
};
