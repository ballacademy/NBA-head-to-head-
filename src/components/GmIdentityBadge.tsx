import { useId, useState } from "react";
import { copyToClipboard } from "../lib/copyToClipboard";
import {
  formatGmDisplayName,
  formatPublicTag,
} from "../lib/playerIdentity";

interface GmIdentityBadgeProps {
  name?: string;
  publicTag: string;
  playerId: string;
  showName?: boolean;
  className?: string;
}

export function GmIdentityBadge({
  name,
  publicTag,
  playerId,
  showName = Boolean(name?.trim()),
  className,
}: GmIdentityBadgeProps) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const label = showName && name?.trim()
    ? formatGmDisplayName(name, publicTag)
    : `GM code ${formatPublicTag(publicTag)}`;

  const handleCopy = async () => {
    const copied = await copyToClipboard(playerId);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <span className={["gm-identity", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="gm-identity__trigger"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
      >
        {label}
      </button>

      {expanded ? (
        <span id={detailsId} className="gm-identity__details">
          <span className="gm-identity__id" title={playerId}>
            {playerId}
          </span>
          <button
            type="button"
            className="gm-identity__copy"
            onClick={() => void handleCopy()}
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy full ID"}
          </button>
        </span>
      ) : null}
    </span>
  );
}
