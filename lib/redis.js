// Only use the exact telcom_churn environment variables configured in Vercel.
const REDIS_URL_ENV_KEYS = [
  'telcom_churn_KV_REST_API_URL',
];

const REDIS_TOKEN_ENV_KEYS = [
  'telcom_churn_KV_REST_API_TOKEN',
];

const REDIS_READ_ONLY_TOKEN_ENV_KEYS = [
  'telcom_churn_KV_REST_API_READ_ONLY_TOKEN',
];

const REDIS_CONNECTION_URL_ENV_KEYS = [
  'telcom_churn_KV_URL',
  'telcom_churn_REDIS_URL',
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
  const readOnlyToken = readFirstEnvValue(REDIS_READ_ONLY_TOKEN_ENV_KEYS);
  const connectionUrl = readFirstEnvValue(REDIS_CONNECTION_URL_ENV_KEYS);
  const normalizedUrl = typeof url === 'string' ? url.replace(/\/+$/, '') : null;

  return {
    url: normalizedUrl,
    token,
    readOnlyToken: readOnlyToken || token, // Fallback to main token if read-only is missing
    connectionUrl,
    configured: Boolean(normalizedUrl && token),
    provider: normalizedUrl?.includes('upstash.io') || normalizedUrl?.includes('vercel-storage.com')
      ? 'upstash-redis'
      : normalizedUrl
        ? 'redis-rest'
        : 'unconfigured',
  };
}

function getRedisHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    // 'Keep-Alive' is generally handled natively by Vercel's fetch implementation, 
    // but specifying application/json ensures strict Upstash compatibility.
  };
}

function encodeRedisArg(value) {
  return encodeURIComponent(String(value));
}

function normalizeRedisCommand(command) {
  return String(command || '').trim().toUpperCase();
}

function isReadOnlyCommand(command) {
  return new Set([
    'GET', 'MGET', 'HGET', 'HGETALL', 'HMGET', 'HEXISTS', 'HKEYS', 'HLEN', 'HSTRLEN', 'HVALS',
    'ZRANGE', 'ZRANK', 'ZSCORE', 'ZCARD', 'SMEMBERS', 'SCARD', 'SISMEMBER', 'LRANGE', 'LLEN',
    'PING', 'EXISTS', 'TTL', 'PTTL', 'TYPE',
  ]).has(normalizeRedisCommand(command));
}

async function executeRedisRequest({ url, method, token, body }) {
  const response = await fetch(url, {
    method,
    headers: getRedisHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });

  return parseRedisResponse(response);
}

async function parseRedisResponse(response) {
  // Use text() first to avoid JSON parse errors on unexpected Vercel gateway errors
  const text = await response.text();
  let payload = {};
  
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Failed to parse Redis response. Status: ${response.status}. Body: ${text.substring(0, 50)}`);
  }

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
  if (!config.configured) {
    console.warn('Redis is not configured. Skipping command:', command);
    return null;
  }

  const normalizedCommand = normalizeRedisCommand(command);
  const method = String(options.method || 'GET').toUpperCase();
  const shouldUseReadOnlyToken = typeof options.readOnly === 'boolean'
    ? options.readOnly
    : isReadOnlyCommand(normalizedCommand);
  const primaryToken = shouldUseReadOnlyToken ? config.readOnlyToken : config.token;
  const fallbackToken = config.token;
  const path = [normalizedCommand, ...args].map(encodeRedisArg).join('/');
  const requestUrl = `${config.url}/${path}`;

  try {
    return await executeRedisRequest({
      url: requestUrl,
      method,
      token: primaryToken,
      body: options.body,
    });
  } catch (primaryError) {
    const canRetryWithWriteToken = primaryToken && fallbackToken && primaryToken !== fallbackToken;
    if (canRetryWithWriteToken) {
      try {
        return await executeRedisRequest({
          url: requestUrl,
          method,
          token: fallbackToken,
          body: options.body,
        });
      } catch {}
    }

    if (method === 'GET') {
      return executeRedisRequest({
        url: requestUrl,
        method: 'POST',
        token: fallbackToken,
        body: options.body,
      });
    }

    throw primaryError;
  }
}

export async function runRedisBatch(commands = [], transactional = false) {
  const config = getRedisConfig();
  if (!config.configured || !Array.isArray(commands) || commands.length === 0) return [];

  const endpoint = transactional ? 'multi-exec' : 'pipeline';
  const response = await fetch(`${config.url}/${endpoint}`, {
    method: 'POST',
    headers: getRedisHeaders(config.token), // Batch operations usually require standard token
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload = [];
  try {
    payload = text ? JSON.parse(text) : [];
  } catch (e) {
    throw new Error(`Redis batch failed. HTTP ${response.status}`);
  }

  if (!response.ok) {
    const firstError = Array.isArray(payload)
      ? payload.find((item) => item?.error)?.error
      : payload?.error;
    throw new Error(firstError || `Redis ${endpoint} request failed with HTTP ${response.status}`);
  }

  if (Array.isArray(payload)) {
    const firstError = payload.find((item) => item?.error)?.error;
    if (firstError) throw new Error(firstError);
    return payload.map(item => item?.result ?? item); // Map directly to results
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

  if (typeof value === 'object') return value;
  return null;
}
