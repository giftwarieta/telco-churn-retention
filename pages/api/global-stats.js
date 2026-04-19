// pages/api/global-stats.js
// Global cumulative stats via Vercel KV (Redis).
// Supports both app-specific telcom_churn_* env vars and the generic KV_* names.

const STATS_KEY = 'churniq:global_stats';

const defaultStats = {
  totalPredictions: 0,
  batchFilesProcessed: 0,
  totalRecordsAnalyzed: 0,
  highRiskDetected: 0,
  mediumRiskDetected: 0,
  lowRiskDetected: 0,
  totalConsultations: 0,
  roiCalculations: 0,
  shapAnalysisRun: 0,
  createdAt: null,
  lastUpdated: null,
};

function getKvUrl() {
  return process.env.telcom_churn_KV_REST_API_URL || process.env.KV_REST_API_URL || null;
}

function getKvToken() {
  return process.env.telcom_churn_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || null;
}

async function kvGet(key) {
  const url = getKvUrl();
  const token = getKvToken();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

async function kvSet(key, value) {
  const url = getKvUrl();
  const token = getKvToken();
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: JSON.stringify(value) }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function getStats() {
  const raw = await kvGet(STATS_KEY);
  if (!raw) return { ...defaultStats, createdAt: new Date().toISOString() };

  try {
    return JSON.parse(raw);
  } catch {
    return { ...defaultStats, createdAt: new Date().toISOString() };
  }
}

export default async function handler(req, res) {
  const kvConfigured = !!(getKvUrl() && getKvToken());

  if (req.method === 'GET') {
    if (!kvConfigured) {
      return res.status(200).json({
        ...defaultStats,
        _kvConfigured: false,
      });
    }

    const stats = await getStats();
    return res.status(200).json({ ...stats, _kvConfigured: true });
  }

  if (req.method === 'POST') {
    if (!kvConfigured) {
      return res.status(200).json({ ok: true, _kvConfigured: false });
    }

    const increments = req.body;
    if (!increments || typeof increments !== 'object') {
      return res.status(400).json({ error: 'Body must be a JSON object of stat increments' });
    }

    const current = await getStats();
    const updated = { ...current };

    for (const [key, delta] of Object.entries(increments)) {
      if (key in defaultStats && typeof delta === 'number') {
        updated[key] = (current[key] || 0) + delta;
      }
    }

    updated.lastUpdated = new Date().toISOString();
    if (!updated.createdAt) updated.createdAt = new Date().toISOString();

    await kvSet(STATS_KEY, updated);
    return res.status(200).json({ ok: true, stats: updated, _kvConfigured: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
