// lib/api.js - Unified API client

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
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
  const res = await fetch(`${BASE_URL}/predict/batch`, {
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
