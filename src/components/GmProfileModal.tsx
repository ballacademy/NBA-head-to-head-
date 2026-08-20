import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatUsername } from "../lib/accountCredentials";
import {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
} from "../lib/frontOfficeBadges";
import { formatPublicTag } from "../lib/playerIdentity";
import { fetchRemotePlayerProfile } from "../lib/playerProfileApi";
import { formatPlayerRecord } from "../lib/playerRecord";
import { formatSeasonLabel, getCurrentSeasonId } from "../lib/rankedSeason";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { LossStreakBadge } from "./LossStreakBadge";
import { RankedTierBadge } from "./RankedTierBadge";
import { WinStreakBadge } from "./WinStreakBadge";

interface GmProfileModalProps {
  playerId: string;
  name: string;
  publicTag: string;
  username?: string;
  wins?: number;
  losses?: number;
  winStreak?: number;
  lossStreak?: number;
  elo?: number;
  tierLabel?: string;
  profileMode?: "classic" | "ranked";
  fetchRemoteProfile?: boolean;
  onClose: () => void;
  onChallenge?: () => void;
}

const formatPlainStreak = (winStreak: number, lossStreak: number) => {
  if (winStreak > 0) {
    return `${winStreak} win${winStreak === 1 ? "" : "s"}`;
  }

  if (lossStreak > 0) {
    return `${lossStreak} loss${lossStreak === 1 ? "" : "es"}`;
  }

  return "None";
};

