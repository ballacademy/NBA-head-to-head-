import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ESPN_SEASON_BY_ATHLETE_LIMIT,
  ESPN_SEASON_BY_ATHLETE_URL,
  espnRateToFraction,
  fetchEspnSeasonAverages,
  parseEspnSeasonAverages,
  resetEspnSeasonAveragesCache,
  type EspnByAthletePayload,
} from "./espnSeasonAverages";

const payload = (): EspnByAthletePayload => ({
  categories: [
    {
      name: "general",
      names: ["gamesPlayed", "avgMinutes", "avgRebounds"],
    },
    {
      name: "offensive",
      names: [
        "avgPoints",
        "avgAssists",
        "avgTurnovers",
        "avgThreePointFieldGoalsMade",
        "fieldGoalPct",
        "threePointFieldGoalPct",
        "freeThrowPct",
      ],
    },
    {
      name: "defensive",
      names: ["avgSteals", "avgBlocks"],
    },
  ],
  athletes: [
    {
      athlete: { id: "4066648" },
      categories: [
        { name: "general", values: [13, 29.153847, 6.1538463] },
        {
          name: "offensive",
          values: [14.0, 1.5384616, 1.6923077, 2.2307692, 41.935, 40.845, 65.714],
        },
        { name: "defensive", values: [0.9230769, 0.15384616] },
      ],
    },
    {
      athlete: { id: "3913176" },
      categories: [
        { name: "general", values: [0, 0, 0] },
        { name: "offensive", values: [0, 0, 0, 0, 0, 0, 0] },
        { name: "defensive", values: [0, 0] },
      ],
    },
    {
      athlete: { id: "4594268" },
      categories: [
        { name: "general", values: [4, 33.75, 4.75] },
        {
          name: "offensive",
          values: [33.25, 3.5, 3.5, 4.5, 48.077, 40.0, 75.0],
        },
        { name: "defensive", values: [2.0, 0.75] },
      ],
    },
  ],
});

describe("ESPN season averages", () => {
  afterEach(() => {
    resetEspnSeasonAveragesCache();
    vi.unstubAllGlobals();
  });

  it("parses per-game counting stats and skips 0-GP players", () => {
    expect(espnRateToFraction(41.935)).toBe(0.419);
    expect(espnRateToFraction(0.557)).toBe(0.557);
    const byId = parseEspnSeasonAverages(payload());
    expect(byId.has("3913176")).toBe(false);
    expect(byId.get("4594268")).toMatchObject({
      gp: 4,
      min: 33.8,
      pts: 33.3,
      reb: 4.8,
    });
    const rui = byId.get("4066648");
    expect(rui).toEqual({
      gp: 13,
      min: 29.2,
      pts: 14,
      reb: 6.2,
      ast: 1.5,
      stl: 0.9,
      blk: 0.2,
      tov: 1.7,
      fg3m: 2.2,
      fgPct: 0.419,
      fg3Pct: 0.408,
      ftPct: 0.657,
    });
  });

  it("fetches the ESPN by-athlete table for the board year", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => payload(),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const rows = await fetchEspnSeasonAverages("2026-27", "regular");
    const url = ESPN_SEASON_BY_ATHLETE_URL(2027, 2, 1);
    expect(url).toContain("isqualified=false");
    expect(url).toContain(`limit=${ESPN_SEASON_BY_ATHLETE_LIMIT}`);
    expect(fetchMock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ mode: "cors" }),
    );
    expect(rows.get("4066648")?.reb).toBe(6.2);
    expect(rows.get("4594268")?.pts).toBe(33.3);
    const cached = await fetchEspnSeasonAverages("2026-27", "regular");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cached.get("4066648")?.gp).toBe(13);
  });

  it("pages through ESPN when the unqualified table spans more than one page", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const page = url.includes("page=2") ? 2 : 1;
      return {
        ok: true,
        json: async () => ({
          pagination: { page, pages: 2, count: 2 },
          categories: payload().categories,
          athletes:
            page === 1
              ? payload().athletes?.slice(0, 1)
              : payload().athletes?.slice(2),
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const rows = await fetchEspnSeasonAverages("2026-27", "regular");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rows.get("4066648")?.gp).toBe(13);
    expect(rows.get("4594268")?.gp).toBe(4);
  });
});
