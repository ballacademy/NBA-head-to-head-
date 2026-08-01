import { describe, expect, it } from "vitest";
import {
  isCurrentRookiePlayer,
  isUpcomingRookiePlayer,
  upcomingRookiePlayers,
} from "./draftClasses";
import { isStatsFreeAgent } from "./freeAgents";
import { databasePlayers, findPlayerId, freeAgentPlayers, players } from "./playerPool";
import {
  createDefaultTierListState,
  DEFAULT_TIER_LIST_TITLE,
  displayTierListTitle,
  filterTierListPool,
  getTierListPlayers,
  movePlayerToTier,
  normalizeTierListState,
  openTierListFromLibrary,
  playerMatchesTierListFilters,
  renameTier,
  saveTierListToLibrary,
  addTier,
  sortTierListLibraryDocuments,
  TIER_LIST_MAX_TIERS,
  TIER_NAME_MAX_LENGTH,
  DEFAULT_TIER_LIST_FILTERS,
} from "./tierList";
import { isInternationalEventPlayer } from "./weeklyEvents";

const byName = (name: string) => {
  const id = findPlayerId(name);
  const player = players.find((entry) => entry.id === id);
  if (!player) {
    throw new Error(`missing ${name}`);
  }
  return player;
};

describe("tierList", () => {
  it("caps tier names so labels stay inside the board column", () => {
    const state = createDefaultTierListState();
    const tierId = state.tiers[0]!.id;
    const renamed = renameTier(
      state,
      tierId,
      "Super powered players forever",
    );
    expect(renamed.tiers[0]!.name).toBe("Super powere");
    expect(renamed.tiers[0]!.name.length).toBe(TIER_NAME_MAX_LENGTH);

    const normalized = normalizeTierListState({
      tiers: [
        {
          id: "tier-long",
          name: "Absolutely enormous tier title",
          playerIds: [],
        },
      ],
    });
    expect(normalized.tiers[0]!.name.length).toBeLessThanOrEqual(
      TIER_NAME_MAX_LENGTH,
    );
  });

  it("defaults new boards to an empty title shown as Name your tier list", () => {
    const state = createDefaultTierListState();
    expect(state.title).toBe("");
    expect(displayTierListTitle(state.title)).toBe(DEFAULT_TIER_LIST_TITLE);
    expect(
      normalizeTierListState({
        title: "My Tier List",
        tiers: state.tiers,
      }).title,
    ).toBe("");
  });

  it("filters by position, age range, team, conference, and agency", () => {
    const guard = byName("Shai Gilgeous-Alexander");
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        positions: ["PG", "SG"],
      }),
    ).toBe(true);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        positions: ["C"],
      }),
    ).toBe(false);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        ageMin: 20,
        ageMax: 40,
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        ageMax: 20,
      }),
    ).toBe(false);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        team: guard.team,
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        team: "BOS",
      }),
    ).toBe(guard.team === "BOS");
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        conference: "West",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        conference: "East",
      }),
    ).toBe(false);

    expect(
      playerMatchesTierListFilters(guard, {
        ...DEFAULT_TIER_LIST_FILTERS,
        agency: "rostered",
      }),
    ).toBe(!isStatsFreeAgent(guard));

    const freeAgent = freeAgentPlayers[0];
    expect(freeAgent).toBeTruthy();
    expect(
      playerMatchesTierListFilters(freeAgent!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        agency: "free-agent",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(freeAgent!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        agency: "rostered",
      }),
    ).toBe(false);
  });

  it("saves and reopens tier lists from the library", () => {
    const player = byName("Jayson Tatum");
    let state = createDefaultTierListState();
    state = movePlayerToTier(state, player.id, state.tiers[0]!.id);
    state = { ...state, title: "East Wings" };

    const saved = saveTierListToLibrary(state, { documents: [] });
    expect(saved.library.documents).toHaveLength(1);
    expect(saved.library.documents[0]?.title).toBe("East Wings");

    const reopened = openTierListFromLibrary(
      saved.library.documents[0]!.id,
      saved.library,
    );
    expect(reopened?.title).toBe("East Wings");
    expect(reopened?.tiers[0]?.playerIds).toContain(player.id);
  });

  it("moves players between tiers and clears them from the pool", () => {
    const player = byName("Jayson Tatum");
    let state = createDefaultTierListState();
    const targetTier = state.tiers[0]!;

    state = movePlayerToTier(state, player.id, targetTier.id);
    expect(state.tiers[0]?.playerIds).toContain(player.id);

    const pool = filterTierListPool(
      players,
      DEFAULT_TIER_LIST_FILTERS,
      new Set(state.tiers.flatMap((tier) => tier.playerIds)),
    );
    expect(pool.some((entry) => entry.id === player.id)).toBe(false);

    state = movePlayerToTier(state, player.id, null);
    expect(state.tiers.every((tier) => !tier.playerIds.includes(player.id))).toBe(
      true,
    );
  });

  it("includes a broad non-US-born international pool from the season database", () => {
    const intl = databasePlayers.filter(isInternationalEventPlayer);
    expect(intl.length).toBeGreaterThanOrEqual(120);
    expect(intl.some((player) => player.name.includes("Gilgeous-Alexander"))).toBe(
      true,
    );
    expect(intl.some((player) => player.name.includes("Jokić") || player.name.includes("Jokic"))).toBe(
      true,
    );
    // US-born with international ties should not count as international-born.
    expect(intl.some((player) => player.name.includes("Towns"))).toBe(false);
  });

  it("adds upcoming rookies only to the tier list pool", () => {
    const tierPool = getTierListPlayers();
    expect(upcomingRookiePlayers.length).toBeGreaterThanOrEqual(20);
    expect(tierPool.length).toBe(
      databasePlayers.length + upcomingRookiePlayers.length,
    );
    expect(
      databasePlayers.some((player) => isUpcomingRookiePlayer(player)),
    ).toBe(false);
    expect(tierPool.some((player) => player.name === "Darryn Peterson")).toBe(
      true,
    );
  });

  it("filters by experience and draft class", () => {
    const rookies = databasePlayers.filter(isCurrentRookiePlayer);
    expect(rookies.length).toBeGreaterThan(10);

    const cooper = rookies.find((player) => player.name.includes("Flagg"));
    expect(cooper).toBeTruthy();
    expect(
      playerMatchesTierListFilters(cooper!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "rookies",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(cooper!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "veterans",
      }),
    ).toBe(false);
    expect(
      playerMatchesTierListFilters(cooper!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2025,
      }),
    ).toBe(true);

    const prospect = upcomingRookiePlayers[0]!;
    expect(
      playerMatchesTierListFilters(prospect, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "upcoming",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(prospect, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2026,
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(prospect, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "veterans",
      }),
    ).toBe(false);

    const veteran = byName("Jayson Tatum");
    expect(
      playerMatchesTierListFilters(veteran, {
        ...DEFAULT_TIER_LIST_FILTERS,
        experience: "veterans",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(veteran, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2022,
      }),
    ).toBe(false);

    const lebron = databasePlayers.find((player) =>
      player.name.includes("LeBron"),
    );
    expect(lebron).toBeTruthy();
    expect(
      playerMatchesTierListFilters(lebron!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        draftClass: 2003,
      }),
    ).toBe(true);
  });

  it("filters the pool by height bands", () => {
    const short = databasePlayers.find((player) => player.heightInches < 78);
    const big = databasePlayers.find((player) => player.heightInches >= 84);
    expect(short && big).toBeTruthy();

    expect(
      playerMatchesTierListFilters(short!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        heightBand: "under-66",
      }),
    ).toBe(true);
    expect(
      playerMatchesTierListFilters(short!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        heightBand: "7-plus",
      }),
    ).toBe(false);
    expect(
      playerMatchesTierListFilters(big!, {
        ...DEFAULT_TIER_LIST_FILTERS,
        heightBand: "7-plus",
      }),
    ).toBe(true);
  });

  it("reorders within a tier using insertBeforePlayerId", () => {
    const state = createDefaultTierListState();
    const tierId = state.tiers[0]!.id;
    let next = movePlayerToTier(state, "a", tierId);
    next = movePlayerToTier(next, "b", tierId);
    next = movePlayerToTier(next, "c", tierId);
    expect(next.tiers[0]!.playerIds).toEqual(["a", "b", "c"]);

    next = movePlayerToTier(next, "c", tierId, "a");
    expect(next.tiers[0]!.playerIds).toEqual(["c", "a", "b"]);
  });

  it("caps boards at twelve tiers", () => {
    let state = createDefaultTierListState();
    while (state.tiers.length < TIER_LIST_MAX_TIERS) {
      state = addTier(state);
    }
    expect(state.tiers).toHaveLength(TIER_LIST_MAX_TIERS);
    expect(addTier(state).tiers).toHaveLength(TIER_LIST_MAX_TIERS);
  });

  it("sorts My lists by published like counts", () => {
    const documents = [
      {
        id: "local-1",
        title: "Unpublished",
        tiers: createDefaultTierListState().tiers,
        savedAt: 300,
        publishedId: null,
      },
      {
        id: "local-2",
        title: "Quiet pub",
        tiers: createDefaultTierListState().tiers,
        savedAt: 200,
        publishedId: "pub-quiet",
      },
      {
        id: "local-3",
        title: "Hot pub",
        tiers: createDefaultTierListState().tiers,
        savedAt: 100,
        publishedId: "pub-hot",
      },
    ];

    const sorted = sortTierListLibraryDocuments(documents, "likes", {
      "pub-quiet": 1,
      "pub-hot": 9,
    });
    expect(sorted.map((doc) => doc.id)).toEqual([
      "local-3",
      "local-2",
      "local-1",
    ]);
  });
});
