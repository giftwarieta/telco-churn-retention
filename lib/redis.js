// Map to the exact environment variables you configured in Vercel
const REDIS_URL_ENV_KEYS = [
  'telcom_churn_KV_REST_API_URL',
  'KV_REST_API_URL',
];

const REDIS_TOKEN_ENV_KEYS = [
  'telcom_churn_KV_REST_API_TOKEN',
  'KV_REST_API_TOKEN',
];

const REDIS_READ_ONLY_TOKEN_ENV_KEYS = [
  'telcom_churn_KV_REST_API_READ_ONLY_TOKEN',
  'KV_REST_API_READ_ONLY_TOKEN',
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

  return {
    url,
    token,
    readOnlyToken: readOnlyToken || token, // Fallback to main token if read-only is missing
    configured: Boolean(url && token),
    provider: url?.includes('upstash.io') ? 'upstash-redis' : url ? 'redis-rest' : 'unconfigured',
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

  const method = options.method || 'GET';
  // Use read-only token if explicitly requested (great for GET, HGET, etc.)
  const activeToken = options.readOnly ? config.readOnlyToken : config.token;
  
  const path = [command, ...args].map(encodeRedisArg).join('/');
  
  const response = await fetch(`${config.url}/${path}`, {
    method,
    headers: getRedisHeaders(activeToken),
    body: options.body ? JSON.stringify(options.body) : undefined,
    // Slightly longer timeout for Vercel production cold starts
    signal: AbortSignal.timeout(8000), 
    // cache: 'no-store' is crucial for Next.js 13+ App Router to prevent aggressive caching of DB calls
    cache: options.cache || 'no-store', 
  });

  return parseRedisResponse(response);
}

export async function runRedisBatch(commands = [], transactional = false) {
  const config = getRedisConfig();
  if (!config.configured || !Array.isArray(commands) || commands.length === 0) return [];

  const endpoint = transactional ? 'multi-exec' : 'pipeline';
  const response = await fetch(`${config.url}/${endpoint}`, {
    method: 'POST',
    headers: getRedisHeaders(config.token), // Batch operations usually require standard token
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000),
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