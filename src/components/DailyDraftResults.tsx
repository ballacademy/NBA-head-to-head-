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
  loadReviewDailyDraftPercentile,
  refreshDailyDraftScoresFromApi,
  submitDailyDraftScore,
  type DailyDraftPercentileResult,
} from "../lib/dailyDraftScores";
import { getPlayersById } from "../lib/scoring";
import { getOrCreatePlayerId } from "../lib/playerRecord";
import { matchModeThemeClass } from "../lib/matchModeTheme";
import {
  formatDailyDraftModeLabel,
  formatDailyDraftProductName,
} from "../lib/dailyDraftMode";
import { formatDailyDateLabel } from "../lib/dailyDraft";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "../lib/dailyDraftPlayStreak";
import { saveLineupShareCard } from "../lib/lineupShareCard";
import { isShareDismissalError } from "../lib/appErrors";
import { trackProductEvent } from "../lib/productAnalytics";
import { rememberCommunityShareable } from "../lib/communityShareables";
import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import type { Drafter, Player } from "../lib/types";
import { players } from "../data/players";

const LIVE_PERCENTILE_REFRESH_MS = 15_000;
/** Daily Draft green accent token (`--accent-daily`). */
const DAILY_SHARE_ACCENT = "#22c55e";

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
  const analyticsFinishRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [percentileResult, setPercentileResult] =
    useState<DailyDraftPercentileResult | null>(null);
  const [percentileReady, setPercentileReady] = useState(
    reviewOnly || optimalReview,
  );
  const [remoteSyncFailed, setRemoteSyncFailed] = useState(false);
  const [syncRetryBusy, setSyncRetryBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "busy" | "error">(
    "idle",
  );
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [canonicalLineup, setCanonicalLineup] = useState<Player[] | null>(null);
  const [canonicalFormatted, setCanonicalFormatted] = useState<string | null>(
    null,
  );
  const [adoptedExistingAttempt, setAdoptedExistingAttempt] = useState(false);
  const displayLineup = canonicalLineup ?? userLineup;
  const goalResult = useMemo(
    () => buildDailyGoalResult(displayLineup, dailyGoal),
    [dailyGoal, displayLineup],
  );
  const displayFormatted = canonicalFormatted ?? goalResult.formatted;
  const dailyShareText = useMemo(
    () =>
      buildDailyDraftShareText(
        dailyGoal.title,
        displayFormatted,
        dailyDateKey,
        percentileResult?.percentile,
        user.dailyDraftMode ?? dailyGoal.mode,
      ),
    [
      dailyDateKey,
      dailyGoal.title,
      displayFormatted,
      percentileResult?.percentile,
      user.dailyDraftMode ?? dailyGoal.mode,
    ],
  );
  const orderedLineup = useMemo(
    () => sortLineupByPosition(displayLineup),
    [displayLineup],
  );

  const adoptCanonicalEntry = (entry: {
    value: number;
    formattedResult: string;
    lineup?: string[];
  }) => {
    setCanonicalFormatted(entry.formattedResult);
    if (entry.lineup && entry.lineup.length >= 5) {
      const resolved = getPlayersById(entry.lineup, players);
      if (resolved.length === entry.lineup.length) {
        setCanonicalLineup(resolved);
      }
    }
  };

  useLayoutEffect(() => {
    if (!reviewOnly || optimalReview) {
      return;
    }

    void (async () => {
      const result = await loadReviewDailyDraftPercentile(
        dailyDateKey,
        dailyGoal,
        benchmarkValues,
      );
      setPercentileResult(result);
    })();
  }, [benchmarkValues, dailyDateKey, dailyGoal, optimalReview, reviewOnly]);

  useLayoutEffect(() => {
    if (reviewOnly || optimalReview || submittedRef.current) {
      return;
    }

    if (userLineup.length !== 5) {
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
      if (result.adoptedExisting) {
        adoptCanonicalEntry(result.entry);
        setAdoptedExistingAttempt(true);
      }
      if (!result.adoptedExisting && userLineup.length === 5) {
        rememberCommunityShareable({
          kind: "lineup",
          title: dailyGoal.title,
          modeLabel: formatDailyDraftProductName(
            user.dailyDraftMode ?? dailyGoal.mode,
          ),
          resultLabel: result.entry.formattedResult,
          lineupNames: userLineup.map((player) => player.name),
          savedAt: new Date().toISOString(),
        });
      }
      setPercentileResult(result);
      setRemoteSyncFailed(!result.remoteSynced);
      setPercentileReady(true);

      if (!analyticsFinishRef.current) {
        analyticsFinishRef.current = true;
        trackProductEvent("daily_finish", {
          mode: user.dailyDraftMode ?? dailyGoal.mode,
          goalId: dailyGoal.id,
          remoteSynced: result.remoteSynced,
        });
      }
    })();
  }, [
    benchmarkValues,
    dailyDateKey,
    dailyGoal,
    goalResult.formatted,
    goalResult.value,
    optimalReview,
    reviewOnly,
    user.dailyDraftMode,
    user.name,
    userLineup,
  ]);

  const retryRemoteSync = async () => {
    if (syncRetryBusy) {
      return;
    }

    setSyncRetryBusy(true);
    const refreshed = await refreshDailyDraftScoresFromApi(
      dailyDateKey,
      dailyGoal.id,
      getOrCreatePlayerId(),
      dailyGoal.mode,
    );
    const result = await submitDailyDraftScore(
      dailyDateKey,
      dailyGoal,
      goalResult.value,
      goalResult.formatted,
      benchmarkValues,
      displayLineup.map((player) => player.id),
      user.name,
    );
    if (result.adoptedExisting) {
      adoptCanonicalEntry(result.entry);
      setAdoptedExistingAttempt(true);
    }
    setPercentileResult(result);
    setRemoteSyncFailed(!(result.remoteSynced || refreshed));
    setSyncRetryBusy(false);
  };

  useEffect(() => {
    if (optimalReview || reviewOnly || !percentileReady) {
      return;
    }

    const refreshPercentile = async () => {
      await refreshDailyDraftScoresFromApi(
        dailyDateKey,
        dailyGoal.id,
        getOrCreatePlayerId(),
        dailyGoal.mode,
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
    if (
      reviewOnly ||
      optimalReview ||
      achievementsCheckedRef.current ||
      displayLineup.length !== 5
    ) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(
      displayLineup,
      buildAchievementContext(displayLineup),
    );
    const { newlyUnlocked } = unlockAchievements(earned);
    setNewAchievementIds(newlyUnlocked);
  }, [displayLineup, optimalReview, reviewOnly]);

  const handleCopyShareText = async () => {
    const copied = await copyToClipboard(dailyShareText);
    setCopyState(copied ? "copied" : "error");

    window.setTimeout(() => {
      setCopyState("idle");
    }, 2200);
  };

  const handleShareImage = async () => {
    if (shareState === "busy" || displayLineup.length === 0) {
      return;
    }

    setShareState("busy");

    try {
      await saveLineupShareCard({
        teamName: user.name,
        headline: dailyGoal.title,
        accent: DAILY_SHARE_ACCENT,
        ovr: 0,
        lineup: displayLineup,
        statValue: displayFormatted,
        statLabel: percentileResult
          ? formatDailyPercentile(percentileResult)
          : "RESULT",
      });
      trackProductEvent("share_lineup", {
        surface: "daily",
        mode: user.dailyDraftMode ?? dailyGoal.mode,
      });
      setShareState("idle");
    } catch (error) {
      if (isShareDismissalError(error)) {
        setShareState("idle");
        return;
      }

      setShareState("error");
      const copied = await copyToClipboard(dailyShareText);
      if (copied) {
        setCopyState("copied");
        window.setTimeout(() => setCopyState("idle"), 2200);
      }
      window.setTimeout(() => setShareState("idle"), 3000);
    }
  };

  const copyButtonLabel =
    copyState === "copied"
      ? "Copied!"
      : copyState === "error"
        ? "Copy failed — try again"
        : "Copy share text";
  const shareButtonLabel =
    shareState === "busy"
      ? "Preparing image…"
      : shareState === "error"
        ? "Share failed — text copied"
        : "Share image";
  const playStreak = optimalReview
    ? null
    : getDailyDraftPlayStreak(
        user.dailyDraftMode ?? dailyGoal.mode,
        dailyDateKey,
      );

  return (
    <section
      className={`match-results daily-draft-results match-results--compact ${matchModeThemeClass("daily")}`}
    >
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">
          {optimalReview
            ? `${formatDailyDraftProductName(user.dailyDraftMode ?? "basic")} Answer Key`
            : `${formatDailyDraftProductName(user.dailyDraftMode ?? "basic")} complete`}
        </p>
        <h2>{dailyGoal.title}</h2>
        <p>
          {optimalReview
            ? `${formatDailyDateLabel(dailyDateKey)} · ${dailyGoal.description}`
            : dailyGoal.description}
        </p>
        <p className="daily-draft-results__stat">{displayFormatted}</p>
        {adoptedExistingAttempt ? (
          <p className="daily-draft-results__adopted" role="status">
            Showing your first scored attempt for today.
          </p>
        ) : null}
        {!optimalReview && !percentileResult && !reviewOnly ? (
          <p className="daily-draft-results__percentile daily-draft-results__percentile--loading">
            Calculating rank…
          </p>
        ) : null}
        {!optimalReview && !percentileResult && reviewOnly ? (
          <p className="daily-draft-results__percentile daily-draft-results__percentile--loading">
            Loading rank…
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
        {!optimalReview && remoteSyncFailed ? (
          <p className="form-error daily-draft-results__sync-error" role="alert">
            Score saved on this device; leaderboard sync failed.{" "}
            <button
              type="button"
              className="daily-draft-results__sync-retry"
              disabled={syncRetryBusy}
              onClick={() => void retryRemoteSync()}
            >
              {syncRetryBusy ? "Retrying…" : "Retry sync"}
            </button>
          </p>
        ) : null}
        {playStreak && playStreak.current > 0 ? (
          <p className="daily-draft-results__streak">
            {formatDailyDraftPlayStreak(playStreak)}
            <span>
              {formatDailyDraftModeLabel(user.dailyDraftMode ?? dailyGoal.mode)}{" "}
              days in a row
            </span>
          </p>
        ) : null}
      </div>

      <AchievementToast achievementIds={newAchievementIds} />

      <section className="panel panel--compact daily-draft-results__lineup">
        <h3>{optimalReview ? "Best Possible Lineup" : user.name}</h3>
        <div className="team-lineup-card__players">
          {orderedLineup.map((player) => (
            <PlayerStatLine
              key={player.id}
              player={player}
              dailyGoal={dailyGoal}
            />
          ))}
        </div>
      </section>

      <div className="panel panel--compact match-results__actions daily-draft-results__footer">
        <div className="match-results__action-row">
          <button
            type="button"
            className="play-again-button match-results__primary-action"
            onClick={onPlayAgain}
          >
            Back to home
          </button>
          {!optimalReview ? (
            <>
              <button
                type="button"
                className="secondary-button match-results__share-button"
                onClick={() => void handleCopyShareText()}
              >
                {copyButtonLabel}
              </button>
              <button
                type="button"
                className="secondary-button match-results__menu-button"
                disabled={shareState === "busy"}
                onClick={() => void handleShareImage()}
              >
                {shareButtonLabel}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
