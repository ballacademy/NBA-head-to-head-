import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_PHOTO_EDIT_KEY = "ddgm:composer-photo-edit";

export const useComposerPhotoEdit = () => {
  const [on, setOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOn(readJson(COMPOSER_PHOTO_EDIT_KEY) === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(COMPOSER_PHOTO_EDIT_KEY, on);
  }, [hydrated, on]);

  return [on, setOn] as const;
};
