import { useCallback, useEffect, useState } from "react";
import { EveryTeamComposerApp } from "../everyTeamComposer/EveryTeamComposerApp";
import { PlayerOfTheDayComposerApp } from "../playerOfTheDayComposer/PlayerOfTheDayComposerApp";
import { PotdLeaderboardComposerApp } from "../potdLeaderboardComposer/PotdLeaderboardComposerApp";
import { StandingsComposerApp } from "../standingsComposer/StandingsComposerApp";
import { TeamOfTheWeekComposerApp } from "../teamOfTheWeekComposer/TeamOfTheWeekComposerApp";
import { RankedLineupsComposerApp } from "../rankedLineupsComposer/RankedLineupsComposerApp";
import { TeamOfTheWeekPlusComposerApp } from "../teamOfTheWeekPlusComposer/TeamOfTheWeekPlusComposerApp";
import { TierListComposerApp } from "../tierListComposer/TierListComposerApp";
import { PyramidComposerApp } from "../pyramidComposer/PyramidComposerApp";
import { HeadlineComposerApp } from "../headlineComposer/HeadlineComposerApp";
import { CompareComposerApp } from "../compareComposer/CompareComposerApp";
import { QuoteComposerApp } from "../quoteComposer/QuoteComposerApp";
import { PlayInComposerApp } from "../playInComposer/PlayInComposerApp";
import { StatCardComposerApp } from "../statCardComposer/StatCardComposerApp";
import {
  composerHref,
  readComposerMode,
  type ComposerMode,
} from "./composerMode";
import { useComposerPhotoEdit } from "./composerPhotoEdit";
import { ComposerTabs } from "./ComposerTabs";
import "../standingsComposer/standingsComposer.css";
import "../tierListComposer/tierListComposer.css";
import "../everyTeamComposer/everyTeamComposer.css";
import "../playerOfTheDayComposer/playerOfTheDayComposer.css";
import "../potdLeaderboardComposer/potdLeaderboardComposer.css";
import "../teamOfTheWeekComposer/teamOfTheWeekComposer.css";
import "../teamOfTheWeekPlusComposer/teamOfTheWeekPlusComposer.css";
import "../rankedLineupsComposer/rankedLineupsComposer.css";
import "../pyramidComposer/pyramidComposer.css";
import "../headlineComposer/headlineComposer.css";
import "../compareComposer/compareComposer.css";
import "../quoteComposer/quoteComposer.css";
import "../playInComposer/playInComposer.css";
import "../statCardComposer/statCardComposer.css";

export function ComposerHub() {
  const [mode, setMode] = useState<ComposerMode>(() => readComposerMode());
  const [photoEdit, setPhotoEdit] = useComposerPhotoEdit();

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
    <div className={["sc-root", photoEdit ? "is-photo-edit" : ""].filter(Boolean).join(" ")}>
      <ComposerTabs
        mode={mode}
        photoEdit={photoEdit}
        onSelect={select}
        onPhotoEditChange={setPhotoEdit}
      />
      {mode === "tier" ? (
        <TierListComposerApp />
      ) : mode === "every-team" ? (
        <EveryTeamComposerApp />
      ) : mode === "player-of-the-day" ? (
        <PlayerOfTheDayComposerApp />
      ) : mode === "potd-leaderboard" ? (
        <PotdLeaderboardComposerApp />
      ) : mode === "team-of-the-week" ? (
        <TeamOfTheWeekComposerApp />
      ) : mode === "team-of-the-week-plus" ? (
        <TeamOfTheWeekPlusComposerApp />
      ) : mode === "ranked-lineups" ? (
        <RankedLineupsComposerApp />
      ) : mode === "lineup" ? (
        <RankedLineupsComposerApp unranked />
      ) : mode === "compare" ? (
        <CompareComposerApp />
      ) : mode === "quote" ? (
        <QuoteComposerApp />
      ) : mode === "play-in" ? (
        <PlayInComposerApp />
      ) : mode === "stat-card" ? (
        <StatCardComposerApp />
      ) : mode === "pyramid" ? (
        <PyramidComposerApp />
      ) : mode === "headline" ? (
        <HeadlineComposerApp />
      ) : (
        <StandingsComposerApp />
      )}
    </div>
  );
}
