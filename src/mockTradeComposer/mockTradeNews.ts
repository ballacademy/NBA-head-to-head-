import {
  ESPN_ABBREV_TO_TEAM,
  resolveTeamId,
} from "../playerOfTheDayComposer/lastGame";
import { NBA_TEAMS } from "../standingsComposer/teams";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  DEFAULT_MOCK_TRADE_YEAR,
  emptyMockTradePlayer,
  fillMockTradePlayer,
  MOCK_TRADE_PICK_MAX,
  MOCK_TRADE_PLAYER_MAX,
  MOCK_TRADE_TEAM_MAX,
  type MockTradeDraft,
  type MockTradePick,
  type MockTradePlayer,
  type MockTradeSide,
} from "./mockTradeState";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { DEFAULT_HEADSHOT_PAN } from "../playerOfTheDayComposer/playerOfTheDayState";

export const ESPN_NBA_NEWS_URL =
  "https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=50";

export const ESPN_ATHLETE_OVERVIEW_URL = (athleteId: string) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${encodeURIComponent(athleteId)}/overview`;

export const ESPN_STORY_URL = (storyId: string) =>
  `https://content.core.api.espn.com/v1/sports/news/${encodeURIComponent(storyId)}`;

export interface ReportedTradePerson {
  id: string;
  name: string;
}

export interface ReportedTradeSide {
  teamId: string;
  players: ReportedTradePerson[];
  picks: MockTradePick[];
}

export interface ReportedTrade {
  headline: string;
  storyId: string;
  sides: ReportedTradeSide[];
}

interface EspnNewsItem {
  id?: string | number;
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  type?: string;
  story?: string;
  links?: { api?: { self?: { href?: string } } };
  categories?: Array<{
    type?: string;
    description?: string;
    athlete?: { id?: string | number };
    team?: { abbreviation?: string; id?: string | number };
  }>;
}

interface EspnNewsFeed {
  articles?: EspnNewsItem[];
  news?: EspnNewsItem[];
  headlines?: EspnNewsItem[];
}

const TRADE_LIKE =
  /\b(trade[ds]?|acquired?|sent to|sign-and-trade|in exchange for)\b/i;
const SKIP_TRADE =
  /trade lab|fan-created|mock trade|trade no\.|failed to trade|exploring trades|popular in mock/i;
