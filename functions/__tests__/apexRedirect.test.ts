import { describe, expect, it } from "vitest";

const CANONICAL_HOST = "www.draftdaygm.com";
const APEX_HOSTS = new Set(["draftdaygm.com"]);

const resolveCanonicalUrl = (requestUrl: string) => {
  const url = new URL(requestUrl);
  const host = url.hostname.toLowerCase();

  if (!APEX_HOSTS.has(host)) {
    return null;
  }

  url.hostname = CANONICAL_HOST;
  return url.toString();
};

describe("apex to www canonicalization", () => {
  it("redirects apex hostnames to www while preserving path and query", () => {
    expect(resolveCanonicalUrl("https://draftdaygm.com/play?x=1")).toBe(
      "https://www.draftdaygm.com/play?x=1",
    );
  });

  it("leaves www and other hosts alone", () => {
    expect(resolveCanonicalUrl("https://www.draftdaygm.com/")).toBeNull();
    expect(
      resolveCanonicalUrl("https://nba-head-to-head.pages.dev/"),
    ).toBeNull();
  });
});
