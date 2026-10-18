import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  ESPN_ABBREV_TO_TEAM,
  isoDateOnly,
} from "../playerOfTheDayComposer/lastGame";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { NBA_TEAMS, getTeam } from "../standingsComposer/teams";

export { DEFAULT_BRAND };

export const ESPN_INJURIES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";

export const DEFAULT_INJURY_TITLE = "INJURY REPORT";
export const INJURY_TITLE_TRACK = 0.02;
export const INJURY_KICKERS = [
  "OUT",
  "GTD",
  "DOUBTFUL",
  "QUESTIONABLE",
  "REST",
] as const;
export type InjuryKicker = (typeof INJURY_KICKERS)[number];

export const INJURY_KICKER_FILL: Record<InjuryKicker, string> = {
  OUT: "#ef4444",
  GTD: "#facc15",
  DOUBTFUL: "#fb923c",
  QUESTIONABLE: "#fde68a",
  REST: "#67e8f9",
};

export const INJURY_KICKER_INK: Record<InjuryKicker, string> = {
  OUT: "#111",
  GTD: "#111",
  DOUBTFUL: "#111",
  QUESTIONABLE: "#111",
  REST: "#111",
};

export interface InjuryPlayer {
  id: string;
  name: string;
  shortName: string;
  teamId: string;
  status: InjuryKicker;
  detail: string;
}

export interface InjuryTeamBlock {
  teamId: string;
  players: InjuryPlayer[];
}

export interface InjuryDraft {
  brand: string;
  title: string;
  kicker: string;
  dateLine: string;
  teams: InjuryTeamBlock[];
  showBa?: boolean;
}

export const splitInjuryTitle = (title: string) =>
  splitBalancedTitle(title, DEFAULT_INJURY_TITLE, INJURY_TITLE_TRACK);

export const resolveInjuryTeamId = (abbrev: string) => {
  const token = abbrev.trim().toUpperCase();
  if (!token) {
    return "";
  }
  if (getTeam(token)) {
    return token;
  }
  return ESPN_ABBREV_TO_TEAM[token] ?? "";
};

export const normalizeInjuryKicker = (value: string): InjuryKicker | null => {
  const raw = value.trim().toUpperCase().replace(/[._]/g, " ");
  if (!raw || raw === "ACTIVE" || raw === "AVAILABLE") {
    return null;
  }
  if (raw === "OUT" || raw === "O") {
    return "OUT";
  }
  if (
    raw === "GTD" ||
    raw === "DAY TO DAY" ||
    raw === "DAY-TO-DAY" ||
    raw === "DTD" ||
    raw === "DAY-TO-DAY"
  ) {
    return "GTD";
  }
  if (raw === "DOUBTFUL" || raw === "D") {
    return "DOUBTFUL";
  }
  if (raw === "QUESTIONABLE" || raw === "Q") {
    return "QUESTIONABLE";
  }
  if (raw === "REST" || raw === "NOT WITH TEAM") {
    return "REST";
  }
  return null;
};

const rec = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const textOf = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const parseInjuryPayload = (payload: unknown): InjuryPlayer[] => {
  const root = rec(payload);
  const groups = Array.isArray(root?.injuries) ? root.injuries : [];
  const players: InjuryPlayer[] = [];
  groups.forEach((group) => {
    const block = rec(group);
    const teamHint = resolveInjuryTeamId(
      textOf(rec(block?.team)?.abbreviation) ||
        textOf(block?.abbreviation) ||
        "",
    );
    const rows = Array.isArray(block?.injuries) ? block.injuries : [];
    rows.forEach((row) => {
      const item = rec(row);
      const athlete = rec(item?.athlete);
      const team =
        resolveInjuryTeamId(
          textOf(rec(athlete?.team)?.abbreviation) ||
            textOf(rec(item?.team)?.abbreviation),
        ) || teamHint;
      const status =
        normalizeInjuryKicker(textOf(item?.status)) ??
        normalizeInjuryKicker(textOf(rec(item?.type)?.description));
      const id = textOf(athlete?.id);
      const name = textOf(athlete?.displayName) || textOf(athlete?.fullName);
      if (!id || !name || !team || !status) {
        return;
      }
      const details = rec(item?.details);
      const detail = [
        textOf(details?.type),
        textOf(details?.detail),
      ]
        .filter(Boolean)
        .join(" · ");
      const shortName =
        textOf(athlete?.shortName) ||
        name.split(" ").slice(-1)[0] ||
        name;
      players.push({
        id,
        name,
        shortName,
        teamId: team,
        status,
        detail,
      });
    });
  });
  return players;
};

export const groupInjuriesByTeam = (
  players: InjuryPlayer[],
): InjuryTeamBlock[] => {
  const order = new Map(NBA_TEAMS.map((team, index) => [team.id, index]));
  const byTeam = new Map<string, InjuryPlayer[]>();
  players.forEach((player) => {
    const list = byTeam.get(player.teamId) ?? [];
    list.push(player);
    byTeam.set(player.teamId, list);
  });
  const rank = (status: InjuryKicker) => INJURY_KICKERS.indexOf(status);
  return [...byTeam.entries()]
    .sort(
      (left, right) =>
        (order.get(left[0]) ?? 99) - (order.get(right[0]) ?? 99),
    )
    .map(([teamId, list]) => ({
      teamId,
      players: list.sort(
        (left, right) =>
          rank(left.status) - rank(right.status) ||
          left.name.localeCompare(right.name),
      ),
    }));
};

export const defaultInjuryDraft = (): InjuryDraft => ({
  brand: DEFAULT_BRAND,
  title: DEFAULT_INJURY_TITLE,
  kicker: "OUT / GTD",
  dateLine: "",
  teams: [],
  showBa: false,
});

export const isInjuryDraft = (value: unknown): value is InjuryDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as InjuryDraft).brand === "string" &&
      typeof (value as InjuryDraft).title === "string" &&
      Array.isArray((value as InjuryDraft).teams),
  );

export const normalizeInjuryDraft = (draft: InjuryDraft): InjuryDraft => ({
  ...defaultInjuryDraft(),
  ...draft,
  kicker: (draft.kicker ?? "").trim().slice(0, 18) || "OUT / GTD",
  dateLine: draft.dateLine?.trim() ?? "",
  teams: Array.isArray(draft.teams) ? draft.teams : [],
  showBa: draft.showBa === true,
});

export const injuryDateLine = (iso = "") => {
  const token = isoDateOnly(iso);
  if (!token) {
    return "";
  }
  const [year, month, day] = token.split("-");
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${months[Number(month) - 1] ?? ""} ${Number(day)}, ${year}`;
};

export const fetchNbaInjuries = async (): Promise<InjuryPlayer[]> => {
  try {
    const response = await fetch(ESPN_INJURIES_URL, {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) {
      return [];
    }
    return parseInjuryPayload(await response.json());
  } catch {
    return [];
  }
};
