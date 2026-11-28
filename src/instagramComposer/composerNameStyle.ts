import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export type ComposerNameStyle = "full" | "last" | "initial";

export const COMPOSER_NAME_STYLE_KEY = "ddgm:composer-name-style";
export const COMPOSER_NAME_STYLE_EVENT = "ddgm:composer-name-style";

export const parseComposerNameStyle = (value: unknown): ComposerNameStyle => {
  if (value === "last" || value === "last-only") {
    return "last";
  }
  if (value === "initial" || value === "first-initial") {
    return "initial";
  }
  return "full";
};

export const readComposerNameStyle = () =>
  parseComposerNameStyle(readJson<unknown>(COMPOSER_NAME_STYLE_KEY));

export const writeComposerNameStyle = (style: ComposerNameStyle) => {
  writeJson(COMPOSER_NAME_STYLE_KEY, style);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPOSER_NAME_STYLE_EVENT));
  }
};

const COMPOSER_NAME_SUFFIXES = new Set([
  "JR",
  "JUNIOR",
  "SR",
  "SENIOR",
  "II",
  "III",
  "IV",
  "V",
]);

const nameTokens = (...parts: string[]) =>
  parts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

/** Jr. / Sr. / II–V at the end of a name, not Jrue / IV as a first token. */
export const isComposerNameSuffix = (token: string) =>
  COMPOSER_NAME_SUFFIXES.has(token.replace(/[.,]/g, "").trim().toUpperCase());

const withSuffix = (family: string, suffix: string) =>
  [family, suffix].filter(Boolean).join(" ");

export const parseComposerPersonName = (firstName: string, lastName = "") => {
  const tokens = nameTokens(firstName, lastName);
  let suffix = "";
  if (tokens.length >= 2 && isComposerNameSuffix(tokens.at(-1)!)) {
    suffix = tokens.pop()!;
  }
  if (tokens.length === 0) {
    return { firstName: "", lastName: suffix, suffix: "" };
  }
  if (tokens.length === 1) {
    if (suffix) {
      return { firstName: "", lastName: tokens[0]!, suffix };
    }
    return { firstName: tokens[0]!, lastName: "", suffix };
  }
  return {
    firstName: tokens.slice(0, -1).join(" "),
    lastName: tokens.at(-1)!,
    suffix,
  };
};

export const splitComposerPersonName = (full: string) => {
  const parsed = parseComposerPersonName(full);
  return {
    firstName: parsed.firstName,
    lastName: withSuffix(parsed.lastName, parsed.suffix),
  };
};

export const formatComposerName = (
  firstName: string,
  lastName: string,
  style: ComposerNameStyle = readComposerNameStyle(),
) => {
  const parsed = parseComposerPersonName(firstName, lastName);
  const first = parsed.firstName;
  const last = parsed.lastName;
  if (!first && !last && !parsed.suffix) {
    return "";
  }
  if (style === "last") {
    return last || first || parsed.suffix;
  }
  if (style === "initial") {
    if (first && last) {
      return `${first.charAt(0).toUpperCase()}. ${last}`;
    }
    return last || first || parsed.suffix;
  }
  return `${first} ${withSuffix(last, parsed.suffix)}`.replace(/\s+/g, " ").trim();
};

export const formatComposerPersonName = (
  full: string,
  style: ComposerNameStyle = readComposerNameStyle(),
) => {
  const names = splitComposerPersonName(full);
  return formatComposerName(names.firstName, names.lastName, style);
};

export const composerNameLines = (
  firstName: string,
  lastName: string,
  style: ComposerNameStyle = readComposerNameStyle(),
) => {
  const parsed = parseComposerPersonName(firstName, lastName);
  const first = parsed.firstName;
  const last = parsed.lastName;
  if (!first && !last && !parsed.suffix) {
    return { given: "", family: "" };
  }
  if (style === "last") {
    return { given: "", family: last || first || parsed.suffix };
  }
  if (style === "initial") {
    return { given: "", family: formatComposerName(firstName, lastName, "initial") };
  }
  return { given: first, family: withSuffix(last, parsed.suffix) };
};

export const useComposerNameStyle = () => {
  const [style, setStyleState] = useState<ComposerNameStyle>(readComposerNameStyle);

  const setStyle = useCallback((next: ComposerNameStyle) => {
    writeComposerNameStyle(next);
    setStyleState(next);
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = readComposerNameStyle();
      setStyleState((current) => (current === next ? current : next));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === COMPOSER_NAME_STYLE_KEY || event.key === null) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(COMPOSER_NAME_STYLE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COMPOSER_NAME_STYLE_EVENT, sync);
    };
  }, []);

  return [style, setStyle] as const;
};
