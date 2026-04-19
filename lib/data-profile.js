import Papa from 'papaparse';

const PRIORITY_NUMERIC_COLUMNS = ['tenure', 'MonthlyCharges', 'TotalCharges', 'SeniorCitizen'];
const PRIORITY_CATEGORICAL_COLUMNS = [
  'Churn',
  'Contract',
  'InternetService',
  'PaymentMethod',
  'TechSupport',
  'OnlineSecurity',
  'Partner',
  'Dependents',
  'gender',
];
const TARGET_COLUMNS = ['Churn', 'Churn_Label'];

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNumber(value) {
  const cleaned = cleanValue(value).replace(/,/g, '');
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function formatLabel(value) {
  const text = cleanValue(value);
  return text || 'Blank';
}

function isPositiveTargetValue(value) {
  const normalized = cleanValue(value).toLowerCase();
  return ['yes', '1', 'true', 'churn', 'positive'].includes(normalized);
}

function uniqueColumns(records) {
  const seen = new Set();
  records.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key) seen.add(key);
    });
  });
  return Array.from(seen);
}

function orderColumns(columns, priorities) {
  const prioritySet = new Set(priorities);
  const prioritized = priorities.filter((column) => columns.includes(column));
  const remaining = columns.filter((column) => !prioritySet.has(column));
  return [...prioritized, ...remaining];
}

function detectTargetColumn(columns) {
  return TARGET_COLUMNS.find((column) => columns.includes(column)) || null;
}

function detectNumericColumns(records, columns) {
  return columns.filter((column) => {
    const values = records.map((row) => toNumber(row[column])).filter((value) => value !== null);
    if (values.length < Math.max(3, Math.floor(records.length * 0.5))) return false;
    return true;
  });
}

function summarizeNumeric(records, numericColumns) {
  const ordered = orderColumns(numericColumns, PRIORITY_NUMERIC_COLUMNS);
  return ordered.slice(0, 8).map((column) => {
    const values = records.map((row) => toNumber(row[column])).filter((value) => value !== null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      column,
      count: values.length,
      min: round(min),
      max: round(max),
      mean: round(mean),
    };
  });
}

function summarizeCategorical(records, categoricalColumns, targetColumn, rowCount) {
  const ordered = orderColumns(categoricalColumns, PRIORITY_CATEGORICAL_COLUMNS);

  return ordered.slice(0, 8).map((column) => {
    const counts = new Map();
    const positiveCounts = new Map();

    records.forEach((row) => {
      const value = formatLabel(row[column]);
      counts.set(value, (counts.get(value) || 0) + 1);

      if (targetColumn && isPositiveTargetValue(row[targetColumn])) {
        positiveCounts.set(value, (positiveCounts.get(value) || 0) + 1);
      }
    });

    const topValues = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([value, count]) => {
        const item = {
          value,
          count,
          share: round((count / rowCount) * 100, 1),
        };

        if (targetColumn) {
          const positiveCount = positiveCounts.get(value) || 0;
          item.positiveCount = positiveCount;
          item.positiveRate = round((positiveCount / count) * 100, 1);
        }

        return item;
      });

    return {
      column,
      distinctCount: counts.size,
      topValues,
    };
  });
}

function summarizeTarget(records, targetColumn) {
  if (!targetColumn) return null;

  const positiveCount = records.filter((row) => isPositiveTargetValue(row[targetColumn])).length;
  const negativeCount = Math.max(records.length - positiveCount, 0);

  return {
    column: targetColumn,
    positiveLabel: targetColumn === 'Churn_Label' ? 'Positive / churn' : 'Yes / churn',
    positiveCount,
    negativeCount,
    positiveRate: round((positiveCount / records.length) * 100, 1),
  };
}

function pickSampleRows(records, columns) {
  const sampleColumns = orderColumns(columns, [
    'customerID',
    'gender',
    'SeniorCitizen',
    'tenure',
    'InternetService',
    'Contract',
    'MonthlyCharges',
    'TotalCharges',
    'Churn',
  ]).slice(0, 8);

  return records.slice(0, 3).map((row) => {
    const sample = {};
    sampleColumns.forEach((column) => {
      sample[column] = row[column] ?? '';
    });
    return sample;
  });
}

