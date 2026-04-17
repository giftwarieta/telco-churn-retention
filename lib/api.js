// lib/api.js - Unified API client

function normalizeBaseUrl(url = '') {
  return url.replace(/\/+$/, '');
}

function isPlaceholderUrl(url = '') {
  return /your-(fastapi-)?backend|example|railway\.app$/i.test(url);
}

function isSameOriginRootUrl(url) {
  if (typeof window === 'undefined') return false;

  try {
    const parsed = new URL(url, window.location.origin);
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.origin === window.location.origin && pathname === '/';
  } catch {
    return false;
  }
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl && !isPlaceholderUrl(configuredUrl)) {
    if (isSameOriginRootUrl(configuredUrl)) {
      return '/api/backend';
    }
    return normalizeBaseUrl(configuredUrl);
  }

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:8000';
  }

  return '/api/backend';
}

export function getApiMode() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl && !isPlaceholderUrl(configuredUrl)) {
    return 'configured';
  }

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'local';
  }

  return 'vercel-function';
}

async function request(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Backend service is not configured');
  }

  const url = `${baseUrl}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- Prediction ----
export async function predictSingle(data) {
  return request('/predict', { method: 'POST', body: JSON.stringify(data) });
}

export async function predictBatch(formData) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Backend service is not configured');
  }

  const res = await fetch(`${baseUrl}/predict/batch`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Batch prediction failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- SHAP Insights ----
export async function getSHAPExplanation(data) {
  return request('/explain/shap', { method: 'POST', body: JSON.stringify(data) });
}

export async function getLIMEExplanation(data) {
  return request('/explain/lime', { method: 'POST', body: JSON.stringify(data) });
}

// ---- Model ----
export async function trainModel(params) {
  return request('/train', { method: 'POST', body: JSON.stringify(params) });
}

export async function getModelInfo() {
  return request('/model/info');
}

export async function getModelMetrics() {
  return request('/model/metrics');
}

// ---- Business ROI ----
export async function calculateROI(data) {
  return request('/roi/calculate', { method: 'POST', body: JSON.stringify(data) });
}

// ---- Health Check ----
export async function healthCheck() {
  return request('/health');
}

// ---- AI Consultant (via Next.js API route) ----
export async function chatWithConsultant(messages, context = {}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json();
}

export default { predictSingle, predictBatch, getSHAPExplanation, getLIMEExplanation, trainModel, getModelInfo, getModelMetrics, calculateROI, healthCheck, chatWithConsultant };
