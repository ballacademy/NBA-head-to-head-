import { describe, expect, it } from "vitest";
import { isQaRuntimeHost } from "./qaRuntime";

describe("qaRuntime", () => {
  it("treats Cloudflare QA Pages and local hosts as QA", () => {
    expect(isQaRuntimeHost("nba-head-to-head-qa.pages.dev")).toBe(true);
    expect(
      isQaRuntimeHost("nba-head-to-head-qa.ballacademy.pages.dev"),
    ).toBe(true);
    expect(isQaRuntimeHost("qa.draftdaygm.com")).toBe(true);
    expect(isQaRuntimeHost("localhost")).toBe(true);
    expect(isQaRuntimeHost("127.0.0.1")).toBe(true);
  });

  it("does not treat production as QA", () => {
    expect(isQaRuntimeHost("www.draftdaygm.com")).toBe(false);
    expect(isQaRuntimeHost("draftdaygm.com")).toBe(false);
    expect(isQaRuntimeHost("nba-head-to-head.pages.dev")).toBe(false);
    expect(isQaRuntimeHost("")).toBe(false);
  });
});
