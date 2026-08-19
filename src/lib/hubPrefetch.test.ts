import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleIdleHubPrefetch } from "./hubPrefetch";

describe("scheduleIdleHubPrefetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses requestIdleCallback when the browser supports it", () => {
    const cancelIdleCallback = vi.fn();
    const requestIdleCallback = vi.fn().mockReturnValue(11);
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);
    vi.stubGlobal("cancelIdleCallback", cancelIdleCallback);

    const cancel = scheduleIdleHubPrefetch();
    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(requestIdleCallback.mock.calls[0]?.[1]).toEqual({ timeout: 1500 });

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(11);
  });

  it("falls back to a short timeout", () => {
    const timeoutId = 22 as unknown as ReturnType<typeof setTimeout>;
    const setTimeoutMock = vi.fn().mockReturnValue(timeoutId);
    const clearTimeoutMock = vi.fn();
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.stubGlobal("setTimeout", setTimeoutMock);
    vi.stubGlobal("clearTimeout", clearTimeoutMock);

    const cancel = scheduleIdleHubPrefetch();
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 400);

    cancel();
    expect(clearTimeoutMock).toHaveBeenCalledWith(timeoutId);
  });
});
