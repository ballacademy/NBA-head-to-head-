import { describe, expect, it } from "vitest";
import {
  formatDailyDraftChooserStatus,
  formatFranchiseDailyPlayCta,
  shouldShowFranchiseDailyPlayCta,
} from "./landingDailyDraft";

describe("formatDailyDraftChooserStatus", () => {
  it("shows ready today when neither mode is done", () => {
    expect(
      formatDailyDraftChooserStatus({ basicDone: false, advancedDone: false }),
    ).toEqual({
      meta: "Ready today · Basic & Advanced",
      tag: "open",
      tagLabel: "Open",
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

  it("hides the Franchise Play Daily CTA only after both lineups are done", () => {
    expect(
      shouldShowFranchiseDailyPlayCta(
        formatDailyDraftChooserStatus({
          basicDone: false,
          advancedDone: false,
        }),
      ),
    ).toBe(true);
    expect(
      shouldShowFranchiseDailyPlayCta(
        formatDailyDraftChooserStatus({
          basicDone: true,
          advancedDone: false,
        }),
      ),
    ).toBe(true);
    expect(
      shouldShowFranchiseDailyPlayCta(
        formatDailyDraftChooserStatus({
          basicDone: true,
          advancedDone: true,
        }),
      ),
    ).toBe(false);
  });

  it("labels the Franchise Daily CTA as play, finish, or hidden", () => {
    expect(
      formatFranchiseDailyPlayCta(
        formatDailyDraftChooserStatus({
          basicDone: false,
          advancedDone: false,
        }),
      ),
    ).toBe("Play Daily");
    expect(
      formatFranchiseDailyPlayCta(
        formatDailyDraftChooserStatus({
          basicDone: true,
          advancedDone: false,
        }),
      ),
    ).toBe("Finish Daily");
    expect(
      formatFranchiseDailyPlayCta(
        formatDailyDraftChooserStatus({
          basicDone: true,
          advancedDone: true,
        }),
      ),
    ).toBeNull();
  });
});