function buildInsights(summary) {
  const insights = [];
  const target = summary.target;

  if (target) {
    insights.push(
      `Overall churn rate is ${target.positiveRate}% (${target.positiveCount.toLocaleString()} of ${summary.rowCount.toLocaleString()} records).`
    );
  }

  const riskCandidates = summary.categorical
    .flatMap((item) =>
      item.topValues
        .filter((value) => typeof value.positiveRate === 'number' && value.count >= Math.max(10, Math.floor(summary.rowCount * 0.02)))
        .map((value) => ({
          column: item.column,
          value: value.value,
          positiveRate: value.positiveRate,
          count: value.count,
        }))
    )
    .sort((a, b) => b.positiveRate - a.positiveRate);

  if (riskCandidates.length > 0) {
    const topRisk = riskCandidates[0];
    insights.push(
      `The highest visible churn-risk segment is ${topRisk.column} = ${topRisk.value} with a ${topRisk.positiveRate}% churn rate across ${topRisk.count.toLocaleString()} records.`
    );
  }

  const stableCandidates = summary.categorical
    .flatMap((item) =>
      item.topValues
        .filter((value) => typeof value.positiveRate === 'number' && value.count >= Math.max(10, Math.floor(summary.rowCount * 0.02)))
        .map((value) => ({
          column: item.column,
          value: value.value,
          positiveRate: value.positiveRate,
          count: value.count,
        }))
    )
    .sort((a, b) => a.positiveRate - b.positiveRate);

  if (stableCandidates.length > 0) {
    const anchor = stableCandidates[0];
    insights.push(
      `The most stable visible segment is ${anchor.column} = ${anchor.value} with a ${anchor.positiveRate}% churn rate across ${anchor.count.toLocaleString()} records.`
    );
  }

  const tenureSummary = summary.numeric.find((item) => item.column === 'tenure');
  const chargeSummary = summary.numeric.find((item) => item.column === 'MonthlyCharges');

  if (tenureSummary || chargeSummary) {
    const pieces = [];
    if (tenureSummary) pieces.push(`average tenure is ${tenureSummary.mean} months`);
    if (chargeSummary) pieces.push(`average monthly charges are ${chargeSummary.mean}`);
    insights.push(`Data profile shows ${pieces.join(' and ')}.`);
  }

  return insights.slice(0, 4);
}

export function parseCsvText(csvText = '') {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  return (parsed.data || []).filter((row) =>
    Object.values(row || {}).some((value) => cleanValue(value) !== '')
  );
}

export function summarizeRecords(records = [], options = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const columns = uniqueColumns(records);
  const targetColumn = detectTargetColumn(columns);
  const numericColumns = detectNumericColumns(records, columns);
  const categoricalColumns = columns.filter((column) => !numericColumns.includes(column) && column !== targetColumn);

  const summary = {
    datasetName: options.datasetName || 'Active dataset',
    rowCount: records.length,
    columnCount: columns.length,
    columns,
    target: summarizeTarget(records, targetColumn),
    numeric: summarizeNumeric(records, numericColumns),
    categorical: summarizeCategorical(records, categoricalColumns, targetColumn, records.length),
    sampleRows: pickSampleRows(records, columns),
  };

  summary.insights = buildInsights(summary);
  return summary;
}

export function summarizeCsvText(csvText = '', options = {}) {
  return summarizeRecords(parseCsvText(csvText), options);
}

export function formatDataProfileForPrompt(summary) {
  if (!summary) {
    return '- No active dataset summary is available.';
  }

  const lines = [
    `- Dataset name: ${summary.datasetName}`,
    `- Row count: ${summary.rowCount}`,
    `- Column count: ${summary.columnCount}`,
    `- Columns: ${summary.columns.join(', ')}`,
  ];

  if (summary.target) {
    lines.push(
      `- Target summary (${summary.target.column}): ${summary.target.positiveCount} positive / churn (${summary.target.positiveRate}%), ${summary.target.negativeCount} non-churn`
    );
  }

  if (summary.numeric?.length) {
    summary.numeric.slice(0, 6).forEach((item) => {
      lines.push(
        `- Numeric column ${item.column}: mean ${item.mean}, min ${item.min}, max ${item.max}, populated rows ${item.count}`
      );
    });
  }

  if (summary.categorical?.length) {
    summary.categorical.slice(0, 6).forEach((item) => {
      const values = item.topValues
        .map((value) =>
          typeof value.positiveRate === 'number'
            ? `${value.value} (${value.count}, ${value.share}%, churn ${value.positiveRate}%)`
            : `${value.value} (${value.count}, ${value.share}%)`
        )
        .join('; ');

      lines.push(`- Categorical column ${item.column}: ${values}`);
    });
  }

  if (summary.insights?.length) {
    summary.insights.forEach((item) => lines.push(`- Insight: ${item}`));
  }

  if (summary.sampleRows?.length) {
    summary.sampleRows.forEach((row, index) => {
      lines.push(`- Sample row ${index + 1}: ${Object.entries(row).map(([key, value]) => `${key}=${value}`).join(', ')}`);
    });
  }

  return lines.join('\n');
}
