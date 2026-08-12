import { useEffect, useState } from "react";
import {
  isPlayerAccountLinked,
  peekCachedAccountLinked,
  subscribeAccountLinkChanged,
} from "../lib/accountGate";
import { getOrCreatePlayerId } from "../lib/playerIdentity";

interface AccountRequiredNoteProps {
  children: string;
  className?: string;
}

/**
 * Quiet note for account-gated features.
 * Hidden while signed in (and while link status is still unknown / linked).
 */
export function AccountRequiredNote({
  children,
  className = "",
}: AccountRequiredNoteProps) {
  const playerId = getOrCreatePlayerId();
  const [visible, setVisible] = useState(() => {
    const cached = peekCachedAccountLinked(playerId);
    return cached === false;
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      const cached = peekCachedAccountLinked(playerId);
      if (cached != null) {
        setVisible(!cached);
      }

      void isPlayerAccountLinked(playerId).then((linked) => {
        if (!cancelled) {
          setVisible(!linked);
        }
      });
    };

    refresh();
    const unsubscribe = subscribeAccountLinkChanged(refresh);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [playerId]);

  if (!visible) {
    return null;
  }

  return (
    <p
      className={`account-required-note${className ? ` ${className}` : ""}`}
    >
      {children}
    </p>
  );
}
