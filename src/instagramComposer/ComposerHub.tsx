import { useCallback, useEffect, useState } from "react";
import { ComposerToast } from "./ComposerToast";
import { useComposerBaCorner } from "./composerBaCorner";
import { useComposerFocusMode } from "./composerFocusMode";
import {
  composerHotkeyAction,
  runComposerHotkey,
} from "./composerHotkeys";
import {
  COMPOSER_DRAFT_KEYS,
  markComposerUnsaved,
} from "./composerUnsaved";
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
import { StatCardCoverComposerApp } from "../statCardCoverComposer/StatCardCoverComposerApp";
import { MockTradeComposerApp } from "../mockTradeComposer/MockTradeComposerApp";
import { PlotComposerApp } from "../plotComposer/PlotComposerApp";
import { InjuryComposerApp } from "../injuryComposer/InjuryComposerApp";
import { ScheduleComposerApp } from "../scheduleComposer/ScheduleComposerApp";
import { ShotChartComposerApp } from "../shotChartComposer/ShotChartComposerApp";
import { PicksComposerApp } from "../picksComposer/PicksComposerApp";
import {
  composerHref,
  readComposerMode,
  type ComposerMode,
} from "./composerMode";
import { useComposerHudMode } from "./composerHudMode";
import { setComposerExportContext } from "./composerRecents";
import { useComposerPhotoEdit } from "./composerPhotoEdit";
import { ComposerTabs } from "./ComposerTabs";
import { hydrateJsonStorage } from "../lib/browserStorage";
import { chainHudWheel, syncComposerVisualViewport } from "./chainHudWheel";
import "./composerSlotSwap.css";
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
import "../statCardCoverComposer/statCardCoverComposer.css";
import "../mockTradeComposer/mockTradeComposer.css";
import "../plotComposer/plotComposer.css";
import "../injuryComposer/injuryComposer.css";
import "../scheduleComposer/scheduleComposer.css";
import "../shotChartComposer/shotChartComposer.css";
import "../picksComposer/picksComposer.css";

export function ComposerHub() {
  const [mode, setMode] = useState<ComposerMode>(() => readComposerMode());
  const [photoEdit, setPhotoEdit] = useComposerPhotoEdit();
  const [hudMode] = useComposerHudMode();
  const [focusMode, setFocusMode] = useComposerFocusMode();
  const [baCorner] = useComposerBaCorner();
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    void hydrateJsonStorage().finally(() => setPersistReady(true));
  }, []);

  useEffect(() => {
    const sync = () => setMode(readComposerMode());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setComposerExportContext(mode);
  }, [mode]);

  useEffect(() => {
    if (!persistReady) {
      return;
    }
    const root = document.querySelector(".sc-root");
    if (!(root instanceof HTMLElement)) {
      return;
    }
    const stopWheel = chainHudWheel(root);
    const stopViewport = syncComposerVisualViewport();
    return () => {
      stopWheel();
      stopViewport();
    };
  }, [persistReady, mode]);

  const select = useCallback((next: ComposerMode) => {
    const href = composerHref(next);
    if (`${window.location.pathname}${window.location.search}` !== href) {
      window.history.pushState({}, "", href);
    }
    setMode(next);
  }, []);

  useEffect(() => {
    const onWrite = (event: Event) => {
      const key = (event as CustomEvent<string>).detail;
      const found = (Object.entries(COMPOSER_DRAFT_KEYS) as Array<
        [ComposerMode, string[]]
      >).find(([, keys]) => keys.includes(key));
      if (found) {
        markComposerUnsaved(found[0]);
      }
    };
    window.addEventListener("ddgm:composer-draft-write", onWrite);
    return () => window.removeEventListener("ddgm:composer-draft-write", onWrite);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = composerHotkeyAction(event);
      if (!action) {
        return;
      }
      if (action === "focus-off") {
        if (focusMode) {
          event.preventDefault();
          setFocusMode(false);
        }
        return;
      }
      event.preventDefault();
      runComposerHotkey(action, document);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, setFocusMode]);

  if (!persistReady) {
    return (
      <div className="feature-page-fallback hub-empty" role="status">
        <p>Loading composer…</p>
      </div>
    );
  }

  return (
    <div
      className={[
        "sc-root",
        photoEdit ? "is-photo-edit" : "",
        hudMode === "simple" ? "is-hud-simple" : "",
        focusMode ? "is-hud-focus" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-ba-corner={baCorner}
      data-scroller="page"
      onClick={(event) => {
        if (!focusMode) {
          return;
        }
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest(".sc-tabs, .sc-toolbar, .sc-toolbar__row--actions, .sc-toast")
        ) {
          return;
        }
        setFocusMode(false);
      }}
    >
      <ComposerToast />
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
      ) : mode === "stat-card-cover" ? (
        <StatCardCoverComposerApp />
      ) : mode === "pyramid" ? (
        <PyramidComposerApp />
      ) : mode === "headline" ? (
        <HeadlineComposerApp />
      ) : mode === "mock-trade" ? (
        <MockTradeComposerApp />
      ) : mode === "plot" ? (
        <PlotComposerApp />
      ) : mode === "injury" ? (
        <InjuryComposerApp />
      ) : mode === "schedule" ? (
        <ScheduleComposerApp />
      ) : mode === "shot-chart" ? (
        <ShotChartComposerApp />
      ) : mode === "picks" ? (
        <PicksComposerApp />
      ) : (
        <StandingsComposerApp />
      )}
    </div>
  );
}
