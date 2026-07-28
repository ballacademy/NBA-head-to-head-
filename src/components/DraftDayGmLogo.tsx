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
      width={720}
      height={720}
      draggable={false}
      decoding="async"
    />
  );
}
