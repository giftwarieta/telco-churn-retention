import { getRedisConfig, normaliseRedisHash, runRedisBatch, runRedisCommand } from '../../lib/redis';

const STATS_KEY = 'churniq:global_stats:v2';
const LEGACY_STATS_KEYS = ['churniq:global_stats'];

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
    legacyKeys: LEGACY_STATS_KEYS,
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

function normaliseSerializedStats(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') return value;
  return null;
}

function hasTrackedStats(stats = {}) {
  return NUMERIC_FIELDS.some((field) => Number(stats[field]) > 0) || Boolean(stats.createdAt || stats.lastUpdated);
}

function buildHashFields(stats = {}, { createdAt = null, lastUpdated = null } = {}) {
  const payload = [];

  for (const field of NUMERIC_FIELDS) {
    const safeValue = toSafeInteger(Number(stats[field]));
    payload.push(field, String(safeValue ?? 0));
  }

  const resolvedCreatedAt = stats.createdAt || createdAt;
  const resolvedLastUpdated = stats.lastUpdated || lastUpdated;

  if (resolvedCreatedAt) payload.push('createdAt', resolvedCreatedAt);
  if (resolvedLastUpdated) payload.push('lastUpdated', resolvedLastUpdated);

  return payload;
}

async function readStatsFromKey(key) {
  const keyType = await runRedisCommand('TYPE', [key], { readOnly: true });

  if (!keyType || keyType === 'none') return null;

  if (keyType === 'hash') {
    const stored = await runRedisCommand('HGETALL', [key], { readOnly: true });
    return {
      key,
      type: keyType,
      stats: normaliseStoredStats(stored),
    };
  }

  if (keyType === 'string') {
    const stored = await runRedisCommand('GET', [key], { readOnly: true });
    const parsed = normaliseSerializedStats(stored);

    if (!parsed) {
      throw new Error(`Stats key "${key}" is a string but does not contain valid JSON.`);
    }

    return {
      key,
      type: keyType,
      stats: normaliseStoredStats(parsed),
    };
  }

  throw new Error(`Stats key "${key}" has unsupported Redis type "${keyType}".`);
}

async function getStats() {
  const keysToTry = [STATS_KEY, ...LEGACY_STATS_KEYS];

  for (const key of keysToTry) {
    const record = await readStatsFromKey(key);
    if (record) return record;
  }

  return {
    key: STATS_KEY,
    type: 'none',
    stats: normaliseStoredStats(null),
  };
}

async function incrementStats(increments = {}) {
  const currentRecord = await getStats();
  const current = currentRecord.stats;
  const now = new Date().toISOString();
  const createdAt = current.createdAt || now;
  const commands = [];

  if (currentRecord.key !== STATS_KEY && hasTrackedStats(current)) {
    commands.push(['HSET', STATS_KEY, ...buildHashFields(current, { createdAt, lastUpdated: current.lastUpdated || now })]);
  }

  commands.push(
    ...Object.entries(increments)
    .map(([field, value]) => {
      const safeValue = toSafeInteger(value);
      if (!NUMERIC_FIELDS.includes(field) || safeValue === null || safeValue === 0) return null;

      return ['HINCRBY', STATS_KEY, field, String(safeValue)];
    })
    .filter(Boolean)
  );

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
        ...stats.stats,
        _storage: {
          ...storage,
          sourceKey: stats.key,
          sourceType: stats.type,
        },
      });
    } catch (error) {
      console.error('Global stats read error:', error);
      return res.status(200).json({
        ...defaultStats,
        _storage: {
          ...storage,
          error: 'read_failed',
          message: error?.message || 'Unknown Redis read error',
        },
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
        _storage: {
          ...storage,
          error: 'write_failed',
          message: error?.message || 'Unknown Redis write error',
        },
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
