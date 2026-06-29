const LEET_REPLACEMENTS: Array<[string, string]> = [
  ["0", "o"],
  ["1", "i"],
  ["3", "e"],
  ["4", "a"],
  ["5", "s"],
  ["7", "t"],
  ["@", "a"],
  ["$", "s"],
];

const BLOCKED_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "kike",
  "chink",
  "spic",
  "wetback",
  "porn",
  "nazi",
  "hitler",
] as const;

const BLOCKED_WHOLE_WORDS = [
  "ass",
  "damn",
  "hell",
  "crap",
  "fag",
] as const;

export const normalizeForProfanityCheck = (value: string) => {
  let normalized = value.toLowerCase();

  for (const [from, to] of LEET_REPLACEMENTS) {
    normalized = normalized.replaceAll(from, to);
  }

  return normalized;
};

export const compactAlphaNumeric = (value: string) =>
  normalizeForProfanityCheck(value).replace(/[^a-z0-9]/g, "");

export const tokenizeForProfanityCheck = (value: string) =>
  normalizeForProfanityCheck(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const containsProfanity = (value: string) => {
  if (!value.trim()) {
    return false;
  }

  const compact = compactAlphaNumeric(value);
  const tokens = new Set(tokenizeForProfanityCheck(value));

  if (
    BLOCKED_SUBSTRINGS.some((term) => compact.includes(term)) ||
    BLOCKED_WHOLE_WORDS.some((term) => tokens.has(term))
  ) {
    return true;
  }

  return false;
};

export const PROFANITY_TEAM_NAME_ERROR =
  "Please choose a team name without offensive language.";
