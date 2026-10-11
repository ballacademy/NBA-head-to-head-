import { useCallback, useEffect, useState } from "react";
import { EveryTeamComposerApp } from "../everyTeamComposer/EveryTeamComposerApp";
import { StandingsComposerApp } from "../standingsComposer/StandingsComposerApp";
import { TierListComposerApp } from "../tierListComposer/TierListComposerApp";
import {
  composerHref,
  readComposerMode,
  type ComposerMode,
} from "./composerMode";
import { ComposerTabs } from "./ComposerTabs";
import "../standingsComposer/standingsComposer.css";
import "../tierListComposer/tierListComposer.css";
import "../everyTeamComposer/everyTeamComposer.css";

export function ComposerHub() {
  const [mode, setMode] = useState<ComposerMode>(() => readComposerMode());

  useEffect(() => {
    const sync = () => setMode(readComposerMode());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const select = useCallback((next: ComposerMode) => {
    const href = composerHref(next);
    if (`${window.location.pathname}${window.location.search}` !== href) {
      window.history.pushState({}, "", href);
    }
    setMode(next);
  }, []);

  return (
    <div className="sc-root">
      <ComposerTabs mode={mode} onSelect={select} />
      {mode === "tier" ? (
        <TierListComposerApp />
      ) : mode === "every-team" ? (
        <EveryTeamComposerApp />
      ) : (
        <StandingsComposerApp />
      )}
    </div>
  );
}
