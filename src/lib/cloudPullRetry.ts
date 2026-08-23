/**
 * Retry cloud pulls after a failed first attempt so push gates do not stay
 * closed for the rest of the session (collection / achievements / career / …).
 */

export type CloudPullOutcome = "ok" | "skipped" | "failed";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const isAbortError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError",
  );

export const CLOUD_PULL_MAX_ATTEMPTS = 6;
export const CLOUD_PULL_BASE_DELAY_MS = 1_500;

/**
 * Runs `pull` until it succeeds, the player is not linked, attempts are
 * exhausted, or `signal` aborts. Callers should only mark a one-shot gate
 * closed on `"ok"` or `"skipped"` — never on `"failed"`.
 */
export const runCloudPullWithRetry = async <T>(params: {
  isLinked: () => Promise<boolean>;
  pull: () => Promise<T | null>;
  onSuccess?: (value: T) => void;
  signal?: AbortSignal;
  maxAttempts?: number;
  baseDelayMs?: number;
}): Promise<CloudPullOutcome> => {
  const maxAttempts = params.maxAttempts ?? CLOUD_PULL_MAX_ATTEMPTS;
  const baseDelayMs = params.baseDelayMs ?? CLOUD_PULL_BASE_DELAY_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (params.signal?.aborted) {
      return "failed";
    }

    if (!(await params.isLinked())) {
      return "skipped";
    }

    try {
      const result = await params.pull();
      if (result != null) {
        params.onSuccess?.(result);
        return "ok";
      }
    } catch (error) {
      if (isAbortError(error) || params.signal?.aborted) {
        return "failed";
      }
    }

    if (attempt >= maxAttempts || params.signal?.aborted) {
      break;
    }

    const delay = Math.min(30_000, baseDelayMs * 2 ** (attempt - 1));
    try {
      await sleep(delay, params.signal);
    } catch {
      return "failed";
    }
  }

  return "failed";
};
