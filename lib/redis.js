const REDIS_URL_ENV_KEYS = [
  'telcom_churn_UPSTASH_REDIS_REST_URL',
  'TELCOM_CHURN_UPSTASH_REDIS_REST_URL',
  'telcom_churn_KV_REST_API_URL',
  'TELCOM_CHURN_KV_REST_API_URL',
  'UPSTASH_REDIS_REST_URL',
  'KV_REST_API_URL',
];

const REDIS_TOKEN_ENV_KEYS = [
  'telcom_churn_UPSTASH_REDIS_REST_TOKEN',
  'TELCOM_CHURN_UPSTASH_REDIS_REST_TOKEN',
  'telcom_churn_KV_REST_API_TOKEN',
  'TELCOM_CHURN_KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_TOKEN',
];

function readFirstEnvValue(keys = []) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function getRedisConfig() {
  const url = readFirstEnvValue(REDIS_URL_ENV_KEYS);
  const token = readFirstEnvValue(REDIS_TOKEN_ENV_KEYS);

  return {
    url,
    token,
    configured: Boolean(url && token),
    provider: url?.includes('upstash.io') ? 'upstash-redis' : url ? 'redis-rest' : 'unconfigured',
  };
}

function getRedisHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function encodeRedisArg(value) {
  return encodeURIComponent(String(value));
}

async function parseRedisResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || `Redis request failed with HTTP ${response.status}`);
  }

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return payload?.result ?? null;
}

export async function runRedisCommand(command, args = [], options = {}) {
  const config = getRedisConfig();
  if (!config.configured) return null;

  const method = options.method || 'GET';
  const path = [command, ...args].map(encodeRedisArg).join('/');
  const response = await fetch(`${config.url}/${path}`, {
    method,
    headers: getRedisHeaders(config.token),
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(5000),
  });

  return parseRedisResponse(response);
}

export async function runRedisBatch(commands = [], transactional = false) {
  const config = getRedisConfig();
  if (!config.configured || !Array.isArray(commands) || commands.length === 0) return [];

  const endpoint = transactional ? 'multi-exec' : 'pipeline';
  const response = await fetch(`${config.url}/${endpoint}`, {
    method: 'POST',
    headers: getRedisHeaders(config.token),
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
  });

  const payload = await response.json().catch(() => []);

  if (!response.ok) {
    const firstError = Array.isArray(payload)
      ? payload.find((item) => item?.error)?.error
      : payload?.error;
    throw new Error(firstError || `Redis ${endpoint} request failed with HTTP ${response.status}`);
  }

  if (Array.isArray(payload)) {
    const firstError = payload.find((item) => item?.error)?.error;
    if (firstError) {
      throw new Error(firstError);
    }
    return payload;
  }

  return [];
}

export function normaliseRedisHash(value) {
  if (!value) return null;

  if (Array.isArray(value)) {
    const hash = {};

    for (let index = 0; index < value.length; index += 2) {
      const field = value[index];
      const fieldValue = value[index + 1];
      if (field !== undefined) {
        hash[String(field)] = fieldValue;
      }
    }

    return hash;
  }

  if (typeof value === 'object') {
    return value;
  }

  return null;
}
