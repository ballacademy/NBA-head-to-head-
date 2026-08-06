import { useEffect, useRef, useState } from "react";
import {
  buildAchievementContext,
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { AchievementToast } from "./AchievementToast";
import { sortLineupByPosition } from "../lib/lineupOrder";
import {
  submitStoredLineup,
  type GhostMatchmakingMode,
} from "../lib/ghostMatchmaking";
import { savePendingLineupState } from "../lib/pendingLineup";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import { ensureClassicProfile } from "../lib/classicProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import {
  formatRatingPoints,
  LIVE_OPPONENT_ONLY_MIN_ELO,
  RATING_LABEL,
} from "../lib/rankedElo";
import { getLineupSalaryTotal } from "../lib/salaryCap";
import { PlayerStatLine } from "./PlayerStatLine";
import { matchModeThemeClass, getMatchModeTheme } from "../lib/matchModeTheme";
import type { Drafter, Player } from "../lib/types";

interface PendingQueueResultsProps {
  user: Drafter;
  userLineup: Player[];
  starCount: number;
  onDone: () => void;
  matchmakingNotice?: string | null;
}

type QueueSubmitState = "submitting" | "queued" | "failed";

export function PendingQueueResults({
  user,
  userLineup,
  starCount,
  onDone,
  matchmakingNotice = null,
}: PendingQueueResultsProps) {
  const orderedLineup = sortLineupByPosition(userLineup);
  const submittedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<QueueSubmitState>("submitting");
  const mode: GhostMatchmakingMode = user.salaryCapMode ? "ranked" : "classic";
  const playerId = getOrCreatePlayerIdentity().playerId;
  const elo = user.salaryCapMode
    ? ensureCurrentRankedSeason().elo
    : ensureClassicProfile().elo;

  const postLineup = async () => {
    setSubmitState("submitting");
    const stored = await submitStoredLineup({
      mode,
      playerId,
      teamName: user.name,
      lineup: user.lineup.filter((id): id is string => Boolean(id)),
      elo,
      awaitingLive: true,
      salaryTotal: getLineupSalaryTotal(userLineup),
      starCount,
    });

    if (!stored) {
      setSubmitState("failed");
      return;
    }

    savePendingLineupState(
      {
        storedLineupId: stored.id,
        mode,
        submittedAt: stored.createdAt,
      },
      playerId,
    );
    setSubmitState("queued");
  };

  useEffect(() => {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    void postLineup();
    // Intentionally once on mount for this queued lineup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (achievementsCheckedRef.current || userLineup.length !== 5) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(
      userLineup,
      buildAchievementContext(userLineup, { hasSalaryCap: true }),
    );
    const { newlyUnlocked } = unlockAchievements(earned);
    setNewAchievementIds(newlyUnlocked);
  }, [userLineup]);

  return (
    <section
      className={`match-results daily-draft-results match-results--compact ${matchModeThemeClass(
        getMatchModeTheme(user),
      )}`}
    >
      <AchievementToast achievementIds={newAchievementIds} />
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">
          {submitState === "failed"
            ? "Queue failed"
            : submitState === "submitting"
              ? "Posting lineup"
              : "Lineup queued"}
        </p>
        <h2>
          {submitState === "failed"
            ? "Couldn’t queue your lineup"
            : submitState === "submitting"
              ? "Posting your lineup…"
              : "Waiting for a live opponent"}
        </h2>
        {matchmakingNotice ? (
          <p className="form-info" role="status">
            {matchmakingNotice}
          </p>
        ) : null}
        {submitState === "failed" ? (
          <p className="form-error" role="alert">
            Your lineup wasn’t saved. Check your connection and try again.
          </p>
        ) : (
          <>
            <p>
              At {LIVE_OPPONENT_ONLY_MIN_ELO}+ {RATING_LABEL}, you only face saved
              or live opponents. Your lineup is posted at{" "}
              {formatRatingPoints(elo)} until another GM drafts against it.
            </p>
            {submitState === "queued" ? (
              <p>
                You cannot enter a new lineup until this one receives a score.
              </p>
            ) : null}
          </>
        )}
      </div>

      <section className="panel panel--compact daily-draft-results__lineup">
        <h3>{user.name}</h3>
        <div className="team-lineup-card__players">
          {orderedLineup.map((player, index) => (
            <PlayerStatLine key={player.id} player={player} pickNumber={index + 1} />
          ))}
        </div>
      </section>

      <div className="panel panel--compact daily-draft-results__footer queued-draft-results__footer">
        {submitState === "failed" ? (
          <button
            type="button"
            className="play-again-button"
            onClick={() => void postLineup()}
          >
            Retry queue
          </button>
        ) : null}
        <button type="button" className="play-again-button" onClick={onDone}>
          Back to home
        </button>
      </div>
    </section>
  );
}
