import { containsProfanity } from "./profanity";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PLAYER_ID_MAX_LENGTH = 128;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const normalizeUsername = (value: string) =>
  value.trim().toLowerCase();

export const validateUsername = (value: string) => {
  const username = normalizeUsername(value);

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return {
      ok: false as const,
      error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false as const,
      error: "Username can only use letters, numbers, and underscores.",
    };
  }

  if (containsProfanity(username)) {
    return {
      ok: false as const,
      error: "That username is not allowed.",
    };
  }

  return { ok: true as const, username };
};

export const validatePassword = (value: string) => {
  if (
    value.length < PASSWORD_MIN_LENGTH ||
    value.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      ok: false as const,
      error: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`,
    };
  }

  return { ok: true as const, password: value };
};

export const validatePlayerId = (value: string) => {
  const playerId = value.trim();

  if (!playerId || playerId.length > PLAYER_ID_MAX_LENGTH) {
    return {
      ok: false as const,
      error: "A valid GM identity is required to create an account.",
    };
  }

  return { ok: true as const, playerId };
};
