export const AUTH_NETWORK_TIMEOUT_MS = 45_000;
export const PROFILE_BOOTSTRAP_TIMEOUT_MS = 45_000;

/**
 * Fails fast when the underlying auth/network call never settles (common source of “infinite spinner”).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}
