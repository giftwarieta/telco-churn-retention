import fs from 'fs';
import path from 'path';
import { summarizeCsvText } from '../../lib/data-profile';

const DEFAULT_DATASET_PATH = path.join(process.cwd(), 'data', 'WA_Fn-UseC_-Telco-Customer-Churn 2.csv');

let cachedSummary = null;

function getDefaultDatasetSummary() {
  if (cachedSummary) {
    return cachedSummary;
  }

  const csvText = fs.readFileSync(DEFAULT_DATASET_PATH, 'utf-8');
  cachedSummary = summarizeCsvText(csvText, {
    datasetName: 'IBM Telco churn dataset',
  });
  return cachedSummary;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const summary = getDefaultDatasetSummary();
    return res.status(200).json({ summary });
  } catch {
    return res.status(200).json({ summary: null });
  }
}
