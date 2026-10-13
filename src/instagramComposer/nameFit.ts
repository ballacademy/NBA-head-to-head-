/** Split a last name so long marks like GILGEOUS-ALEXANDER wrap instead of clipping. */
export const wrapNameToWidth = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
  maxLines = 2,
): string[] => {
  const value = text.replace(/\s+/g, " ").trim().toUpperCase();
  if (!value) {
    return [];
  }
  if (maxWidth <= 0 || measure(value) <= maxWidth || maxLines < 2) {
    return [value];
  }

  const tokens = value.split(/(\s+|-)/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const commit = () => {
    const trimmed = current.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
    current = "";
  };

  tokens.forEach((token) => {
    if (lines.length >= maxLines) {
      return;
    }
    const next = `${current}${token}`;
    if (!current || measure(next) <= maxWidth) {
      current = next;
      return;
    }
    if (lines.length >= maxLines - 1) {
      current = next;
      return;
    }
    commit();
    current = token.replace(/^\s+/, "");
  });
  commit();
  return lines.slice(0, maxLines);
};

export const NAME_FIRST_MAX = 16;
export const NAME_LAST_MAX = 24;
