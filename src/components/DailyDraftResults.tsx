import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sortLineupByPosition } from "../lib/lineupOrder";
import { copyToClipboard } from "../lib/copyToClipboard";
import { PlayerStatLine } from "./PlayerStatLine";
import { AchievementToast } from "./AchievementToast";
import { buildDailyDraftShareText } from "../lib/draftGrade";
import { buildDailyGoalResult } from "../lib/dailyGoalScoring";
import {
  buildAchievementContext,
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import {
  formatDailyPercentile,
  getDailyDraftPercentile,
  refreshDailyDraftScoresFromApi,
  submitDailyDraftScore,
  type DailyDraftPercentileResult,
} from "../lib/dailyDraftScores";
import { getOrCreatePlayerId } from "../lib/playerRecord";
import { matchModeThemeClass } from "../lib/matchModeTheme";
import { formatDailyDateLabel } from "../lib/dailyDraft";
import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import type { Drafter, Player } from "../lib/types";

const LIVE_PERCENTILE_REFRESH_MS = 15_000;

interface DailyDraftResultsProps {
  user: Drafter;
  userLineup: Player[];
  dailyDateKey: string;
  dailyGoal: DailyDraftGoal;
  benchmarkValues: number[];
  reviewOnly?: boolean;
  optimalReview?: boolean;
  onPlayAgain: () => void;
}

export function DailyDraftResults({
  user,
  userLineup,
  dailyDateKey,
  dailyGoal,
  benchmarkValues,
  reviewOnly = false,
  optimalReview = false,
  onPlayAgain,
}: DailyDraftResultsProps) {
  const submittedRef = useRef(reviewOnly || optimalReview);
  const achievementsCheckedRef = useRef(false);
  const [percentileResult, setPercentileResult] =
    useState<DailyDraftPercentileResult | null>(null);
  const [percentileReady, setPercentileReady] = useState(
    reviewOnly || optimalReview,
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const goalResult = useMemo(
    () => buildDailyGoalResult(userLineup, dailyGoal),
    [dailyGoal, userLineup],
  );
  const dailyShareText = useMemo(
    () =>
      buildDailyDraftShareText(
        dailyGoal.title,
        goalResult.formatted,
        dailyDateKey,
        percentileResult?.percentile,
      ),
    [
      dailyDateKey,
      dailyGoal.title,
      goalResult.formatted,
      percentileResult?.percentile,
    ],
  );
  const orderedLineup = useMemo(
    () => sortLineupByPosition(userLineup),
    [userLineup],
  );

  useLayoutEffect(() => {
    if (reviewOnly || optimalReview || submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    void (async () => {
      const result = await submitDailyDraftScore(
        dailyDateKey,
        dailyGoal,
        goalResult.value,
        goalResult.formatted,
        benchmarkValues,
        userLineup.map((player) => player.id),
        user.name,
      );
      setPercentileResult(result);
      setPercentileReady(true);
    })();
  }, [
    benchmarkValues,
    dailyDateKey,
    dailyGoal,
    goalResult.formatted,
    goalResult.value,
    optimalReview,
    reviewOnly,
    user.name,
    userLineup,
  ]);

  useEffect(() => {
    if (optimalReview || reviewOnly || !percentileReady) {
      return;
    }

    const refreshPercentile = async () => {
      await refreshDailyDraftScoresFromApi(
        dailyDateKey,
        dailyGoal.id,
        getOrCreatePlayerId(),
      );
      setPercentileResult(
        getDailyDraftPercentile(
          dailyDateKey,
          goalResult.value,
          dailyGoal,
          benchmarkValues,
          getOrCreatePlayerId(),
        ),
      );
    };

    void refreshPercentile();
    const intervalId = window.setInterval(() => {
      void refreshPercentile();
    }, LIVE_PERCENTILE_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    benchmarkValues,
    dailyDateKey,
    dailyGoal,
    goalResult.value,
    optimalReview,
    percentileReady,
    reviewOnly,
  ]);

  useLayoutEffect(() => {
    if (reviewOnly || optimalReview || achievementsCheckedRef.current || userLineup.length !== 5) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(
      userLineup,
      buildAchievementContext(userLineup),
    );
    const { newlyUnlocked } = unlockAchievements(earned);
    setNewAchievementIds(newlyUnlocked);
  }, [optimalReview, reviewOnly, userLineup]);

  const handleCopyShareText = async () => {
    const copied = await copyToClipboard(dailyShareText);
    setCopyState(copied ? "copied" : "error");

    window.setTimeout(() => {
      setCopyState("idle");
    }, 2200);
  };

  const copyButtonLabel =
    copyState === "copied"
      ? "Copied!"
      : copyState === "error"
        ? "Copy failed — try again"
        : "Copy share text";

  return (
    <section
      className={`match-results daily-draft-results match-results--compact ${matchModeThemeClass("daily")}`}
    >
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">
          {optimalReview ? "Daily Draft answer key" : "Daily Draft complete"}
        </p>
        <h2>
          {optimalReview ? "Yesterday's best lineup" : dailyGoal.title}
        </h2>
        <p>
          {optimalReview
            ? `${formatDailyDateLabel(dailyDateKey)} · ${dailyGoal.description}`
            : dailyGoal.description}
        </p>
        <p className="daily-draft-results__stat">{goalResult.formatted}</p>
        {!optimalReview && !reviewOnly && !percentileResult ? (
          <p className="daily-draft-results__percentile daily-draft-results__percentile--loading">
            Calculating rank…
          </p>
        ) : null}
        {!optimalReview && percentileResult ? (
          <p className="daily-draft-results__percentile">
            {formatDailyPercentile(percentileResult)}
            <span>
              Compared to {percentileResult.sampleSize.toLocaleString()} scores
              today
            </span>
          </p>
        ) : null}
      </div>

      <AchievementToast achievementIds={newAchievementIds} />

      <section className="panel panel--compact daily-draft-results__lineup">
        <h3>{optimalReview ? "Best possible lineup" : user.name}</h3>
        <div className="team-lineup-card__players">
          {orderedLineup.map((player, index) => (
            <PlayerStatLine
              key={player.id}
              player={player}
              pickNumber={index + 1}
              dailyGoal={dailyGoal}
            />
          ))}
        </div>
      </section>

      <div className="panel panel--compact daily-draft-results__footer">
        {!optimalReview ? (
          <button
            type="button"
            className="play-again-button match-results__share-button"
            onClick={() => void handleCopyShareText()}
          >
            {copyButtonLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="play-again-button match-results__menu-button"
          onClick={onPlayAgain}
        >
          Back to home
        </button>
      </div>
    </section>
  );
}
