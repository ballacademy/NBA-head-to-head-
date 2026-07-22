/** PBKDF2-SHA-256 password hashing for Cloudflare Workers (Web Crypto). */

export const PASSWORD_HASH_ALGORITHM = "PBKDF2-SHA256";
export const PASSWORD_PBKDF2_ITERATIONS = 310_000;
export const PASSWORD_SALT_BYTES = 16;
export const PASSWORD_HASH_BYTES = 32;

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const hexToBytes = (hex: string) => {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
};

export const timingSafeEqualHex = (left: string, right: string) => {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);

  if (!leftBytes || !rightBytes || leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index]! ^ rightBytes[index]!;
  }

  return diff === 0;
};

export const hashPassword = async (
  password: string,
  options?: {
    saltHex?: string;
    iterations?: number;
  },
) => {
  const iterations = options?.iterations ?? PASSWORD_PBKDF2_ITERATIONS;
  const providedSalt = options?.saltHex ? hexToBytes(options.saltHex) : null;
  const salt =
    providedSalt ?? crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    PASSWORD_HASH_BYTES * 8,
  );

  return {
    algorithm: PASSWORD_HASH_ALGORITHM,
    iterations,
    saltHex: bytesToHex(salt),
    hashHex: bytesToHex(new Uint8Array(derived)),
  };
};

export const verifyPassword = async (params: {
  password: string;
  saltHex: string;
  hashHex: string;
  iterations: number;
}) => {
  const hashed = await hashPassword(params.password, {
    saltHex: params.saltHex,
    iterations: params.iterations,
  });

  return timingSafeEqualHex(hashed.hashHex, params.hashHex);
};
