interface DraftDayGmLogoProps {
  className?: string;
  title?: string;
}

const LOGO_SRC = "/draft-day-gm-logo.png";

export function DraftDayGmLogo({
  className,
  title = "Draft Day GM",
}: DraftDayGmLogoProps) {
  return (
    <img
      className={className}
      src={LOGO_SRC}
      alt={title}
      width={200}
      height={236}
      draggable={false}
      decoding="async"
    />
  );
}