export function GmProfileModal({
  playerId,
  name,
  publicTag,
  username,
  wins,
  losses,
  winStreak = 0,
  lossStreak = 0,
  elo,
  tierLabel,
  profileMode = "ranked",
  fetchRemoteProfile = true,
  onClose,
  onChallenge,
}: GmProfileModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { containerRef } = useDialogA11y({
    onClose,
    initialFocusRef: closeRef,
    lockScroll: true,
  });
  const [loading, setLoading] = useState(fetchRemoteProfile);
  const [profileResolved, setProfileResolved] = useState(!fetchRemoteProfile);
  const [seasonUnavailable, setSeasonUnavailable] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const [displayTag, setDisplayTag] = useState(publicTag);
  const [displayUsername, setDisplayUsername] = useState(username);
  const [displayWins, setDisplayWins] = useState(wins ?? 0);
  const [displayLosses, setDisplayLosses] = useState(losses ?? 0);
  const [displayWinStreak, setDisplayWinStreak] = useState(winStreak);
  const [displayLossStreak, setDisplayLossStreak] = useState(lossStreak);
  const [legacyPeakElo, setLegacyPeakElo] = useState<number | null>(elo ?? null);
  const [legacyBestRank, setLegacyBestRank] = useState<number | null>(null);
  const [legacyBestRankSeasonId, setLegacyBestRankSeasonId] = useState("");
  const [legacyPeakSeasonId, setLegacyPeakSeasonId] = useState("");
  const [currentSeasonRank, setCurrentSeasonRank] = useState<number | null>(null);
  const [currentSeasonElo, setCurrentSeasonElo] = useState<number | null>(
    elo ?? null,
  );

  useEffect(() => {
    setDisplayName(name);
    setDisplayTag(publicTag);
    setDisplayUsername(username);
    if (!fetchRemoteProfile || profileResolved) {
      setDisplayWins(wins ?? 0);
      setDisplayLosses(losses ?? 0);
      setDisplayWinStreak(winStreak);
      setDisplayLossStreak(lossStreak);
      setCurrentSeasonElo(elo ?? null);
    }
  }, [
    name,
    publicTag,
    username,
    wins,
    losses,
    winStreak,
    lossStreak,
    elo,
    fetchRemoteProfile,
    profileResolved,
  ]);

  useEffect(() => {
    if (!fetchRemoteProfile) {
      setLoading(false);
      setProfileResolved(true);
      setSeasonUnavailable(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setProfileResolved(false);
      setSeasonUnavailable(false);
      const profile = await fetchRemotePlayerProfile({
        playerId,
        seasonId: getCurrentSeasonId(),
        mode: profileMode,
      });

      if (cancelled) {
        return;
      }

      if (!profile) {
        setSeasonUnavailable(true);
        setLoading(false);
        setProfileResolved(true);
        return;
      }

      if (profile.username) {
        setDisplayUsername(profile.username);
      }

      if (profile.legacy) {
        setLegacyPeakElo(profile.legacy.peakElo);
        setLegacyBestRank(profile.legacy.bestMonthlyRank);
        setLegacyBestRankSeasonId(profile.legacy.bestMonthlyRankSeasonId);
        setLegacyPeakSeasonId(profile.legacy.peakEloSeasonId);
      }

      if (profile.currentSeason) {
        setDisplayName(profile.currentSeason.teamName || name);
        setDisplayTag(profile.currentSeason.publicTag || publicTag);
        setDisplayWins(profile.currentSeason.wins);
        setDisplayLosses(profile.currentSeason.losses);
        setDisplayWinStreak(profile.currentSeason.winStreak ?? winStreak);
        setDisplayLossStreak(profile.currentSeason.lossStreak ?? lossStreak);
        setCurrentSeasonElo(profile.currentSeason.elo);
        setCurrentSeasonRank(profile.currentSeason.rank);
        if (profile.currentSeason.username) {
          setDisplayUsername(profile.currentSeason.username);
        }
        setSeasonUnavailable(false);
      } else {
        setSeasonUnavailable(true);
      }

      setLoading(false);
      setProfileResolved(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    playerId,
    fetchRemoteProfile,
    profileMode,
    name,
    publicTag,
    winStreak,
    lossStreak,
  ]);

  const showWinBadge = hasFireStreak(displayWinStreak);
  const showLossBadge =
    !showWinBadge && hasLossStreakBadge(displayLossStreak);
  const hasSeededMonthlyRecord = wins !== undefined && losses !== undefined;
  const legacyStatsPending = fetchRemoteProfile && !profileResolved;
  const monthlyStatsPending =
    fetchRemoteProfile && !profileResolved && !hasSeededMonthlyRecord;
  const displayElo = currentSeasonElo ?? elo ?? null;

  const monthRecordLabel = monthlyStatsPending
    ? "Loading..."
    : seasonUnavailable
      ? "Stats unavailable"
      : currentSeasonRank
        ? `#${currentSeasonRank} · ${formatPlayerRecord({
            wins: displayWins,
            losses: displayLosses,
          })}`
        : formatPlayerRecord({
            wins: displayWins,
            losses: displayLosses,
          });

  const streakLabel = monthlyStatsPending ? (
    "Loading..."
  ) : seasonUnavailable ? (
    "Stats unavailable"
  ) : showWinBadge ? (
    <WinStreakBadge winStreak={displayWinStreak} showTypeLabel={false} />
  ) : showLossBadge ? (
    <LossStreakBadge lossStreak={displayLossStreak} showTypeLabel={false} />
  ) : (
    formatPlainStreak(displayWinStreak, displayLossStreak)
  );

  const modal = (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="unlock-modal gm-profile-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="unlock-modal__panel panel gm-profile-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Legacy rank</p>
        <h2 id={titleId}>{displayName}</h2>
        <p className="gm-profile-modal__identity">
          {displayUsername ? (
            <>
              <span className="gm-profile-modal__username">
                {formatUsername(displayUsername)}
              </span>
              <span aria-hidden="true"> · </span>
            </>
          ) : null}
          {formatPublicTag(displayTag)}
        </p>

        <div className="gm-profile-modal__grid">
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">Best monthly finish</span>
            <strong className="gm-profile-modal__value">
              {legacyStatsPending
                ? "Loading..."
                : seasonUnavailable && !legacyBestRank
                  ? "Stats unavailable"
                  : formatLegacyMonthlyFinish(
                      legacyBestRank,
                      legacyBestRankSeasonId,
                    )}
            </strong>
          </div>
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">Most banners ever</span>
            <strong className="gm-profile-modal__value">
              {legacyStatsPending
                ? "Loading..."
                : seasonUnavailable && legacyPeakElo == null
                  ? "Stats unavailable"
                  : formatLegacyPeakBannerCount(legacyPeakElo)}
            </strong>
            {!legacyStatsPending &&
            !seasonUnavailable &&
            formatLegacyPeakBannerTier(legacyPeakElo) ? (
              <span className="gm-profile-modal__meta">
                {formatLegacyPeakBannerTier(legacyPeakElo)}
                {legacyPeakSeasonId
                  ? ` · Peak in ${formatSeasonLabel(legacyPeakSeasonId)}`
                  : ""}
              </span>
            ) : null}
          </div>
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">This month</span>
            <strong>{monthRecordLabel}</strong>
            {!seasonUnavailable && typeof displayElo === "number" ? (
              <RankedTierBadge
                tierLabel={tierLabel}
                elo={displayElo}
                compact
              />
            ) : null}
          </div>
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">Current streak</span>
            <strong className="gm-profile-modal__value gm-profile-modal__value--streak">
              {streakLabel}
            </strong>
          </div>
        </div>

        <div className="gm-profile-modal__actions">
          <button
            ref={closeRef}
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
          {onChallenge ? (
            <button
              type="button"
              className="landing__primary-button"
              onClick={() => {
                onClose();
                onChallenge();
              }}
            >
              Challenge
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
