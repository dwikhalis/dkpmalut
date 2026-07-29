const CACHE_PREFIX = "dkpmalut:session-cache:";
export const MESSAGE_LIST_CACHE_KEY = "dashboard-messages";

type CacheEntry<T> = {
  value: T;
  cachedAt: number;
};

export function getSessionCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as CacheEntry<T>;
    if (
      !Number.isFinite(parsed.cachedAt) ||
      Date.now() - parsed.cachedAt > ttlMs
    ) {
      window.sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function setSessionCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ value, cachedAt: Date.now() }),
    );
  } catch {
    // Storage restrictions should not prevent the screen from working.
  }
}

export function invalidateSessionCache(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // Cache invalidation is best-effort.
  }
}

export function clearSessionCaches() {
  if (typeof window === "undefined") return;

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache cleanup is best-effort.
  }
}
