import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export type ComposerNameStyle = "full" | "last" | "initial";

export const COMPOSER_NAME_STYLE_KEY = "ddgm:composer-name-style";

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

export const useComposerNameStyle = () => {
  const [style, setStyle] = useState<ComposerNameStyle>("full");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStyle(readComposerNameStyle());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeComposerNameStyle(style);
  }, [hydrated, style]);

  return [style, setStyle] as const;
};
