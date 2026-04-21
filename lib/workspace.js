import { parseCsvText, summarizeCsvText } from './data-profile';

const WORKSPACE_CONTEXT_KEY = 'churniq_workspace_context';
const CUSTOM_DATASET_KEY = 'churniq_custom_dataset';
const TRAINING_SESSION_KEY = 'churniq_training_session';
const CONSULTANT_PROFILE_KEY = 'churniq_consultant_profile';
const CONSULTANT_HISTORY_KEY = 'churniq_consultant_history';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getDefaultWorkspaceContext() {
  return {
    dataSource: 'default',
    datasetName: 'IBM Telco churn dataset',
    customerCount: 7043,
    datasetScope: 'persistent-default',
    modelLabel: 'Pre-trained XGBoost model',
    modelSource: 'default',
    modelStatus: 'active',
    selectedAlgorithm: 'xgboost',
    updatedAt: null,
  };
}

export function getWorkspaceContext() {
  if (!canUseSessionStorage()) {
    return getDefaultWorkspaceContext();
  }

  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_CONTEXT_KEY);
    if (!raw) return getDefaultWorkspaceContext();
    return { ...getDefaultWorkspaceContext(), ...JSON.parse(raw) };
  } catch {
    return getDefaultWorkspaceContext();
  }
}

export function setWorkspaceContext(nextContext) {
  const updated = {
    ...getWorkspaceContext(),
    ...nextContext,
    updatedAt: new Date().toISOString(),
  };

  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(WORKSPACE_CONTEXT_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export function setDefaultWorkspaceModel() {
  return setWorkspaceContext({
    dataSource: 'default',
    datasetName: 'IBM Telco churn dataset',
    customerCount: 7043,
    datasetScope: 'persistent-default',
    modelLabel: 'Pre-trained XGBoost model',
    modelSource: 'default',
    modelStatus: 'active',
    selectedAlgorithm: 'xgboost',
  });
}

export async function saveCustomDatasetSession(file) {
  if (!file || typeof file.text !== 'function') return null;

  const content = await file.text();
  const rowCount = Math.max(
    0,
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length - 1
  );

  const payload = {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    uploadedAt: new Date().toISOString(),
    rowCount,
    content,
    summary: summarizeCsvText(content, {
      datasetName: file.name,
    }),
  };

  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(CUSTOM_DATASET_KEY, JSON.stringify(payload));
      window.sessionStorage.removeItem(TRAINING_SESSION_KEY);
    } catch {}
  }

  setWorkspaceContext({
    dataSource: 'custom',
    datasetName: file.name,
    customerCount: rowCount,
    datasetScope: 'session-only',
    modelLabel: 'Model selection pending',
    modelSource: 'custom',
    modelStatus: 'pending',
    selectedAlgorithm: null,
  });

  return payload;
}

export function getCustomDatasetSession() {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(CUSTOM_DATASET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCustomDatasetSession() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(CUSTOM_DATASET_KEY);
    window.sessionStorage.removeItem(TRAINING_SESSION_KEY);
  } catch {}
}

export function saveTrainingSession(session = {}) {
  const updated = {
    algorithm: session.algorithm || null,
    testSize: typeof session.testSize === 'number' ? session.testSize : null,
    result: session.result || null,
    sessionModel: session.sessionModel || null,
    datasetName: session.datasetName || null,
    savedAt: new Date().toISOString(),
  };

  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(TRAINING_SESSION_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export function getTrainingSession() {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(TRAINING_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTrainingSession() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(TRAINING_SESSION_KEY);
  } catch {}
}

export function getActiveDataSummary() {
  const dataset = getCustomDatasetSession();
  if (dataset?.summary) return dataset.summary;
  return null;
}

export function getSessionSampleCustomer() {
  const dataset = getCustomDatasetSession();
  if (!dataset?.content) return null;

  try {
    const records = parseCsvText(dataset.content);
    return records[0] || null;
  } catch {
    return null;
  }
}

export function getActiveCustomModelContext() {
  const workspace = getWorkspaceContext();
  if (workspace.dataSource !== 'custom') return null;

  const training = getTrainingSession();
  if (!training?.sessionModel?.artifact) return null;

  return {
    algorithm: training.algorithm || workspace.selectedAlgorithm || null,
    sessionModel: training.sessionModel,
    result: training.result || null,
    datasetName: training.datasetName || workspace.datasetName || null,
  };
}

export function getConsultantProfile() {
  if (!canUseSessionStorage()) {
    return { userName: '', companyName: '', updatedAt: null };
  }

  try {
    const raw = window.sessionStorage.getItem(CONSULTANT_PROFILE_KEY);
    if (!raw) return { userName: '', companyName: '', updatedAt: null };
    return { userName: '', companyName: '', updatedAt: null, ...JSON.parse(raw) };
  } catch {
    return { userName: '', companyName: '', updatedAt: null };
  }
}

export function setConsultantProfile(profile = {}) {
  const updated = {
    userName: String(profile.userName || '').trim(),
    companyName: String(profile.companyName || '').trim(),
    updatedAt: new Date().toISOString(),
  };

  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(CONSULTANT_PROFILE_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export function clearConsultantProfile() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(CONSULTANT_PROFILE_KEY);
  } catch {}
}

export function getConsultantHistory() {
  if (!canUseSessionStorage()) return [];

  try {
    const raw = window.sessionStorage.getItem(CONSULTANT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setConsultantHistory(messages = []) {
  if (!canUseSessionStorage()) return [];

  const compactMessages = (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.role && message?.content)
    .slice(-14);

  try {
    window.sessionStorage.setItem(CONSULTANT_HISTORY_KEY, JSON.stringify(compactMessages));
  } catch {}

  return compactMessages;
}

export function clearConsultantHistory() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(CONSULTANT_HISTORY_KEY);
  } catch {}
}

export function clearWorkspaceSession() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(WORKSPACE_CONTEXT_KEY);
    window.sessionStorage.removeItem(CUSTOM_DATASET_KEY);
    window.sessionStorage.removeItem(TRAINING_SESSION_KEY);
  } catch {}
}

export function setSelectedTrainingModel({ algorithm, label, status = 'selected' }) {
  return setWorkspaceContext({
    dataSource: 'custom',
    datasetScope: 'session-only',
    modelLabel: label || algorithm || 'Model selection pending',
    modelSource: 'custom',
    modelStatus: status,
    selectedAlgorithm: algorithm || null,
  });
}
