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

export const splitComposerPersonName = (full: string) => {
  const parts = full.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)!,
  };
};

export const formatComposerName = (
  firstName: string,
  lastName: string,
  style: ComposerNameStyle = readComposerNameStyle(),
) => {
  const first = firstName.replace(/\s+/g, " ").trim();
  const last = lastName.replace(/\s+/g, " ").trim();
  if (!first && !last) {
    return "";
  }
  if (style === "last") {
    return last || first;
  }
  if (style === "initial") {
    if (first && last) {
      return `${first.charAt(0).toUpperCase()}. ${last}`;
    }
    return last || first;
  }
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
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
  const first = firstName.replace(/\s+/g, " ").trim();
  const last = lastName.replace(/\s+/g, " ").trim();
  if (!first && !last) {
    return { given: "", family: "" };
  }
  if (style === "last") {
    return { given: "", family: last || first };
  }
  if (style === "initial") {
    if (first && last) {
      return { given: `${first.charAt(0).toUpperCase()}.`, family: last };
    }
    return { given: "", family: last || first };
  }
  return { given: first, family: last };
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
