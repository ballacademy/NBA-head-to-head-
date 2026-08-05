import { formatUsername } from "./accountCredentials";

/** Team name, plus @username when the opponent has a linked account. */
export const formatOpponentDisplayName = (
  teamName: string,
  username?: string | null,
) => {
  const name = teamName.trim() || "Opponent";
  const handle = username?.trim();
  if (!handle) {
    return name;
  }

  return `${name} · ${formatUsername(handle)}`;
};
