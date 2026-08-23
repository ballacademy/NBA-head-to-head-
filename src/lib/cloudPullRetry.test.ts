import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCloudPullWithRetry } from "./cloudPullRetry";

describe("runCloudPullWithRetry", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns skipped when the player is not linked", async () => {
    const pull = vi.fn(async () => ({ ok: true }));
    const outcome = await runCloudPullWithRetry({
      isLinked: async () => false,
      pull,
      maxAttempts: 3,
      baseDelayMs: 1,
    });
    expect(outcome).toBe("skipped");
    expect(pull).not.toHaveBeenCalled();
  });

  it("retries failed pulls until success", async () => {
    const pull = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ unlocked: ["a"] });
    const onSuccess = vi.fn();

    const outcome = await runCloudPullWithRetry({
      isLinked: async () => true,
      pull,
      onSuccess,
      maxAttempts: 5,
      baseDelayMs: 1,
    });

    expect(outcome).toBe("ok");
    expect(pull).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalledWith({ unlocked: ["a"] });
  });

  it("returns failed after exhausting attempts", async () => {
    const pull = vi.fn(async () => null);
    const outcome = await runCloudPullWithRetry({
      isLinked: async () => true,
      pull,
      maxAttempts: 3,
      baseDelayMs: 1,
    });
    expect(outcome).toBe("failed");
    expect(pull).toHaveBeenCalledTimes(3);
  });
});
