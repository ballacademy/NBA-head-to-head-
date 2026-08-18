import { describe, expect, it } from "vitest";
import { formatDailyDraftChooserStatus } from "./landingDailyDraft";

describe("formatDailyDraftChooserStatus", () => {
  it("shows not played when neither mode is done", () => {
    expect(
      formatDailyDraftChooserStatus({ basicDone: false, advancedDone: false }),
    ).toEqual({
      meta: "Not played today",
      tag: null,
      tagLabel: null,
    });
  });

  it("marks one mode done as in progress", () => {
    expect(
      formatDailyDraftChooserStatus({ basicDone: true, advancedDone: false }),
    ).toEqual({
      meta: "Basic done · Advanced open",
      tag: "progress",
      tagLabel: "1/2",
    });
    expect(
      formatDailyDraftChooserStatus({ basicDone: false, advancedDone: true }),
    ).toEqual({
      meta: "Advanced done · Basic open",
      tag: "progress",
      tagLabel: "1/2",
    });
  });

  it("marks both modes completed", () => {
    expect(
      formatDailyDraftChooserStatus({ basicDone: true, advancedDone: true }),
    ).toEqual({
      meta: "Basic & Advanced completed",
      tag: "completed",
      tagLabel: "Completed",
    });
  });
});
