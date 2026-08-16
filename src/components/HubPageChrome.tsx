import type { ReactNode } from "react";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";

export interface HubPageChromeProps {
  /** Extra classes on the outer `.hub-feature` shell (e.g. `stats-panel`). */
  className?: string;
  title: ReactNode;
  titleId?: string;
  titleClassName?: string;
  lede?: ReactNode;
  ledeClassName?: string;
  /** When set, renders the shared return row under the title band. */
  onBack?: () => void;
  backLabel?: string;
  /** Escape still works when false; used by Beta notes. */
  backVisible?: boolean;
  children: ReactNode;
}

/**
 * Shared hub feature chrome: title band → optional return → body.
 * Logo clearance is CSS-driven whenever `.landing-hub__top` is followed by
 * `.hub-feature__return-row` (see hub.css). Root tabs omit `onBack` so the
 * title stays beside the logo.
 */
export function HubPageChrome({
  className = "",
  title,
  titleId,
  titleClassName = "",
  lede,
  ledeClassName = "",
  onBack,
  backLabel,
  backVisible = true,
  children,
}: HubPageChromeProps) {
  const rootClass = className ? `hub-feature ${className}` : "hub-feature";
  const titleClass = titleClassName
    ? `landing-hub__title ${titleClassName}`
    : "landing-hub__title";
  const ledeClass = ledeClassName
    ? `landing__lede landing-hub__lede ${ledeClassName}`
    : "landing__lede landing-hub__lede";

  return (
    <div className={rootClass} aria-labelledby={titleId}>
      <div className="landing-hub__top">
        <h1 className={titleClass} id={titleId}>
          {title}
        </h1>
        {lede != null ? <p className={ledeClass}>{lede}</p> : null}
      </div>

      {onBack ? (
        <HubFeatureReturnButton
          onBack={onBack}
          label={backLabel}
          visible={backVisible}
        />
      ) : null}

      {children}
    </div>
  );
}