const PLAYER_HREF =
  /espn\.com\/nba\/player\/_\/id\/(\d+)(?:\/([^"'/\s>]+))?/i;
const TEAM_HREF = /espn\.com\/nba\/team\/_\/name\/([a-z]+)(?:\/([^"'/\s>]+))?/i;

const fetchEspnJson = async <T,>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const espnHeadshotUrl = (athleteId: string) =>
  `https://a.espncdn.com/i/headshots/nba/players/full/${encodeURIComponent(athleteId)}.png`;

const stripTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const storyIdFromHref = (href?: string) => {
  const match = href?.match(/\/news\/(\d+)/) ?? href?.match(/\/id\/(\d+)/);
  return match?.[1] ?? "";
};

const newsItems = (payload: EspnNewsFeed | null | undefined): EspnNewsItem[] => [
  ...(payload?.articles ?? []),
  ...(payload?.news ?? []),
  ...(payload?.headlines ?? []),
];

const publishedMs = (item: EspnNewsItem) => {
  const raw = item.published || item.lastModified || "";
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
};

export const resolveEspnTeamToken = (token: string): string | null => {
  const trimmed = token.replace(/[_-]+/g, " ").trim();
  if (!trimmed) {
    return null;
  }
  return resolveTeamId(trimmed, trimmed);
};

const teamFromSlug = (slug: string) =>
  resolveEspnTeamToken(slug) ??
  resolveTeamId(ESPN_ABBREV_TO_TEAM[slug.toUpperCase()] ?? slug.toUpperCase());

const teamFromName = (name: string): string | null => {
  const token = name.replace(/\s+/g, " ").trim().toLowerCase();
  if (!token) {
    return null;
  }
  const hit = NBA_TEAMS.find((team) => {
    const full = team.name.toLowerCase();
    const short = team.shortName.toLowerCase();
    return (
      full === token ||
      short === token ||
      team.id.toLowerCase() === token ||
      full.startsWith(token) ||
      token.startsWith(short)
    );
  });
  return hit?.id ?? resolveEspnTeamToken(name);
};

export const extractEspnPlayers = (html: string): ReportedTradePerson[] => {
  const found: ReportedTradePerson[] = [];
  const seen = new Set<string>();
  const pattern = new RegExp(PLAYER_HREF.source, "gi");
  for (const match of html.matchAll(pattern)) {
    const id = match[1]!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const slug = (match[2] ?? "").replace(/-/g, " ").trim();
    const catalog = getPlayer(id);
    found.push({
      id,
      name: catalog?.name || slug.replace(/\b\w/g, (ch) => ch.toUpperCase()),
    });
  }
  return found;
};

export const extractEspnTeams = (html: string): string[] => {
  const found: string[] = [];
  const seen = new Set<string>();
  const pattern = new RegExp(TEAM_HREF.source, "gi");
  for (const match of html.matchAll(pattern)) {
    const teamId = teamFromSlug(match[1] ?? "");
    if (!teamId || seen.has(teamId)) {
      continue;
    }
    seen.add(teamId);
    found.push(teamId);
  }
  NBA_TEAMS.forEach((team) => {
    const text = stripTags(html);
    const named = new RegExp(
      `\\b${team.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    );
    const short = new RegExp(`\\b${team.shortName}\\b`, "i");
    if ((named.test(text) || short.test(text)) && !seen.has(team.id)) {
      seen.add(team.id);
      found.push(team.id);
    }
  });
  return found;
};

const parsePickBits = (text: string, fromTeamId: string | null): MockTradePick[] => {
  const picks: MockTradePick[] = [];
  const yearRound =
    /\b(20\d{2})(?:'s)?\s*(first|1st|second|2nd)(?:-|\s)+round(?:er)?(?:\s+pick)?s?\b/gi;
  for (const match of text.matchAll(yearRound)) {
    const year = Number(match[1]);
    const round: MockTradePick["round"] = /2|second/i.test(match[2] ?? "")
      ? "2nd"
      : "1st";
    picks.push({
      year,
      round,
      fromTeamId,
      swap: /swap/i.test(match[0]),
      top4: /top[- ]?4/i.test(text),
      cash: false,
      twoWay: false,
    });
  }
  if (/\bcash\b/i.test(text)) {
    picks.push({
      year: DEFAULT_MOCK_TRADE_YEAR,
      round: "1st",
      fromTeamId,
      swap: false,
      cash: true,
    });
  }
  if (/\btwo-way\b/i.test(text)) {
    picks.push({
      year: DEFAULT_MOCK_TRADE_YEAR,
      round: "2nd",
      fromTeamId,
      swap: false,
      twoWay: true,
    });
  }
  return picks.slice(0, MOCK_TRADE_PICK_MAX);
};

const uniquePeople = (people: ReportedTradePerson[]) => {
  const seen = new Set<string>();
  return people.filter((person) => {
    if (seen.has(person.id)) {
      return false;
    }
    seen.add(person.id);
    return true;
  });
};

const paragraphMentionsPlayer = (
  html: string,
  playerId: string,
  playerName: string,
) => {
  if (html.includes(`/id/${playerId}/`) || html.includes(`/id/${playerId}"`)) {
    return true;
  }
  const text = stripTags(html);
  const name = playerName.replace(/\s+/g, " ").trim();
  return Boolean(name) && text.toLowerCase().includes(name.toLowerCase());
};

export const parseReportedTradeHtml = (
  html: string,
  playerId: string,
  playerName: string,
): ReportedTradeSide[] | null => {
  const chunks = html.split(/<\/p>|<h2\b|<h3\b/i);
  for (const chunk of chunks) {
    if (!TRADE_LIKE.test(chunk) || SKIP_TRADE.test(chunk)) {
      continue;
    }
    if (!paragraphMentionsPlayer(chunk, playerId, playerName)) {
      continue;
    }
    const text = stripTags(chunk);
    if (/\bfailed to trade\b/i.test(text) || /\bexploring trades\b/i.test(text)) {
      continue;
    }
    const people = extractEspnPlayers(chunk);
    const teams = extractEspnTeams(chunk);
    const focal =
      people.find((person) => person.id === playerId) ??
      ({ id: playerId, name: playerName } satisfies ReportedTradePerson);
    const destMatch =
      text.match(
        /(?:sent|sending|traded)\s+.+?\s+to\s+(?:the\s+)?([A-Za-z0-9 .'-]+?)(?:\s+for\b|[.,])/i,
      ) ??
      text.match(
        /(?:acquire[ds]?|traded for)\s+.+?\s+from\s+(?:the\s+)?([A-Za-z0-9 .'-]+)/i,
      );
    const srcMatch =
      text.match(/\bfrom\s+(?:the\s+)?([A-Za-z0-9 .'-]+?)(?:\s+on\b|\s+for\b|[.,])/i) ??
      text.match(
        /(?:the\s+)?([A-Za-z0-9 .'-]+?)\s+(?:and .+? )?agreed to a trade sending/i,
      );
    let dest = teamFromName(destMatch?.[1] ?? "");
    let src = teamFromName(srcMatch?.[1] ?? "");
    if (!src) {
      src = teams.find((team) => team !== dest) ?? null;
    }
    if (!dest && src) {
      dest = teams.find((team) => team !== src) ?? null;
    }
    if (!dest && teams.length === 1) {
      dest = teams[0]!;
    }
    if (!dest || !src || dest === src) {
      continue;
    }
    const forClause =
      text.match(
        /(?:to\s+(?:the\s+)?[A-Za-z0-9 .'-]+|from\s+(?:the\s+)?[A-Za-z0-9 .'-]+)\s+for\s+(.+?)(?:\.|$)/i,
      )?.[1] ?? "";
    const returnPeople = uniquePeople(
      people.filter(
        (person) =>
          person.id !== playerId &&
          forClause.toLowerCase().includes(person.name.toLowerCase()),
      ),
    );
    const destPeople = uniquePeople([focal]).slice(0, MOCK_TRADE_PLAYER_MAX);
    const originPicks = parsePickBits(forClause || text, dest);
    return [
      { teamId: dest, players: destPeople, picks: [] },
      {
        teamId: src,
        players: returnPeople.slice(0, MOCK_TRADE_PLAYER_MAX),
        picks: originPicks,
      },
    ];
  }
  return null;
};

const headlineOf = (item: EspnNewsItem) =>
  `${item.headline ?? ""} ${item.description ?? ""}`.trim();

export const isReportedTradeCopy = (text: string) =>
  TRADE_LIKE.test(text) && !SKIP_TRADE.test(text);

const storyHtmlFromPayload = (payload: EspnNewsFeed | null): string => {
  const item = newsItems(payload)[0];
  return typeof item?.story === "string" ? item.story : "";
};

const collectCandidates = (
  items: EspnNewsItem[],
  playerId: string,
  playerName: string,
): EspnNewsItem[] => {
  const name = playerName.toLowerCase();
  return items
    .filter((item) => {
      const copy = headlineOf(item);
      const cats = item.categories ?? [];
      const tagged = cats.some(
        (cat) => String(cat.athlete?.id ?? "") === playerId,
      );
      const named = copy.toLowerCase().includes(name);
      return (tagged || named || isReportedTradeCopy(copy)) && item.id;
    })
    .sort((left, right) => publishedMs(right) - publishedMs(left));
};

export const reportedTradePlayerSlot = (
  person: ReportedTradePerson,
  teamId: string | null,
): MockTradePlayer => {
  const catalog = getPlayer(person.id);
  if (catalog) {
    const filled = fillMockTradePlayer(catalog, emptyMockTradePlayer());
    return { ...filled, teamId: filled.teamId ?? teamId };
  }
  const names = splitPlayerName(person.name || "Player");
  return {
    playerId: person.id,
    teamId,
    firstName: names.firstName,
    lastName: names.lastName,
    photoSrc: espnHeadshotUrl(person.id),
    customPhoto: false,
    pan: { ...DEFAULT_HEADSHOT_PAN },
  };
};

export const applyReportedTrade = (
  draft: MockTradeDraft,
  trade: ReportedTrade,
): MockTradeDraft => {
  const sides: MockTradeSide[] = trade.sides.slice(0, MOCK_TRADE_TEAM_MAX).map(
    (side) => ({
      teamId: side.teamId,
      players: side.players.length
        ? side.players
            .slice(0, MOCK_TRADE_PLAYER_MAX)
            .map((person) => reportedTradePlayerSlot(person, side.teamId))
        : [emptyMockTradePlayer()],
      picks: side.picks.slice(0, MOCK_TRADE_PICK_MAX),
    }),
  );
  while (sides.length < 2) {
    sides.push({
      teamId: null,
      players: [emptyMockTradePlayer()],
      picks: [],
    });
  }
  return { ...draft, sides };
};

export const fetchReportedTrade = async (
  playerId: string,
  playerName: string,
): Promise<ReportedTrade | null> => {
  const id = playerId.trim();
  if (!id) {
    return null;
  }
  const [overview, leagueNews] = await Promise.all([
    fetchEspnJson<EspnNewsFeed>(ESPN_ATHLETE_OVERVIEW_URL(id)),
    fetchEspnJson<EspnNewsFeed>(ESPN_NBA_NEWS_URL),
  ]);
  const pool = [
    ...newsItems(overview),
    ...newsItems(leagueNews),
  ];
  const buzz = newsItems(leagueNews).find((item) =>
    /buzz|rumbling|trades, news, roster/i.test(item.headline ?? ""),
  );
  const candidates = collectCandidates(pool, id, playerName);
  if (buzz?.id) {
    const rest = candidates.filter((item) => String(item.id) !== String(buzz.id));
    candidates.length = 0;
    candidates.push(buzz, ...rest);
  }
  for (const item of candidates.slice(0, 8)) {
    const storyId = String(item.id ?? storyIdFromHref(item.links?.api?.self?.href));
    if (!storyId) {
      continue;
    }
    const payload = await fetchEspnJson<EspnNewsFeed>(ESPN_STORY_URL(storyId));
    const html = [item.story, storyHtmlFromPayload(payload), headlineOf(item)]
      .filter(Boolean)
      .join(" ");
    const sides = parseReportedTradeHtml(html, id, playerName);
    if (!sides) {
      continue;
    }
    return {
      headline: item.headline || "Reported trade",
      storyId,
      sides,
    };
  }
  return null;
};
