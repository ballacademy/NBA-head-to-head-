import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCloudPullWithRetry, runTruthyWithRetry } from "./cloudPullRetry";

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

describe("runTruthyWithRetry", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("retries until a truthy value is returned", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ ok: true });

    await expect(
      runTruthyWithRetry({ run, maxAttempts: 4, baseDelayMs: 1 }),
    ).resolves.toEqual({ ok: true });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("returns null after exhausting attempts", async () => {
    const run = vi.fn(async () => null);
    await expect(
      runTruthyWithRetry({ run, maxAttempts: 3, baseDelayMs: 1 }),
    ).resolves.toBeNull();
    expect(run).toHaveBeenCalledTimes(3);
  });
});
