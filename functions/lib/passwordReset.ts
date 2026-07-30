import { timingSafeEqualHex } from "./passwordHash";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS = 8;
export const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Normalize user-entered reset codes for hashing/compare. */
export const normalizeResetCode = (value: string) =>
  value.trim().toLowerCase().replace(/[\s-]+/g, "");

export const validateResetCodeFormat = (value: string) => {
  const normalized = normalizeResetCode(value);
  if (!/^[a-f0-9]{8}$/.test(normalized)) {
    return {
      ok: false as const,
      error: "Enter the 8-character reset code from support.",
    };
  }

  return { ok: true as const, code: normalized };
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** SHA-256 hex of a normalized reset code (Workers + browser safe). */
export const hashResetCode = async (code: string) => {
  const bytes = new TextEncoder().encode(normalizeResetCode(code));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
};

export const generateResetCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return bytesToHex(bytes).toUpperCase();
};

export const resetCodeHashesMatch = (leftHash: string, rightHash: string) =>
  timingSafeEqualHex(leftHash, rightHash);

export const buildPasswordResetRateLimitKey = (
  request: Request,
  username: string,
) => {
  const forwarded =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `reset:${forwarded.slice(0, 64)}:${username}`.slice(0, 160);
};
