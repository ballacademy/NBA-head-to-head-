import type { Env } from "../../types";
import {
  jsonClearingSessionCookie,
  readSessionTokenFromRequest,
  revokeAccountSessionByToken,
} from "../../lib/accountSessions";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonClearingSessionCookie(
      { error: "Account database is not configured." },
      503,
    );
  }

  const token = readSessionTokenFromRequest(context.request);
  if (token) {
    try {
      await revokeAccountSessionByToken(context.env.DB, token);
    } catch {
      // Still clear the browser cookie even if revoke fails.
    }
  }

  return jsonClearingSessionCookie({ ok: true });
};
