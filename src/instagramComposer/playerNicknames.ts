/** Extra search tokens for the player picker (Ant, Wemby, Bron, SGA). */
export const PLAYER_NICKNAMES: Record<string, string[]> = {
  "4594268": ["ant", "antman"],
  "5104157": ["wemby", "wembanyama"],
  "1966": ["bron", "king james", "the king"],
  "3975": ["steph"],
  "3032977": ["giannis", "greek freak"],
  "3112335": ["jokic", "joker"],
  "4278073": ["sga", "shai"],
  "3945274": ["luka"],
  "4065648": ["jt"],
  "6583": ["ad"],
  "3202": ["kd"],
  "3992": ["kd"],
  "6442": ["kawhi"],
  "6475": ["kyrie"],
  "3136193": ["dame"],
};

export const playerNicknameHaystack = (player: {
  id: string;
  name: string;
  team: string;
}) => {
  const extra = PLAYER_NICKNAMES[player.id] ?? [];
  return [player.name, player.team, ...extra].join(" ").toLowerCase();
};
