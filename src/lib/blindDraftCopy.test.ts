import { describe, expect, it } from "vitest";
import {
  BLIND_DRAFT_NAME_EXAMPLE,
  formatBlindDraftNamePlaceholder,
} from "./blindDraftCopy";

describe("blindDraftCopy", () => {
  it("uses a concrete example name", () => {
    expect(formatBlindDraftNamePlaceholder()).toBe(
      `e.g. ${BLIND_DRAFT_NAME_EXAMPLE}`,
    );
  });
});
