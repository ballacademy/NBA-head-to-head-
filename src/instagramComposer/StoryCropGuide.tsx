import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

const SAFE_AREA_KEY = "ddgm:composer-story-safe-area";

const readSafeArea = () => readJson<unknown>(SAFE_AREA_KEY) !== false;

interface StoryCropGuideProps {
  on: boolean;
}

/** Overlay the 9:16 story clip bands plus optional IG story UI chrome. */
export function StoryCropGuide({ on }: StoryCropGuideProps) {
  const [safe, setSafe] = useState(true);

  useEffect(() => {
    setSafe(readSafeArea());
  }, []);

  if (!on) {
    return null;
  }

  return (
    <div className="sc-story-crop">
      <span className="sc-story-crop__band is-top" />
      <span className="sc-story-crop__band is-bottom" />
      {safe ? (
        <div className="sc-story-safe" aria-hidden="true">
          <div className="sc-story-safe__top">
            <span>ballacademy</span>
            <span className="sc-story-safe__dots">···</span>
          </div>
          <div className="sc-story-safe__bottom">
            <span className="sc-story-safe__reply">Send message</span>
            <span className="sc-story-safe__icons">♡ ➤</span>
          </div>
        </div>
      ) : null}
      <p className="sc-story-crop__label">9:16 clip</p>
      <button
        type="button"
        className="sc-story-crop__safe"
        aria-pressed={safe}
        aria-label="IG safe area"
        onClick={() => {
          const next = !safe;
          setSafe(next);
          writeJson(SAFE_AREA_KEY, next);
        }}
      >
        {safe ? "IG UI on" : "IG UI off"}
      </button>
    </div>
  );
}
