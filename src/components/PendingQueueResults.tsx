import { useEffect, useRef, useState } from "react";
import {
  buildAchievementContext,
  checkLineupAchievements,
  evaluateCareerProgressAchievements,
  unlockAchievements,
} from "../lib/achievements";
import { AchievementToast } from "./AchievementToast";
import { assignLineupSlots } from "../lib/lineupOrder";
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
} from "../lib/rankedElo";
import { getHighBannerQueuedWaitCopy } from "../lib/highBannerQueueWait";
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
  const slottedLineup = assignLineupSlots(userLineup);
  const submittedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<QueueSubmitState>("submitting");
  const mode: GhostMatchmakingMode = user.salaryCapMode ? "ranked" : "classic";
  const playerId = getOrCreatePlayerIdentity().playerId;
  const elo = user.salaryCapMode
    ? ensureCurrentRankedSeason().elo
    : ensureClassicProfile().elo;
  const waitCopy = getHighBannerQueuedWaitCopy({
    ratingPointsLabel: formatRatingPoints(elo),
  });

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
    const lineupUnlock = unlockAchievements(earned);
    const careerUnlock = evaluateCareerProgressAchievements();
    setNewAchievementIds([
      ...lineupUnlock.newlyUnlocked,
      ...careerUnlock.newlyUnlocked,
    ]);
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
              : waitCopy.headline}
        </h2>
        {matchmakingNotice ? (
          <p className="match-results__matchmaking-notice" role="status">
            {matchmakingNotice}
          </p>
        ) : null}
        {submitState === "failed" ? (
          <p className="form-error" role="alert">
            Your lineup wasn’t saved. Check your connection and try again.
          </p>
        ) : (
          <>
            <p>{waitCopy.body}</p>
            {submitState === "queued" ? (
              <p className="queued-draft-results__tip">{waitCopy.tip}</p>
            ) : null}
          </>
        )}
      </div>

      <section className="panel panel--compact daily-draft-results__lineup">
        <h3>{user.name}</h3>
        <div className="team-lineup-card__players">
          {slottedLineup.map(({ player, slot }) => (
            <PlayerStatLine
              key={player.id}
              player={player}
              lineupSlot={slot}
            />
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
          Back to Play
        </button>
      </div>
    </section>
  );
}
