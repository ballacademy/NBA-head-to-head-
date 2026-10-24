import { readJson, writeJson } from "../lib/browserStorage";

export const LAST_BA_KEY = "ddgm:composer-last-ba";
export const LAST_NAMES_KEY = "ddgm:composer-last-names";

export const readLastShowBa = () => readJson<unknown>(LAST_BA_KEY) !== false;

export const writeLastShowBa = (on: boolean) => {
  writeJson(LAST_BA_KEY, on);
};

export const readLastShowNames = () => readJson<unknown>(LAST_NAMES_KEY) === true;

export const writeLastShowNames = (on: boolean) => {
  writeJson(LAST_NAMES_KEY, on);
};

export const storedOrLastShowBa = (value: unknown) =>
  typeof value === "boolean" ? value : readLastShowBa();

export const storedOrLastShowNames = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }
  const stored = readJson<unknown>(LAST_NAMES_KEY);
  if (stored == null) {
    return fallback;
  }
  return stored === true;
};
