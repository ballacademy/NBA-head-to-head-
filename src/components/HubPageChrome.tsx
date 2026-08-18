import type { ReactNode } from "react";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";

export interface HubPageChromeProps {
  /** Extra classes on the outer `.hub-feature` shell (e.g. `stats-panel`). */
  className?: string;
  title: ReactNode;
  titleId?: string;
  titleClassName?: string;
  /** Optional control beside the title (e.g. Player pool info). */
  titleAccessory?: ReactNode;
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
 * Title vertical position matches root hub tabs (beside the logo); return
 * sits under the title when `onBack` is set (see hub.css).
 */
export function HubPageChrome({
  className = "",
  title,
  titleId,
  titleClassName = "",
  titleAccessory,
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

  const titleNode = (
    <h1 className={titleClass} id={titleId}>
      {title}
    </h1>
  );

  return (
    <div className={rootClass} aria-labelledby={titleId}>
      <div className="landing-hub__top">
        {titleAccessory ? (
          <div className="landing-hub__title-row">
            {titleNode}
            <span className="landing-hub__title-accessory">{titleAccessory}</span>
          </div>
        ) : (
          titleNode
        )}
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
