import { useEffect, useState } from "react";
import {
  clampPhotoGradeIntensity,
  DEFAULT_PHOTO_GRADE_MIX,
  PHOTO_GRADE_MIX_KEYS,
  readPhotoGradeMix,
  writePhotoGradeMix,
  type PhotoGradeMix,
} from "./photoGrade";

interface PhotoGradeToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  intensity?: number;
  onIntensityChange?: (value: number) => void;
  mix?: PhotoGradeMix;
  onMixChange?: (mix: PhotoGradeMix) => void;
}

const MIX_LABEL: Record<keyof PhotoGradeMix, string> = {
  structure: "Structure",
  sharpness: "Sharpness",
  high: "High",
  mid: "Mid",
  low: "Low",
  protect: "Protect shadows",
};

export function PhotoGradeToggle({
  on,
  onChange,
  intensity,
  onIntensityChange,
  mix,
  onMixChange,
}: PhotoGradeToggleProps) {
  const value = clampPhotoGradeIntensity(intensity ?? (on ? 100 : 0));
  const [localMix, setLocalMix] = useState<PhotoGradeMix>(
    mix ?? DEFAULT_PHOTO_GRADE_MIX,
  );

  useEffect(() => {
    if (mix) {
      setLocalMix(mix);
      return;
    }
    setLocalMix(readPhotoGradeMix());
  }, [mix]);

  const activeMix = mix ?? localMix;
  const setActiveMix = (next: PhotoGradeMix) => {
    if (onMixChange) {
      onMixChange(next);
      return;
    }
    setLocalMix(next);
    writePhotoGradeMix(next);
  };

  return (
    <div className="sc-grade" role="group" aria-label="Photo grade">
      <label className="sc-field sc-field--range">
        <span className="sc-toolbar__eyebrow">
          Grade <span className="sc-range__value">{value}</span>
        </span>
        <span className="sc-range">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            aria-label="Photo grade intensity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onChange={(event) => {
              const next = clampPhotoGradeIntensity(Number(event.target.value));
              if (onIntensityChange) {
                onIntensityChange(next);
                return;
              }
              onChange(next > 0);
            }}
          />
        </span>
      </label>
      {value > 0 ? (
        <div className="sc-grade__mix">
          {PHOTO_GRADE_MIX_KEYS.map((key) => (
            <label key={key} className="sc-field sc-field--range">
              <span className="sc-toolbar__eyebrow">
                {MIX_LABEL[key]}{" "}
                <span className="sc-range__value">{activeMix[key]}</span>
              </span>
              <span className="sc-range">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={activeMix[key]}
                  aria-label={MIX_LABEL[key]}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={activeMix[key]}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onChange={(event) =>
                    setActiveMix({
                      ...activeMix,
                      [key]: clampPhotoGradeIntensity(Number(event.target.value)),
                    })
                  }
                />
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
