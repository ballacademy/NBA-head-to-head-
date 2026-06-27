import { useEffect, useRef, useState } from "react";
import {
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
import { formatRatingPoints, LIVE_OPPONENT_ONLY_MIN_ELO, RATING_LABEL } from "../lib/rankedElo";
import { PlayerStatLine } from "./PlayerStatLine";
import { matchModeThemeClass, getMatchModeTheme } from "../lib/matchModeTheme";
import type { Drafter, Player } from "../lib/types";

interface PendingQueueResultsProps {
  user: Drafter;
  userLineup: Player[];
  onDone: () => void;
}

export function PendingQueueResults({
  user,
  userLineup,
  onDone,
}: PendingQueueResultsProps) {
  const orderedLineup = sortLineupByPosition(userLineup);
  const submittedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const mode: GhostMatchmakingMode = user.salaryCapMode ? "ranked" : "classic";
  const playerId = getOrCreatePlayerIdentity().playerId;
  const elo = user.salaryCapMode
    ? ensureCurrentRankedSeason().elo
    : ensureClassicProfile().elo;

  useEffect(() => {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    void (async () => {
      const stored = await submitStoredLineup({
        mode,
        playerId,
        teamName: user.name,
        lineup: user.lineup.filter((id): id is string => Boolean(id)),
        elo,
      });

      if (stored) {
        savePendingLineupState(
          {
            storedLineupId: stored.id,
            mode,
            submittedAt: stored.createdAt,
          },
          playerId,
        );
      }
    })();
  }, [elo, mode, playerId, user.lineup, user.name]);

  useEffect(() => {
    if (achievementsCheckedRef.current || userLineup.length !== 5) {
      return;
    }

    achievementsCheckedRef.current = true;
    const earned = checkLineupAchievements(userLineup, { hasSalaryCap: true });
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
        <p className="eyebrow">Lineup queued</p>
        <h2>Waiting for a live opponent</h2>
        <p>
          At {LIVE_OPPONENT_ONLY_MIN_ELO}+ {RATING_LABEL}, you only face saved or
          live opponents. Your lineup is posted at {formatRatingPoints(elo)} until
          another GM drafts against it.
        </p>
        <p>
          You cannot enter a new lineup until this one receives a score.
        </p>
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
        <button type="button" className="play-again-button" onClick={onDone}>
          Back to home
        </button>
      </div>
    </section>
  );
}
