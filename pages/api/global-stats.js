import { getRedisConfig, normaliseRedisHash, runRedisBatch, runRedisCommand } from '../../lib/redis';

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

const NUMERIC_FIELDS = Object.keys(defaultStats).filter(
  (key) => typeof defaultStats[key] === 'number'
);

function buildStorageMeta() {
  const config = getRedisConfig();
  return {
    configured: config.configured,
    provider: config.provider,
    key: STATS_KEY,
  };
}

function toSafeInteger(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function normaliseStoredStats(hash) {
  const normalized = {
    ...defaultStats,
    createdAt: null,
    lastUpdated: null,
  };

  const raw = normaliseRedisHash(hash);
  if (!raw) return normalized;

  for (const field of NUMERIC_FIELDS) {
    const parsed = Number(raw[field]);
    normalized[field] = Number.isFinite(parsed) ? parsed : defaultStats[field];
  }

  normalized.createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : null;
  normalized.lastUpdated = typeof raw.lastUpdated === 'string' ? raw.lastUpdated : null;

  return normalized;
}

async function getStats() {
  const stored = await runRedisCommand('hgetall', [STATS_KEY]);
  return normaliseStoredStats(stored);
}

async function incrementStats(increments = {}) {
  const current = await getStats();
  const now = new Date().toISOString();
  const createdAt = current.createdAt || now;

  const commands = Object.entries(increments)
    .map(([field, value]) => {
      const safeValue = toSafeInteger(value);
      if (!NUMERIC_FIELDS.includes(field) || safeValue === null || safeValue === 0) return null;

      return ['HINCRBY', STATS_KEY, field, String(safeValue)];
    })
    .filter(Boolean);

  commands.push(['HSET', STATS_KEY, 'createdAt', createdAt, 'lastUpdated', now]);

  await runRedisBatch(commands, true);

  const updated = { ...current, createdAt, lastUpdated: now };
  for (const [field, value] of Object.entries(increments)) {
    const safeValue = toSafeInteger(value);
    if (!NUMERIC_FIELDS.includes(field) || safeValue === null) continue;
    updated[field] = (updated[field] || 0) + safeValue;
  }

  return updated;
}

export default async function handler(req, res) {
  const storage = buildStorageMeta();

  if (req.method === 'GET') {
    if (!storage.configured) {
      return res.status(200).json({
        ...defaultStats,
        _storage: storage,
      });
    }

    try {
      const stats = await getStats();
      return res.status(200).json({
        ...stats,
        _storage: storage,
      });
    } catch (error) {
      console.error('Global stats read error:', error);
      return res.status(200).json({
        ...defaultStats,
        _storage: { ...storage, error: 'read_failed' },
      });
    }
  }

  if (req.method === 'POST') {
    if (!storage.configured) {
      return res.status(200).json({ ok: true, _storage: storage });
    }

    const increments = req.body;
    if (!increments || typeof increments !== 'object' || Array.isArray(increments)) {
      return res.status(400).json({ error: 'Body must be a JSON object of stat increments' });
    }

    try {
      const stats = await incrementStats(increments);
      return res.status(200).json({
        ok: true,
        stats,
        _storage: storage,
      });
    } catch (error) {
      console.error('Global stats write error:', error);
      return res.status(200).json({
        ok: false,
        _storage: { ...storage, error: 'write_failed' },
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
