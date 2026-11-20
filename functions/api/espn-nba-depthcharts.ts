/** Same-origin proxy: ESPN team depth charts omit CORS on site.web.api. */
const ESPN_TEAM_ID = /^\d{1,2}$/;
const ESPN_DEPTHCHART_URL = (espnTeamId: string) =>
  `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${encodeURIComponent(espnTeamId)}/depthcharts`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });

const parseTeamIds = (value: string | null) => {
  const ids = [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((token) => token.trim())
        .filter((token) => ESPN_TEAM_ID.test(token))
        .map((token) => Number(token))
        .filter((id) => id >= 1 && id <= 30),
    ),
  ];
  return ids.slice(0, 30);
};

export const onRequestGet: PagesFunction = async (context) => {
  const ids = parseTeamIds(new URL(context.request.url).searchParams.get("teams"));
  if (!ids.length) {
    return json({ error: "teams is required" }, 400);
  }

  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await fetch(ESPN_DEPTHCHART_URL(String(id)), {
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          return [String(id), null] as const;
        }
        return [String(id), await response.json()] as const;
      } catch {
        return [String(id), null] as const;
      }
    }),
  );

  return json({
    depthcharts: Object.fromEntries(entries.filter(([, payload]) => payload)),
  });
};
