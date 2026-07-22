/** Opaque public row ids so leaderboards do not expose claimable GM UUIDs. */

const bytesToHex = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const PUBLIC_PLAYER_ID_PREFIX = "p_";

export const isPublicOpaquePlayerId = (playerId: string) =>
  playerId.startsWith(PUBLIC_PLAYER_ID_PREFIX);

export const toPublicLeaderboardPlayerId = async (playerId: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`leaderboard-public:${playerId}`),
  );

  return `${PUBLIC_PLAYER_ID_PREFIX}${bytesToHex(digest).slice(0, 24)}`;
};

export const toLeaderboardPublicEntry = async (
  row: {
    player_id: string;
    team_name: string;
    public_tag: string;
    elo: number;
    wins: number;
    losses: number;
    win_streak: number;
    loss_streak: number;
    updated_at: string;
  },
  viewerPlayerId: string,
) => {
  const isYou = Boolean(viewerPlayerId) && row.player_id === viewerPlayerId;

  return {
    playerId: isYou
      ? row.player_id
      : await toPublicLeaderboardPlayerId(row.player_id),
    isYou,
    name: row.team_name,
    publicTag: row.public_tag,
    elo: row.elo,
    wins: row.wins,
    losses: row.losses,
    winStreak: row.win_streak,
    lossStreak: row.loss_streak,
    updatedAt: row.updated_at,
  };
};
