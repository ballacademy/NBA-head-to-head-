import type { ComposerLook } from "./composerLook";
import { ComposerHudSelect } from "./ComposerHudSelect";

interface ComposerLookToggleProps {
  look: ComposerLook;
  onChange: (look: ComposerLook) => void;
}

const OPTIONS: Array<{ value: ComposerLook; label: string }> = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "none", label: "None" },
];

export function ComposerLookToggle({ look, onChange }: ComposerLookToggleProps) {
  return (
    <ComposerHudSelect
      label="Frames"
      ariaLabel="Frame color"
      value={look}
      options={OPTIONS}
      onChange={onChange}
    />
  );
}
