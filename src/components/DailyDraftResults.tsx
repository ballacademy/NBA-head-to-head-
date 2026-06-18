import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { TeamLineupCard } from "./TeamLineupCard";
import { RoastShareCard } from "./RoastShareCard";
import { AchievementToast } from "./AchievementToast";
import { calculateLineupScore } from "../lib/scoring";
import {
  buildDailyDraftShareText,
  buildDraftGradeReport,
} from "../lib/draftGrade";
import {
  checkLineupAchievements,
  unlockAchievements,
} from "../lib/achievements";
import {
  formatDailyPercentile,
  submitDailyDraftScore,
  type DailyDraftPercentileResult,
} from "../lib/dailyDraftScores";
import { shareLineupCard } from "../lib/shareCard";
import type { DailyDraftChallenge } from "../lib/dailyDraft";
import type { Drafter, Player } from "../lib/types";

interface DailyDraftResultsProps {
  user: Drafter;
  userLineup: Player[];
  dailyDateKey: string;
  dailyChallenge: DailyDraftChallenge;
  benchmarkOvrs: number[];
  onPlayAgain: () => void;
}

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

export function DailyDraftResults({
  user,
  userLineup,
  dailyDateKey,
  dailyChallenge,
  benchmarkOvrs,
  onPlayAgain,
}: DailyDraftResultsProps) {
  const submittedRef = useRef(false);
  const achievementsCheckedRef = useRef(false);
  const [percentileResult, setPercentileResult] =
    useState<DailyDraftPercentileResult | null>(null);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const userScore = calculateLineupScore(userLineup);
  const draftReport = useMemo(
    () => buildDraftGradeReport(userLineup, userScore),
    [userLineup, userScore],
  );
  const dailyShareText = useMemo(
    () =>
      buildDailyDraftShareText(
        userLineup,
        userScore.projectedRecord.wins,
        dailyDateKey,
        percentileResult?.percentile,
      ),
    [
      dailyDateKey,
      percentileResult?.percentile,
      userLineup,
      userScore.projectedRecord.wins,
    ],
  );
  const roastShareText = `${user.city} ${user.name} earned a ${draftReport.grade} on today's Daily Draft. ${formatDailyPercentile(percentileResult ?? { percentile: 50, totalDrafters: 1, sampleSize: 1 })}. "${draftReport.roast}" OVR ${draftReport.ovr} • ${draftReport.projectedRecord}`;

  useLayoutEffect(() => {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    const result = submitDailyDraftScore(
      dailyDateKey,
      draftReport.ovr,
      userScore.projectedRecord.wins,
      benchmarkOvrs,
    );
    setPercentileResult(result);
  }, [
    benchmarkOvrs,
    dailyDateKey,
    draftReport.ovr,
    userScore.projectedRecord.wins,
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

  const handleShareImage = async () => {
    await shareLineupCard({
      teamCity: user.city,
      teamName: user.name,
      grade: draftReport.grade,
      roast: draftReport.roast,
      ovr: draftReport.ovr,
      projectedRecord: draftReport.projectedRecord,
      lineup: userLineup,
      accent: user.accent,
    });
  };

  const handleCopyRoast = async () => {
    await copyText(roastShareText);
  };

  const handleCopyDailyShare = async () => {
    await copyText(dailyShareText);
  };

  return (
    <section className="match-results daily-draft-results">
      <div className="panel daily-draft-results__header">
        <p className="eyebrow">Daily Draft complete</p>
        <h2>{dailyChallenge.title}</h2>
        <p>{dailyChallenge.description}</p>
        {percentileResult ? (
          <p className="daily-draft-results__percentile">
            {formatDailyPercentile(percentileResult)}
            <span>
              Based on {percentileResult.sampleSize.toLocaleString()} drafter
              scores today
            </span>
          </p>
        ) : null}
      </div>

      <AchievementToast achievementIds={newAchievementIds} />

      <RoastShareCard
        teamCity={user.city}
        teamName={user.name}
        accent={user.accent}
        grade={draftReport.grade}
        roast={draftReport.roast}
        ovr={draftReport.ovr}
        projectedRecord={draftReport.projectedRecord}
        lineup={userLineup}
        onShareImage={() => void handleShareImage()}
        onCopyText={() => void handleCopyRoast()}
        dailyShareText={dailyShareText}
        onCopyDailyShare={() => void handleCopyDailyShare()}
      />

      <TeamLineupCard
        drafter={user}
        lineup={userLineup}
        score={userScore}
        isWinner
      />

      <div className="panel match-results__actions">
        <button type="button" className="play-again-button" onClick={onPlayAgain}>
          Back to home
        </button>
      </div>
    </section>
  );
}
