export const FOUNDING_GM_ACCOUNT_LIMIT = 500;

export const isFoundingGmSignupIndex = (
  signupIndex: number | null | undefined,
) =>
  typeof signupIndex === "number" &&
  Number.isFinite(signupIndex) &&
  signupIndex >= 1 &&
  signupIndex <= FOUNDING_GM_ACCOUNT_LIMIT;
