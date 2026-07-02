import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
} from "../lib/frontOfficeBadges";
import { formatPublicTag } from "../lib/playerIdentity";
import { fetchRemotePlayerProfile } from "../lib/playerProfileApi";
import { formatPlayerRecord } from "../lib/playerRecord";
import { formatSeasonLabel, getCurrentSeasonId } from "../lib/rankedSeason";
import { RankedTierBadge } from "./RankedTierBadge";

interface GmProfileModalProps {
  playerId: string;
  name: string;
  publicTag: string;
  wins: number;
  losses: number;
  elo?: number;
  tierLabel?: string;
  onClose: () => void;
}

export function GmProfileModal({
  playerId,
  name,
  publicTag,
  wins,
  losses,
  elo,
  tierLabel,
  onClose,
}: GmProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [legacyPeakElo, setLegacyPeakElo] = useState<number | null>(elo ?? null);
  const [legacyBestRank, setLegacyBestRank] = useState<number | null>(null);
  const [legacyBestRankSeasonId, setLegacyBestRankSeasonId] = useState("");
  const [legacyPeakSeasonId, setLegacyPeakSeasonId] = useState("");
  const [currentSeasonRank, setCurrentSeasonRank] = useState<number | null>(null);
  const [currentSeasonElo, setCurrentSeasonElo] = useState<number | null>(
    elo ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const profile = await fetchRemotePlayerProfile({
        playerId,
        seasonId: getCurrentSeasonId(),
      });

      if (cancelled) {
        return;
      }

      if (profile?.legacy) {
        setLegacyPeakElo(profile.legacy.peakElo);
        setLegacyBestRank(profile.legacy.bestMonthlyRank);
        setLegacyBestRankSeasonId(profile.legacy.bestMonthlyRankSeasonId);
        setLegacyPeakSeasonId(profile.legacy.peakEloSeasonId);
      }

      if (profile?.currentSeason) {
        setCurrentSeasonElo(profile.currentSeason.elo);
        setCurrentSeasonRank(profile.currentSeason.rank);
      }

      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const modal = (
    <div
      className="unlock-modal gm-profile-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gm-profile-title"
      onClick={onClose}
    >
      <div
        className="unlock-modal__panel panel gm-profile-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Legacy rank</p>
        <h2 id="gm-profile-title">{name}</h2>
        <p className="gm-profile-modal__identity">
          {formatPublicTag(publicTag)}
        </p>

        <div className="gm-profile-modal__grid">
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">Best monthly finish</span>
            <strong className="gm-profile-modal__value">
              {loading
                ? "Loading..."
                : formatLegacyMonthlyFinish(
                    legacyBestRank,
                    legacyBestRankSeasonId,
                  )}
            </strong>
          </div>
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">Most banners ever</span>
            <strong className="gm-profile-modal__value">
              {loading ? "Loading..." : formatLegacyPeakBannerCount(legacyPeakElo)}
            </strong>
            {!loading && formatLegacyPeakBannerTier(legacyPeakElo) ? (
              <span className="gm-profile-modal__meta">
                {formatLegacyPeakBannerTier(legacyPeakElo)} tier
                {legacyPeakSeasonId
                  ? ` · Peak in ${formatSeasonLabel(legacyPeakSeasonId)}`
                  : ""}
              </span>
            ) : null}
          </div>
          <div className="gm-profile-modal__stat">
            <span className="gm-profile-modal__label">This month</span>
            <strong>
              {currentSeasonRank
                ? `#${currentSeasonRank} · ${formatPlayerRecord({
                    wins,
                    losses,
                  })}`
                : formatPlayerRecord({
                    wins,
                    losses,
                  })}
            </strong>
            {typeof currentSeasonElo === "number" ? (
              <RankedTierBadge
                tierLabel={tierLabel}
                elo={currentSeasonElo}
                compact
              />
            ) : null}
          </div>
        </div>

        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
