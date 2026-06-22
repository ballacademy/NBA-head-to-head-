import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { sortLineupByPosition } from "../lib/lineupOrder";
import { copyToClipboard } from "../lib/copyToClipboard";
import { PlayerStatLine } from "./PlayerStatLine";
import { AchievementToast } from "./AchievementToast";
import { buildDailyDraftShareText } from "../lib/draftGrade";
import { buildDailyGoalResult } from "../lib/dailyGoalScoring";
import {
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import {
  formatDailyPercentile,
  submitDailyDraftScore,
  type DailyDraftPercentileResult,
} from "../lib/dailyDraftScores";
import { matchModeThemeClass } from "../lib/matchModeTheme";
import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import type { Drafter, Player } from "../lib/types";

interface DailyDraftResultsProps {
  user: Drafter;
  userLineup: Player[];
  dailyDateKey: string;
  dailyGoal: DailyDraftGoal;
  benchmarkValues: number[];
  onPlayAgain: () => void;
}

export function DailyDraftResults({
  user,
  userLineup,
  dailyDateKey,
  dailyGoal,
  benchmarkValues,
  onPlayAgain,
}: DailyDraftResultsProps) {
  const submittedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [percentileResult, setPercentileResult] =
    useState<DailyDraftPercentileResult | null>(null);
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
        userLineup,
        percentileResult?.percentile,
      ),
    [
      dailyDateKey,
      dailyGoal.title,
      goalResult.formatted,
      percentileResult?.percentile,
      userLineup,
    ],
  );
  const orderedLineup = useMemo(
    () => sortLineupByPosition(userLineup),
    [userLineup],
  );

  useLayoutEffect(() => {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    const result = submitDailyDraftScore(
      dailyDateKey,
      dailyGoal,
      goalResult.value,
      goalResult.formatted,
      benchmarkValues,
    );
    setPercentileResult(result);
  }, [
    benchmarkValues,
    dailyDateKey,
    dailyGoal,
    goalResult.formatted,
    goalResult.value,
  ]);

  useLayoutEffect(() => {
    if (achievementsCheckedRef.current || userLineup.length !== 5) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(userLineup);
    const { newlyUnlocked } = unlockAchievements(earned);
    setNewAchievementIds(newlyUnlocked);
  }, [userLineup]);

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
        : "Copy daily share text";

  return (
    <section
      className={`match-results daily-draft-results match-results--compact ${matchModeThemeClass("daily")}`}
    >
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">Daily Draft complete</p>
        <h2>{dailyGoal.title}</h2>
        <p>{dailyGoal.description}</p>
        <p className="daily-draft-results__stat">{goalResult.formatted}</p>
        {percentileResult ? (
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
        <h3>{user.name}</h3>
        <div className="team-lineup-card__players">
          {orderedLineup.map((player, index) => (
            <PlayerStatLine key={player.id} player={player} pickNumber={index + 1} />
          ))}
        </div>
      </section>

      <div className="panel panel--compact match-results__actions">
        <div className="match-results__action-row daily-draft-results__actions">
          <button
            type="button"
            className="landing__primary-button"
            onClick={() => void handleCopyShareText()}
          >
            {copyButtonLabel}
          </button>
          <button
            type="button"
            className="play-again-button match-results__menu-button"
            onClick={onPlayAgain}
          >
            Back to home
          </button>
        </div>
      </div>
    </section>
  );
}
