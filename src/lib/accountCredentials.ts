export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const getUsernameValidationError = (value: string) => {
  const username = normalizeUsername(value);

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Username can only use letters, numbers, and underscores.";
  }

  return null;
};

export const getPasswordValidationError = (value: string) => {
  if (
    value.length < PASSWORD_MIN_LENGTH ||
    value.length > PASSWORD_MAX_LENGTH
  ) {
    return `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`;
  }

  return null;
};
