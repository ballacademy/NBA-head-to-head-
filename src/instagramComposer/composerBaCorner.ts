import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_BA_CORNER_KEY = "ddgm:composer-ba-corner";
export const COMPOSER_BA_CORNER_EVENT = "ddgm:composer-ba-corner";

export type ComposerBaCorner = "top-right" | "top-left" | "bottom-right";

export const parseComposerBaCorner = (value: unknown): ComposerBaCorner => {
  if (value === "top-left" || value === "bottom-right") {
    return value;
  }
  return "top-right";
};

export const readComposerBaCorner = () =>
  parseComposerBaCorner(readJson(COMPOSER_BA_CORNER_KEY));

export const writeComposerBaCorner = (corner: ComposerBaCorner) => {
  writeJson(COMPOSER_BA_CORNER_KEY, corner);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COMPOSER_BA_CORNER_EVENT, { detail: corner }),
    );
  }
};

export const useComposerBaCorner = () => {
  const [corner, setCorner] = useState<ComposerBaCorner>("top-right");

  useEffect(() => {
    setCorner(readComposerBaCorner());
    const sync = (event: Event) => {
      setCorner(
        parseComposerBaCorner(
          (event as CustomEvent<ComposerBaCorner>).detail ??
            readComposerBaCorner(),
        ),
      );
    };
    window.addEventListener(COMPOSER_BA_CORNER_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_BA_CORNER_EVENT, sync);
  }, []);

  return [corner, writeComposerBaCorner] as const;
};
