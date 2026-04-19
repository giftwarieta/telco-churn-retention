const GLOBAL_STATS_KEY = 'churniq:global_stats_cache';
const CACHE_TTL_MS = 2 * 60 * 1000;

export function loadGlobalStatsCache() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(GLOBAL_STATS_KEY);
    if (!raw) return null;

    const { ts, data } = JSON.parse(raw);
    if (!ts || !data || Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGlobalStatsCache(data) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GLOBAL_STATS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export async function fetchGlobalStats() {
  const res = await fetch('/api/global-stats');
  if (!res.ok) {
    throw new Error('Failed to fetch global stats');
  }
  return res.json();
}
