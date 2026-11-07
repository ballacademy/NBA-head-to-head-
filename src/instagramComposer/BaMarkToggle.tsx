import { writeLastShowBa } from "./composerBoardDefaults";
import {
  useComposerBaCorner,
  type ComposerBaCorner,
} from "./composerBaCorner";
import { ComposerHudSelect } from "./ComposerHudSelect";

interface BaMarkToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

type BaMarkChoice = "off" | ComposerBaCorner;

const OPTIONS: Array<{ value: BaMarkChoice; label: string }> = [
  { value: "off", label: "Off" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-right", label: "Bottom right" },
];

export function BaMarkToggle({ on, onChange }: BaMarkToggleProps) {
  const [corner, setCorner] = useComposerBaCorner();
  const value: BaMarkChoice = on ? corner : "off";
  return (
    <ComposerHudSelect
      label="BA mark"
      ariaLabel="BA mark"
      value={value}
      options={OPTIONS}
      onChange={(next) => {
        if (next === "off") {
          writeLastShowBa(false);
          onChange(false);
          return;
        }
        setCorner(next);
        if (!on) {
          writeLastShowBa(true);
          onChange(true);
        }
      }}
    />
  );
}
