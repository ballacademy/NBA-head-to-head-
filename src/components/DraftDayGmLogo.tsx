interface DraftDayGmLogoProps {
  className?: string;
  title?: string;
}

const LOGO_SRC = "/draft-day-gm-logo.png";

/**
 * Renders as a CSS background mark (not &lt;img&gt;) so mobile Safari never
 * flashes the unloaded-image rectangle behind the transparent PNG.
 */
export function DraftDayGmLogo({
  className,
  title = "Draft Day GM",
}: DraftDayGmLogoProps) {
  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      style={{
        backgroundImage: `url(${LOGO_SRC})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        backgroundColor: "transparent",
      }}
    />
  );
}
