const CACHE_PREFIX = "dkpmalut:dataset-list:";
const CACHE_TTL_MS = 5 * 60 * 1000;

type DatasetListCache<TDataset, TOwner> = {
  datasets: TDataset[];
  owners: TOwner[];
  cachedAt: number;
};

export function getDatasetListCache<TDataset, TOwner>(scope: string) {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(`${CACHE_PREFIX}${scope}`);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as DatasetListCache<TDataset, TOwner>;

    if (
      !Array.isArray(parsed.datasets) ||
      !Array.isArray(parsed.owners) ||
      !Number.isFinite(parsed.cachedAt) ||
      Date.now() - parsed.cachedAt > CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(`${CACHE_PREFIX}${scope}`);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setDatasetListCache<TDataset, TOwner>(
  scope: string,
  datasets: TDataset[],
  owners: TOwner[],
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `${CACHE_PREFIX}${scope}`,
      JSON.stringify({ datasets, owners, cachedAt: Date.now() }),
    );
  } catch {
    // A storage quota or privacy restriction should not block normal fetching.
  }
}

export function invalidateDatasetListCache() {
  if (typeof window === "undefined") return;

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache invalidation is best-effort; the TTL remains as a fallback.
  }
}
