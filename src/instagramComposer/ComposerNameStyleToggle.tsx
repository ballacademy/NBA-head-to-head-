import {
  useComposerNameStyle,
  type ComposerNameStyle,
} from "./composerNameStyle";
import { ComposerHudSelect } from "./ComposerHudSelect";

const OPTIONS: Array<{ value: ComposerNameStyle; label: string }> = [
  { value: "last", label: "Last" },
  { value: "full", label: "First+last" },
  { value: "initial", label: "F. Last" },
];

export function ComposerNameStyleToggle() {
  const [style, setStyle] = useComposerNameStyle();
  return (
    <ComposerHudSelect
      label="Names"
      ariaLabel="Name style"
      value={style}
      options={OPTIONS}
      onChange={setStyle}
    />
  );
}
