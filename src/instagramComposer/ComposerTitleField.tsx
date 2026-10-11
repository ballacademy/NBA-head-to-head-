import {
  COMPOSER_TITLE_MAX_LENGTH,
  linedComposerTitle,
  onComposerTextChange,
} from "./titleLayout";

interface ComposerTitleFieldProps {
  value: string;
  lines: string[];
  ariaLabel: string;
  inputClassName: string;
  lineClassName: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function ComposerTitleField({
  value,
  lines,
  ariaLabel,
  inputClassName,
  lineClassName,
  onChange,
  maxLength = COMPOSER_TITLE_MAX_LENGTH,
}: ComposerTitleFieldProps) {
  const lined = linedComposerTitle(value, lines);
  return (
    <div className="composer-title-stack">
      {lines.map((line, index) => (
        <span key={`title-line-${index}`} className={lineClassName}>
          {line}
        </span>
      ))}
      <textarea
        className={inputClassName}
        value={lined}
        rows={Math.max(1, lines.length)}
        maxLength={maxLength + (lines.length > 1 ? 1 : 0)}
        spellCheck={false}
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
        onChange={(event) => onComposerTextChange(event, onChange, maxLength)}
      />
    </div>
  );
}
