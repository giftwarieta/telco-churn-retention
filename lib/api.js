// lib/api.js - Unified API client
import { getActiveCustomModelContext, getSessionSampleCustomer } from './workspace';

function normalizeBaseUrl(url = '') {
  return url.replace(/\/+$/, '');
}

function isPlaceholderUrl(url = '') {
  return /your-(fastapi-)?backend|example|railway\.app$/i.test(url);
}

function hasApiPath(pathname = '') {
  return pathname.replace(/\/+$/, '') === '/api';
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

function ensureApiBasePath(url) {
  if (!url) return url;

  if (url.startsWith('/')) {
    const normalized = normalizeBaseUrl(url) || '/';
    return hasApiPath(normalized) ? normalized : `${normalized === '/' ? '' : normalized}/api`;
  }

  try {
    const parsed = new URL(url);
    if (!hasApiPath(parsed.pathname || '/')) {
      parsed.pathname = `${normalizeBaseUrl(parsed.pathname || '/')}/api`;
    }
    return normalizeBaseUrl(parsed.toString());
  } catch {
    const normalized = normalizeBaseUrl(url);
    return hasApiPath(normalized) ? normalized : `${normalized}/api`;
  }
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl && !isPlaceholderUrl(configuredUrl)) {
    if (isSameOriginRootUrl(configuredUrl)) {
      return '/api';
    }
    return ensureApiBasePath(configuredUrl);
  }

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:8000/api';
  }

  return '/api';
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

function getCustomSessionContext() {
  if (typeof window === 'undefined') return null;
  return getActiveCustomModelContext();
}

// ---- Prediction ----
export async function predictSingle(data) {
  const customContext = getCustomSessionContext();
  const payload = customContext
    ? { customer: data, sessionModel: customContext.sessionModel }
    : data;

  return request('/predict', { method: 'POST', body: JSON.stringify(payload) });
}

export async function predictBatch(formData) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Backend service is not configured');
  }

  const customContext = getCustomSessionContext();
  if (customContext?.sessionModel) {
    if (typeof formData.set === 'function') {
      formData.set('sessionModel', JSON.stringify(customContext.sessionModel));
    } else {
      formData.append('sessionModel', JSON.stringify(customContext.sessionModel));
    }
  } else if (typeof formData.delete === 'function') {
    formData.delete('sessionModel');
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
  const customContext = getCustomSessionContext();
  const payload = customContext
    ? data
      ? { customer: data, sessionModel: customContext.sessionModel }
      : { sessionModel: customContext.sessionModel }
    : data || {};

  return request('/explain/shap', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getLIMEExplanation(data) {
  const customContext = getCustomSessionContext();
  const customer = data || getSessionSampleCustomer() || {};
  const payload = customContext
    ? { customer, sessionModel: customContext.sessionModel }
    : customer;

  return request('/explain/lime', { method: 'POST', body: JSON.stringify(payload) });
}

// ---- Model ----
export async function trainModel(params) {
  return request('/train', { method: 'POST', body: JSON.stringify(params) });
}

export async function getModelInfo() {
  return request('/model/info');
}

export async function getModelMetrics() {
  const customContext = getCustomSessionContext();
  if (customContext?.result) {
    return {
      metrics: [
        { metric: 'accuracy', value: Number(customContext.result.accuracy || 0) },
        { metric: 'auc_roc', value: Number(customContext.result.auc_roc || 0) },
        { metric: 'precision', value: Number(customContext.result.precision || 0) },
        { metric: 'recall', value: Number(customContext.result.recall || 0) },
        { metric: 'f1', value: Number(customContext.result.f1 || 0) },
        { metric: 'records', value: Number((customContext.result.training_samples || 0) + (customContext.result.test_samples || 0)) },
      ],
    };
  }

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
