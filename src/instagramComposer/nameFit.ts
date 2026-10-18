import { measureTitleAdvance } from "./titleLayout";

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

const truncateWithPeriod = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string => {
  const stem = text.replace(/[.\s]+$/g, "");
  let fit = ".";
  for (let index = 1; index <= stem.length; index += 1) {
    const candidate = `${stem.slice(0, index).replace(/[-\s]+$/g, "")}.`;
    if (measure(candidate) <= maxWidth) {
      fit = candidate;
    } else {
      break;
    }
  }
  return fit;
};

const pickLongerFit = (
  candidates: string[],
  maxWidth: number,
  measure: (value: string) => number,
) => {
  const fits = candidates.filter(
    (candidate) => candidate && measure(candidate) <= maxWidth,
  );
  if (fits.length === 0) {
    return null;
  }
  return fits.reduce((best, next) => (next.length > best.length ? next : best));
};

/**
 * When a name does not fit, abbreviate with a period instead of shrinking
 * the face. Hyphenated last names prefer `GILGEOUS-A.` or `G.-ALEXANDER`
 * (whichever is longer while still fitting). Names that already fit stay full.
 */
export const abbreviateOverflowName = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string => {
  const value = text.replace(/\s+/g, " ").trim().toUpperCase();
  if (!value) {
    return "";
  }
  if (maxWidth <= 0 || measure(value) <= maxWidth) {
    return value;
  }

  const prefixMatch = value.match(/^([A-Z]\.\s+)(.+)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1]!;
    const rest = prefixMatch[2]!;
    const restFit = abbreviateOverflowName(
      rest,
      Math.max(0, maxWidth - measure(prefix)),
      measure,
    );
    const combined = `${prefix}${restFit}`.replace(/\s+/g, " ").trim();
    if (combined && measure(combined) <= maxWidth) {
      return combined;
    }
  }

  const hyphen = value.lastIndexOf("-");
  if (hyphen > 0 && hyphen < value.length - 1) {
    const left = value.slice(0, hyphen);
    const right = value.slice(hyphen + 1);
    const shortRight = `${left}-${right[0]}.`;
    const shortLeft = `${left[0]}.-${right}`;
    const fit = pickLongerFit([shortLeft, shortRight], maxWidth, measure);
    if (fit) {
      return fit;
    }
    const trimmedRight = truncateWithPeriod(right, Math.max(0, maxWidth - measure(`${left[0]}.-`) ), measure);
    const leftForm = `${left[0]}.-${trimmedRight.replace(/\.$/, "")}.`.replace("..", ".");
    const trimmedLeft = truncateWithPeriod(left, Math.max(0, maxWidth - measure(`-${right[0]}.`)), measure);
    const rightForm = `${trimmedLeft.replace(/\.$/, "")}-${right[0]}.`;
    return (
      pickLongerFit([leftForm, rightForm], maxWidth, measure) ??
      truncateWithPeriod(value, maxWidth, measure)
    );
  }

  return truncateWithPeriod(value, maxWidth, measure);
};

export const fittedCellNames = (
  firstName: string,
  lastName: string,
  maxWidth: number,
  familySize: number,
  givenSize: number,
) => {
  const familyAdvance = maxWidth / Math.max(1, familySize);
  const givenAdvance = maxWidth / Math.max(1, givenSize);
  return {
    firstName: abbreviateOverflowName(firstName, givenAdvance, (value) =>
      measureTitleAdvance(value, 0.08),
    ),
    lastName: abbreviateOverflowName(lastName, familyAdvance, (value) =>
      measureTitleAdvance(value, 0.04),
    ),
  };
};

export const NAME_FIRST_MAX = 16;
export const NAME_LAST_MAX = 24;
