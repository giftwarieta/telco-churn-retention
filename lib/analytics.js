// lib/analytics.js - Client-side usage tracking
const STORAGE_KEY = 'telco_churn_analytics';
const GLOBAL_STATS_CACHE_KEY = 'churniq:global_stats_cache';

const defaultStats = {
  totalPredictions: 0,
  totalBatchPredictions: 0,
  batchFilesProcessed: 0,
  totalRecordsAnalyzed: 0,
  highRiskDetected: 0,
  mediumRiskDetected: 0,
  lowRiskDetected: 0,
  totalConsultations: 0,
  totalTrainingSessions: 0,
  shapAnalysisRun: 0,
  roiCalculations: 0,
  pageViews: {},
  sessionHistory: [],
  lastUpdated: null,
  createdAt: null,
};

export function getStats() {
  if (typeof window === 'undefined') return defaultStats;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultStats, createdAt: new Date().toISOString() };
    return JSON.parse(raw);
  } catch {
    return { ...defaultStats, createdAt: new Date().toISOString() };
  }
}

export function updateStats(updates) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStats();
    const updated = {
      ...current,
      ...Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [
          k,
          typeof v === 'number' ? (current[k] || 0) + v : v,
        ])
      ),
      lastUpdated: new Date().toISOString(),
      createdAt: current.createdAt || new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {}
}

export function trackPageView(page) {
  if (typeof window === 'undefined') return;
  const stats = getStats();
  const views = stats.pageViews || {};
  views[page] = (views[page] || 0) + 1;
  updateStats({ pageViews: views });
}

export function addSessionEvent(event) {
  if (typeof window === 'undefined') return;
  const stats = getStats();
  const history = (stats.sessionHistory || []).slice(-49);
  history.push({ ...event, timestamp: new Date().toISOString() });
  const s = getStats();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...s,
    sessionHistory: history,
    lastUpdated: new Date().toISOString(),
  }));
}

export function clearStats() {
  if (typeof window === 'undefined') return;
  const fresh = { ...defaultStats, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function getWeeklyTrend() {
  const stats = getStats();
  const history = stats.sessionHistory || [];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  return days.map(day => ({
    date: day,
    label: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
    predictions: history.filter(e => e.timestamp?.startsWith(day) && e.type === 'prediction').length,
    consultations: history.filter(e => e.timestamp?.startsWith(day) && e.type === 'consultation').length,
  }));
}

// ── Global stats sync ────────────────────────────────────────────────────────
// Fields that map directly to the global stats schema
const GLOBAL_STAT_FIELDS = new Set([
  'totalPredictions', 'batchFilesProcessed', 'totalRecordsAnalyzed',
  'highRiskDetected', 'mediumRiskDetected', 'lowRiskDetected',
  'totalConsultations', 'roiCalculations', 'shapAnalysisRun',
]);

// Fire-and-forget: push numeric increments to the server-side global stats API.
// Failures are silently swallowed so local tracking is never blocked.
export function pushGlobalStats(increments = {}) {
  if (typeof window === 'undefined') return;
  const payload = Object.fromEntries(
    Object.entries(increments).filter(
      ([k, v]) => GLOBAL_STAT_FIELDS.has(k) && typeof v === 'number' && v > 0
    )
  );
  if (Object.keys(payload).length === 0) return;

  fetch('/api/global-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(async (response) => {
      if (!response.ok) return null;

      const data = await response.json().catch(() => null);
      if (!data?.stats) return null;

      try {
        localStorage.setItem(
          GLOBAL_STATS_CACHE_KEY,
          JSON.stringify({
            ts: Date.now(),
            data: {
              ...data.stats,
              _storage: data._storage || null,
            },
          })
        );
      } catch {}

      return data;
    })
    .catch(() => {});
}
