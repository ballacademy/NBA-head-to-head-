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
  /\b(trade[ds]?|acquired?|sent to|sending|send\b|sign-and-trade|in exchange for)\b/i;
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

const TEAM_NICKNAMES: Record<string, string> = {
  sixers: "PHI",
  "76ers": "PHI",
  wolves: "MIN",
  blazers: "POR",
  knicks: "NYK",
  lakers: "LAL",
  celtics: "BOS",
};

const teamFromName = (name: string): string | null => {
  const token = name.replace(/\s+/g, " ").trim().toLowerCase();
  if (!token) {
    return null;
  }
  if (TEAM_NICKNAMES[token]) {
    return TEAM_NICKNAMES[token]!;
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

const teamFromPhrase = (phrase: string): string | null => {
  const text = phrase.replace(/\s+/g, " ").trim();
  if (!text) {
    return null;
  }
  const direct = teamFromName(text);
  if (direct) {
    return direct;
  }
  const words = text.split(" ");
  for (let count = Math.min(words.length, 4); count >= 1; count -= 1) {
    const hit = teamFromName(words.slice(0, count).join(" "));
    if (hit) {
      return hit;
    }
  }
  return null;
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

const uniquePicks = (picks: MockTradePick[]) => {
  const byKey = new Map<string, MockTradePick>();
  for (const pick of picks) {
    const key = pick.cash
      ? `cash:${pick.fromTeamId ?? ""}`
      : pick.twoWay
        ? `twoway:${pick.fromTeamId ?? ""}`
        : `${pick.year}:${pick.round}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...pick });
      continue;
    }
    current.swap = Boolean(current.swap || pick.swap);
    current.top4 = Boolean(current.top4 || pick.top4);
  }
  return [...byKey.values()];
};

const parsePickBits = (text: string, fromTeamId: string | null): MockTradePick[] => {
  const picks: MockTradePick[] = [];
  const usedYears = new Set<string>();
  const addYearRound = (year: number, token: string, nearby: string) => {
    const round: MockTradePick["round"] = /2|second/i.test(token) ? "2nd" : "1st";
    const key = `${year}:${round}`;
    if (usedYears.has(key)) {
      if (/swap/i.test(nearby)) {
        const existing = picks.find(
          (pick) => `${pick.year}:${pick.round}` === key,
        );
        if (existing) {
          existing.swap = true;
        }
      }
      return;
    }
    usedYears.add(key);
    picks.push({
      year,
      round,
      fromTeamId,
      swap: /swap/i.test(nearby),
      top4: /top[- ]?4/i.test(nearby),
      cash: false,
      twoWay: false,
    });
  };
  const pair =
    /\b(20\d{2})\s+and\s+(20\d{2})\s+(first|1st|second|2nd)(?:-|\s)+round(?:er)?(?:\s+pick)?s?\b/gi;
  const yearRound =
    /\b(20\d{2})(?:'s)?\s+(first|1st|second|2nd)(?:-|\s)+round(?:er)?(?:\s+pick)?s?\b/gi;
  const pairSpans: Array<[number, number]> = [];
  const hits: Array<{ index: number; years: number[]; token: string; nearby: string }> =
    [];
  const clauseNear = (start: number, matched: string) => {
    const after = text.slice(start + matched.length);
    const paren = after.match(/^\s*\([^)]{0,120}\)/)?.[0] ?? "";
    const sentence = after.match(/^[^.]{0,180}/)?.[0] ?? "";
    return `${matched}${paren}${sentence}`;
  };
  for (const match of text.matchAll(pair)) {
    const start = match.index ?? 0;
    pairSpans.push([start, start + match[0].length]);
    hits.push({
      index: start,
      years: [Number(match[1]), Number(match[2])],
      token: match[3]!,
      nearby: clauseNear(start, match[0]),
    });
  }
  for (const match of text.matchAll(yearRound)) {
    const start = match.index ?? 0;
    if (pairSpans.some(([from, to]) => start >= from && start < to)) {
      continue;
    }
    hits.push({
      index: start,
      years: [Number(match[1])],
      token: match[2]!,
      nearby: clauseNear(start, match[0]),
    });
  }
  const grouped =
    /\b(first|1st|second|2nd)(?:-|\s)+round(?:er)?s?(?:\s+(?:picks?|selections?))?\s*\(\s*((?:20\d{2}\s*(?:,|and)\s*)*20\d{2})\s*\)/gi;
  for (const match of text.matchAll(grouped)) {
    const start = match.index ?? 0;
    const years = [...match[2]!.matchAll(/20\d{2}/g)].map((year) =>
      Number(year[0]),
    );
    hits.push({
      index: start,
      years,
      token: match[1]!,
      nearby: clauseNear(start, match[0]),
    });
  }
  hits
    .sort((left, right) => left.index - right.index)
    .forEach((hit) => {
      hit.years.forEach((year) => addYearRound(year, hit.token, hit.nearby));
    });
  if (/\band cash\b|\bcash considerations?\b/i.test(text)) {
    picks.push({
      year: DEFAULT_MOCK_TRADE_YEAR,
      round: "1st",
      fromTeamId,
      swap: false,
      cash: true,
    });
  }
  if (/\btwo-way\s+(?:contract|slot|deal)\b/i.test(text)) {
    picks.push({
      year: DEFAULT_MOCK_TRADE_YEAR,
      round: "2nd",
      fromTeamId,
      swap: false,
      twoWay: true,
    });
  }
  return uniquePicks(picks).slice(0, MOCK_TRADE_PICK_MAX);
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

const peopleInClause = (
  people: ReportedTradePerson[],
  clause: string,
): ReportedTradePerson[] => {
  const token = clause.toLowerCase();
  if (!token.trim()) {
    return [];
  }
  return people.filter((person) => {
    const name = person.name.toLowerCase();
    if (name && token.includes(name)) {
      return true;
    }
    const last = name.split(" ").at(-1);
    return Boolean(last && last.length > 3 && token.includes(last));
  });
};

const assetScore = (sides: ReportedTradeSide[]) =>
  sides.reduce((sum, side) => sum + side.players.length + side.picks.length, 0);

const mergeSideLists = (
  left: ReportedTradeSide[],
  right: ReportedTradeSide[],
): ReportedTradeSide[] => {
  const byTeam = new Map<string, ReportedTradeSide>();
  for (const side of [...left, ...right]) {
    const current = byTeam.get(side.teamId);
    if (!current) {
      byTeam.set(side.teamId, {
        teamId: side.teamId,
        players: uniquePeople(side.players),
        picks: uniquePicks(side.picks),
      });
      continue;
    }
    current.players = uniquePeople([...current.players, ...side.players]);
    current.picks = uniquePicks([...current.picks, ...side.picks]);
  }
  return [...byTeam.values()];
};

const orderSidesForPlayer = (sides: ReportedTradeSide[], playerId: string) => {
  const index = sides.findIndex((side) =>
    side.players.some((person) => person.id === playerId),
  );
  if (index <= 0) {
    return sides;
  }
  return [sides[index]!, ...sides.filter((_, i) => i !== index)];
};

const teamPairKey = (sides: ReportedTradeSide[]) =>
  sides
    .map((side) => side.teamId)
    .sort()
    .join(":");

const parseGetLine = (line: string): ReportedTradeSide | null => {
  if (!/get:/i.test(line)) {
    return null;
  }
  const [before, after] = line.split(/get:/i);
  const teamId =
    extractEspnTeams(before ?? "")[0] ??
    teamFromName(stripTags(before ?? "")) ??
    extractEspnTeams(line)[0];
  if (!teamId || after == null) {
    return null;
  }
  return {
    teamId,
    players: extractEspnPlayers(after).slice(0, MOCK_TRADE_PLAYER_MAX),
    picks: parsePickBits(stripTags(after), null),
  };
};

const parseGetBlocks = (
  html: string,
  playerId: string,
  playerName: string,
): ReportedTradeSide[] | null => {
  const lines = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<h2\b|<h3\b|<hr\b/gi, "\n")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const runs: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length >= 2) {
      runs.push(current);
    }
    current = [];
  };
  for (const line of lines) {
    if (/get:/i.test(line) && !SKIP_TRADE.test(line)) {
      current.push(line);
      continue;
    }
    flush();
  }
  flush();
  let best: ReportedTradeSide[] | null = null;
  let bestScore = -1;
  for (const getLines of runs) {
    const block = getLines.join("\n");
    if (!paragraphMentionsPlayer(block, playerId, playerName)) {
      continue;
    }
    const sides = getLines
      .map(parseGetLine)
      .filter((side): side is ReportedTradeSide => Boolean(side));
    if (sides.length < 2) {
      continue;
    }
    if (
      !sides.some((side) => side.players.some((person) => person.id === playerId))
    ) {
      continue;
    }
    const score = assetScore(sides);
    if (score > bestScore) {
      best = sides;
      bestScore = score;
    }
  }
  return best;
};

const parseSendingChunk = (
  chunk: string,
  playerId: string,
  playerName: string,
): ReportedTradeSide[] | null => {
  if (!TRADE_LIKE.test(chunk) || SKIP_TRADE.test(chunk)) {
    return null;
  }
  const text = stripTags(chunk);
  if (/\bfailed to trade\b/i.test(text) || /\bexploring trades\b/i.test(text)) {
    return null;
  }
  const people = extractEspnPlayers(chunk);
  const teams = extractEspnTeams(chunk);
  const sending = text.match(
    /(?:trade(?:d)? sending|sending|traded|sent|send)\s+(.+?)\s+to\s+(?:the\s+)?(.+?)(?:\s+for\s+(.+?))?(?=\s*[.]|\s*$|\s+get:)/i,
  );
  const acquired = text.match(
    /(?:acquire[ds]?)\s+(.+?)\s+from\s+(?:the\s+)?(.+?)(?:\s+for\s+(.+?))?(?=\s*[.]|\s*$|\s+get:)/i,
  );
  let destAssets = "";
  let destName = "";
  let srcAssets = "";
  let srcName = "";
  if (sending) {
    destAssets = sending[1] ?? "";
    destName = sending[2] ?? "";
    srcAssets = sending[3] ?? "";
  } else if (acquired) {
    destAssets = acquired[1] ?? "";
    srcName = acquired[2] ?? "";
    srcAssets = acquired[3] ?? "";
  } else {
    return null;
  }
  let dest = teamFromPhrase(destName);
  let src =
    teamFromPhrase(srcName) ||
    teamFromPhrase(
      text.match(
        /(?:the\s+)?([A-Za-z0-9 .'-]+?)\s+(?:and .+? )?agreed to a trade sending/i,
      )?.[1] ?? "",
    );
  if (!src) {
    src = teams.find((team) => team !== dest) ?? null;
  }
  if (!dest && src) {
    dest = teams.find((team) => team !== src) ?? null;
  }
  if (!dest || !src || dest === src) {
    return null;
  }
  const destPeople = uniquePeople(peopleInClause(people, destAssets)).slice(
    0,
    MOCK_TRADE_PLAYER_MAX,
  );
  const srcPeople = uniquePeople(peopleInClause(people, srcAssets)).slice(
    0,
    MOCK_TRADE_PLAYER_MAX,
  );
  if (!destPeople.length && !srcPeople.length) {
    if (!paragraphMentionsPlayer(chunk, playerId, playerName)) {
      return null;
    }
    const focal =
      people.find((person) => person.id === playerId) ??
      ({ id: playerId, name: playerName } satisfies ReportedTradePerson);
    destPeople.push(focal);
  }
  return [
    {
      teamId: dest,
      players: destPeople,
      picks: parsePickBits(destAssets, src),
    },
    {
      teamId: src,
      players: srcPeople,
      picks: parsePickBits(srcAssets, dest),
    },
  ];
};

export const extractTradeStoryIds = (
  html: string,
  playerName = "",
): string[] => {
  const last = playerName.split(/\s+/).at(-1)?.toLowerCase() ?? "";
  const found: Array<{ id: string; score: number }> = [];
  const seen = new Set<string>();
  const pattern =
    /(?:espn\.com)?\/(?:nba\/story\/_\/id|v1\/sports\/news)\/(\d+)(?:\/([^"'/\s>]+))?/gi;
  for (const match of html.matchAll(pattern)) {
    const id = match[1]!;
    const slug = (match[2] ?? "").toLowerCase();
    const nearby = html.slice(
      Math.max(0, (match.index ?? 0) - 80),
      (match.index ?? 0) + 80,
    );
    if (
      /trade-builder|trade-lab|mock-draft|mock-trade|fan-created|live-updates|nba-buzz/.test(
        slug,
      )
    ) {
      continue;
    }
    if (!/trade|grade|sending|deal|acquire/.test(`${slug} ${nearby}`)) {
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    let score = 0;
    if (last && slug.includes(last)) {
      score += 10;
    }
    if (/sending|traded|trade/.test(slug)) {
      score += 5;
    }
    if (/grade/.test(slug)) {
      score += 2;
    }
    found.push({ id, score });
  }
  return found.sort((left, right) => right.score - left.score).map((row) => row.id);
};

export const parseReportedTradeHtml = (
  html: string,
  playerId: string,
  playerName: string,
): ReportedTradeSide[] | null => {
  const parsed: ReportedTradeSide[][] = [];
  const fromGets = parseGetBlocks(html, playerId, playerName);
  if (fromGets) {
    parsed.push(fromGets);
  }
  const chunks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/<\/p>|<h2\b|<h3\b|<hr\b|<\/li>|<li\b/i);
  for (const chunk of chunks) {
    const sides = parseSendingChunk(chunk, playerId, playerName);
    if (sides) {
      parsed.push(sides);
    }
  }
  if (!parsed.length) {
    return null;
  }
  const byPair = new Map<string, ReportedTradeSide[]>();
  for (const sides of parsed) {
    const key = teamPairKey(sides);
    const current = byPair.get(key);
    byPair.set(key, current ? mergeSideLists(current, sides) : sides);
  }
  let best: ReportedTradeSide[] | null = null;
  let bestScore = -1;
  for (const sides of byPair.values()) {
    if (!sides.some((side) => side.players.some((person) => person.id === playerId))) {
      continue;
    }
    const score = assetScore(sides);
    if (score > bestScore) {
      best = orderSidesForPlayer(sides, playerId);
      bestScore = score;
    }
  }
  return best
    ? html.length <= 20_000
      ? attachLoosePicks(html, best)
      : best
    : null;
};

const attachLoosePicks = (
  html: string,
  sides: ReportedTradeSide[],
): ReportedTradeSide[] => {
  const teamSet = new Set(sides.map((side) => side.teamId));
  const chunks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/<\/p>|<h2\b|<h3\b|<hr\b|<\/li>|<li\b/i);
  for (const chunk of chunks) {
    if (SKIP_TRADE.test(chunk) || /get:/i.test(chunk)) {
      continue;
    }
    const text = stripTags(chunk);
    const picks = parsePickBits(text, null);
    if (!picks.length) {
      continue;
    }
    const named = sides
      .map((side) => {
        const team = NBA_TEAMS.find((row) => row.id === side.teamId);
        if (!team) {
          return null;
        }
        const hay = text.toLowerCase();
        const city = team.name.split(" ")[0]?.toLowerCase() ?? "";
        const hit =
          hay.includes(team.name.toLowerCase()) ||
          new RegExp(`\\b${team.shortName}\\b`, "i").test(text) ||
          (city.length > 3 && new RegExp(`\\b${city}\\b`, "i").test(text));
        return hit ? side.teamId : null;
      })
      .filter((id): id is string => Boolean(id));
    const uniqueNamed = [...new Set(named)];
    const toTeam = teamFromPhrase(
      [...text.matchAll(/\b(?:to|for)\s+(?:the\s+)?([A-Za-z0-9 .'-]+)/gi)]
        .map((match) => match[1] ?? "")
        .find((phrase) => {
          const id = teamFromPhrase(phrase);
          return Boolean(id && teamSet.has(id));
        }) ?? "",
    );
    const dest =
      (uniqueNamed.length === 1 ? uniqueNamed[0] : null) ||
      (toTeam && teamSet.has(toTeam) ? toTeam : null);
    if (!dest) {
      continue;
    }
    const side = sides.find((row) => row.teamId === dest);
    if (!side) {
      continue;
    }
    side.picks = uniquePicks([...side.picks, ...picks]).slice(
      0,
      MOCK_TRADE_PICK_MAX,
    );
  }
  return sides;
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
    .sort((left, right) => {
      const leftTrade = isReportedTradeCopy(headlineOf(left)) ? 1 : 0;
      const rightTrade = isReportedTradeCopy(headlineOf(right)) ? 1 : 0;
      if (leftTrade !== rightTrade) {
        return rightTrade - leftTrade;
      }
      return publishedMs(right) - publishedMs(left);
    });
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
      receive: "",
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
      receive: "",
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
  const seenStories = new Set<string>();
  const followQueue: Array<{ id: string; score: number }> = [];
  const followRank = new Map<string, number>();
  let best: ReportedTrade | null = null;
  let bestScore = -1;
  const queueFollows = (html: string) => {
    extractTradeStoryIds(html, playerName).forEach((followId, index) => {
      if (seenStories.has(followId)) {
        return;
      }
      const score = 100 - index;
      const current = followRank.get(followId) ?? -1;
      if (score <= current) {
        return;
      }
      followRank.set(followId, score);
      const existing = followQueue.find((row) => row.id === followId);
      if (existing) {
        existing.score = score;
        return;
      }
      followQueue.push({ id: followId, score });
    });
  };
  const consider = (storyId: string, headline: string, html: string) => {
    const sides = parseReportedTradeHtml(html, id, playerName);
    if (sides) {
      const score = assetScore(sides);
      if (score > bestScore) {
        best = { headline: headline || "Reported trade", storyId, sides };
        bestScore = score;
      }
    }
    queueFollows(html);
  };
  for (const item of candidates.slice(0, 16)) {
    const storyId = String(item.id ?? storyIdFromHref(item.links?.api?.self?.href));
    if (!storyId || seenStories.has(storyId)) {
      continue;
    }
    seenStories.add(storyId);
    const payload = await fetchEspnJson<EspnNewsFeed>(ESPN_STORY_URL(storyId));
    const html = [item.story, storyHtmlFromPayload(payload), headlineOf(item)]
      .filter(Boolean)
      .join(" ");
    consider(storyId, item.headline || "", html);
  }
  const rankedFollows = [...followQueue].sort((left, right) => right.score - left.score);
  for (const follow of rankedFollows.slice(0, 8)) {
    const storyId = follow.id;
    if (seenStories.has(storyId)) {
      continue;
    }
    seenStories.add(storyId);
    const payload = await fetchEspnJson<EspnNewsFeed>(ESPN_STORY_URL(storyId));
    const html = storyHtmlFromPayload(payload);
    if (!html) {
      continue;
    }
    consider(storyId, newsItems(payload)[0]?.headline || "Reported trade", html);
  }
  return best;
};
