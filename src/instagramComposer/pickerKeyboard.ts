export const pickerHighlightIndex = (
  count: number,
  current: number,
  delta: number,
) => {
  if (count <= 0) {
    return -1;
  }
  if (current < 0 || current >= count) {
    return delta >= 0 ? 0 : count - 1;
  }
  return (current + delta + count * 8) % count;
};

export const pickerIdsFromQuery = <T extends { id: string; name: string }>(
  items: T[],
  query: string,
  extra?: (item: T) => string,
) => {
  const token = query.trim().toLowerCase();
  if (!token) {
    return items.map((item) => item.id);
  }
  return items
    .filter((item) => {
      const hay = `${item.name} ${extra?.(item) ?? ""}`.toLowerCase();
      return hay.includes(token);
    })
    .map((item) => item.id);
};
