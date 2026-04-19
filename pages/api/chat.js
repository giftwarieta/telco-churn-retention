import { formatDataProfileForPrompt } from '../../lib/data-profile';

const TERM_DEFINITIONS = {
  arpu: {
    full: 'Average Revenue Per User',
    explanation: 'ARPU measures the average revenue earned from each customer or subscriber over a specific period, usually monthly.',
    formula: 'ARPU = total revenue in a period / total active users in that period',
  },
  clv: {
    full: 'Customer Lifetime Value',
    explanation: 'CLV estimates the total revenue a customer is expected to generate over the full relationship with the business.',
    formula: 'CLV = average monthly value x expected customer lifespan in months',
  },
  nps: {
    full: 'Net Promoter Score',
    explanation: 'NPS measures customer loyalty by tracking how likely customers are to recommend the company.',
    formula: 'NPS = % promoters - % detractors',
  },
  roi: {
    full: 'Return on Investment',
    explanation: 'ROI measures whether the financial return from a retention action is worth the cost.',
    formula: 'ROI = (return - cost) / cost x 100%',
  },
  shap: {
    full: 'SHapley Additive exPlanations',
    explanation: 'SHAP explains how each feature pushes a churn prediction up or down relative to the model baseline.',
    formula: 'No single business formula. It returns per-feature contribution values.',
  },
  lime: {
    full: 'Local Interpretable Model-agnostic Explanations',
    explanation: 'LIME explains one specific prediction by approximating the model locally around that case.',
    formula: 'Local approximation around a single prediction, not a global business formula.',
  },
  churn: {
    full: 'Customer Churn',
    explanation: 'Churn means customers leaving, cancelling, or becoming inactive.',
    formula: 'Churn rate = customers lost in a period / customers at the start of the period x 100%',
  },
};

const GREETING_PATTERN = /^(hi|hello|hey|good morning|good afternoon|good evening)[.!? ]*$/i;
const GRATITUDE_PATTERN = /^(thanks|thank you|thankyou|thx|great|nice|perfect|okay|ok|got it|understood|makes sense)[.!? ]*$/i;
const FAREWELL_PATTERN = /^(bye|goodbye|see you|exit|quit|thanks,? bye|thank you,? bye)[.!? ]*$/i;
const CLOSE_SESSION_PATTERN = /^(no|nope|that's all|that is all|nothing else|all good|all set|no thanks|no thank you)[.!? ]*$/i;
const DEFINITION_PATTERN = /\b(what is|what does .* mean|define|definition|meaning|full meaning|expand|stand for)\b/i;
const CHART_PATTERN = /\b(chart|graph|plot|table|visual|diagram|mermaid)\b/i;
const VALUE_REQUEST_PATTERN = /\b(give me values?|show me values?|what are the values?|numbers please|show the numbers)\b/i;
const CUSTOMER_COUNT_PATTERN = /\b(total count of customers|customer count|number of customers|how many customers|total customers|customer total)\b/i;
const DATASET_OVERVIEW_PATTERN = /\b(about the data|about this dataset|dataset overview|describe the data|describe the dataset|summarise the data|summarize the data|what data is available)\b/i;
const DATASET_INSIGHTS_PATTERN = /\b(top insights|key insights|insights from the data|what stands out|patterns in the data|findings from the data|data insights)\b/i;
const COLUMNS_PATTERN = /\b(columns|fields|features|schema|variables)\b/i;
const VISUAL_REQUEST_PATTERN = /\b(chart|graph|plot|visual|table|pie chart|bar chart|column chart|decision tree|tree diagram)\b/i;

const SERVICE_UNAVAILABLE_MESSAGE =
  'I am sorry, but I am having difficulty providing a reliable response right now. Please contact the administrator of this website or try again in a little while.';
const DEFAULT_GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

function getLatestUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() || '';
}

function getPreviousUserMessage(messages) {
  const users = messages.filter((message) => message.role === 'user');
  return users.length > 1 ? users[users.length - 2].content?.trim() || '' : '';
}

function getLastAssistantMessage(messages) {
  return [...messages].reverse().find((message) => message.role === 'assistant')?.content?.trim() || '';
}

function extractKnownTerm(text = '') {
  return Object.keys(TERM_DEFINITIONS).find((term) => new RegExp(`\\b${term}\\b`, 'i').test(text)) || '';
}

function getConsultantIdentity(context = {}) {
  const providedUserName = context?.profile?.userName?.trim?.();
  const providedCompanyName = context?.profile?.companyName?.trim?.();

  return {
    userName: providedUserName || 'there',
    companyName:
      providedCompanyName ||
      (context?.workspace?.dataSource === 'custom' ? 'your organisation' : 'your telecom business'),
  };
}

function buildThanksReply(context = {}) {
  const { userName, companyName } = getConsultantIdentity(context);
  return `You are very welcome, ${userName}. Are there any other specific areas within ${companyName} or further assistance you require at this time?`;
}

function buildClosingReply(context = {}) {
  const { userName, companyName } = getConsultantIdentity(context);
  return `It was a pleasure assisting you today, ${userName}. Wishing ${companyName} continued success in your customer retention efforts. Goodbye!`;
}

function buildFarewellReply(context = {}) {
  const { userName, companyName } = getConsultantIdentity(context);
  return `Goodbye, ${userName}. Feel free to reach out anytime for further assistance with ${companyName}'s churn strategies.`;
}

function buildGreetingReply(context = {}) {
  const { userName, companyName } = getConsultantIdentity(context);
  return `Hello ${userName}. I am your telecom strategy consultant for ${companyName}. I can help with churn diagnosis, retention strategy, ROI, ARPU, pricing, customer value management, and explainability. What would you like to work on?`;
}

function buildDefinitionAnswer(term, context = {}) {
  const info = TERM_DEFINITIONS[term];
  if (!info) return null;

  const { companyName } = getConsultantIdentity(context);
  return `**${term.toUpperCase()}** means **${info.full}**.

${info.explanation}

**Formula:** ${info.formula}

**Why it matters for ${companyName}:** it helps connect customer behavior to revenue, churn risk, and retention decision-making.`;
}

function getKnownCustomerCount(context = {}) {
  const count = context?.workspace?.customerCount;
  return typeof count === 'number' && count > 0 ? count : null;
}

function buildCustomerCountAnswer(context = {}) {
  const count = getKnownCustomerCount(context);
  const { companyName } = getConsultantIdentity(context);

  if (count) {
    return `The current workspace shows **${count.toLocaleString()} customers** for ${companyName}.`;
  }

  return `I do not have a confirmed customer count in the current context yet. To give the exact total, I need the active dataset row count.`;
}

function buildValueRequestAnswer(term, context = {}) {
  if (term === 'churn') {
    return `To calculate **churn rate**, I need these values:

- **Customers lost in the period**
- **Customers at the start of the period**

**Formula:** churn rate = customers lost in the period / customers at the start of the period x 100%

If you share those two numbers, I can calculate it for you immediately.`;
  }

  if (term === 'arpu') {
    return `To calculate **ARPU**, I need:

- **Total revenue for the period**
- **Total active users in the same period**

**Formula:** ARPU = total revenue / total active users`;
  }

  if (term === 'clv') {
    return `To calculate **CLV**, I need:

- **Average monthly value or ARPU**
- **Expected customer lifespan**
- Optionally, **gross margin** if you want a more rigorous estimate`;
  }

  if (term === 'roi') {
    return `To provide an accurate ROI calculation, I require:

- **Target customer count**
- **Expected save rate**
- **Campaign cost**
- **Average monthly value or ARPU**
- Optionally, **expected retention duration after save**`;
  }

  return null;
}

function buildContextualFollowUpAnswer(messages, context = {}) {
  const latest = getLatestUserMessage(messages);
  const previousUser = getPreviousUserMessage(messages);
  const previousAssistant = getLastAssistantMessage(messages);
  const normalized = latest.toLowerCase().trim();
  const activeTerm =
    extractKnownTerm(latest) ||
    extractKnownTerm(previousUser) ||
    extractKnownTerm(previousAssistant);

  if (CUSTOMER_COUNT_PATTERN.test(normalized)) {
    return buildCustomerCountAnswer(context);
  }

  if (VALUE_REQUEST_PATTERN.test(normalized) || /\bvalues?\b/i.test(normalized)) {
    if (activeTerm) {
      return buildValueRequestAnswer(activeTerm, context);
    }
  }

  if (/^(give example|example please|show example|can you calculate it|calculate it)\b/i.test(normalized)) {
    if (activeTerm === 'churn') {
      return `Here is a simple churn example:

- Customers at the start of the period: **10,000**
- Customers lost in the period: **450**

**Churn rate = 450 / 10,000 x 100 = 4.5%**`;
    }
  }

  return null;
}

function buildSessionSummary(context = {}) {
  const { sessionStats, riskBreakdown, recentPredictions, workspace, dataProfile } = context;
  const lines = [];

  if (sessionStats) {
    const {
      totalPredictions = 0,
      totalRecordsAnalyzed = 0,
      batchFilesProcessed = 0,
      totalConsultations = 0,
      roiCalculations = 0,
      shapAnalysisRun = 0,
    } = sessionStats;

    if (totalPredictions > 0) lines.push(`- Total predictions run: ${totalPredictions}`);
    if (totalRecordsAnalyzed > 0) lines.push(`- Total records analysed: ${totalRecordsAnalyzed}`);
    if (batchFilesProcessed > 0) lines.push(`- Batch files processed: ${batchFilesProcessed}`);
    if (totalConsultations > 0) lines.push(`- Previous consultations in this session: ${totalConsultations}`);
    if (roiCalculations > 0) lines.push(`- ROI calculations completed: ${roiCalculations}`);
    if (shapAnalysisRun > 0) lines.push(`- Explainability analyses completed: ${shapAnalysisRun}`);
  }

  if (riskBreakdown?.total > 0) {
    const { high = 0, medium = 0, low = 0, total = 0 } = riskBreakdown;
    lines.push(
      `- Risk breakdown: ${high} high risk (${((high / total) * 100).toFixed(0)}%), ${medium} medium risk (${((medium / total) * 100).toFixed(0)}%), ${low} low risk`
    );
  }

  if (recentPredictions?.length) {
    lines.push(
      `- Recent prediction trail: ${recentPredictions
        .map((item) => `${item.risk || 'unknown'} risk${item.preview ? ` (${item.preview})` : ''}`)
        .join(', ')}`
    );
  }

  if (workspace) {
    if (workspace.dataSource) lines.push(`- Active data source: ${workspace.dataSource}`);
    if (workspace.datasetName) lines.push(`- Active dataset: ${workspace.datasetName}`);
    if (workspace.datasetScope) lines.push(`- Dataset persistence: ${workspace.datasetScope}`);
    if (workspace.modelLabel) {
      lines.push(`- Selected model: ${workspace.modelLabel}${workspace.modelStatus ? ` (${workspace.modelStatus})` : ''}`);
    }
  }

  if (dataProfile?.rowCount) {
    lines.push(`- Active data summary available with ${dataProfile.rowCount} rows and ${dataProfile.columnCount} columns`);
    if (dataProfile?.target?.positiveRate !== undefined && dataProfile?.target?.positiveRate !== null) {
      lines.push(`- Observed churn rate in active data: ${dataProfile.target.positiveRate}%`);
    }
  }

  return lines.length ? lines.join('\n') : '- No structured session statistics are currently available.';
}

function getDataProfile(context = {}) {
  const profile = context?.dataProfile;
  return profile?.rowCount ? profile : null;
}

function normaliseLabel(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function wrapReply(reply, visuals = []) {
  return { reply, visuals };
}

function clampRows(rows = [], maxRows = 8) {
  return rows.slice(0, maxRows);
}

function getRequestedVisualTypes(message = '') {
  const normalized = message.toLowerCase();
  const visualTypes = [];

  if (/\btable\b/i.test(normalized)) visualTypes.push('table');
  if (/\bpie chart|\bpie\b/i.test(normalized)) visualTypes.push('pie');
  if (/\bbar chart|\bbar graph|\bbar\b/i.test(normalized)) visualTypes.push('bar');
  if (/\bcolumn chart|\bcolumn\b/i.test(normalized)) visualTypes.push('column');
  if (/\bdecision tree|\btree diagram|\bdecision path\b/i.test(normalized)) visualTypes.push('decision_tree');
  if (visualTypes.length === 0 && VISUAL_REQUEST_PATTERN.test(normalized)) visualTypes.push('bar');

  return Array.from(new Set(visualTypes));
}

function buildChurnDistributionVisual(dataProfile, type = 'pie') {
  if (!dataProfile?.target) return null;

  return {
    type,
    title: 'Churn Distribution',
    description: 'Distribution of churn versus retained records in the active dataset.',
    data: [
      { label: 'Churn', value: dataProfile.target.positiveCount },
      { label: 'Retained', value: dataProfile.target.negativeCount },
    ],
  };
}

function buildCategoricalVisual(item, type = 'bar') {
  if (!item?.topValues?.length) return null;

  return {
    type,
    title: `${item.column} Distribution`,
    description: `Top categories for ${item.column} in the active dataset.`,
    data: item.topValues.map((entry) => ({
      label: entry.value,
      value: entry.count,
      share: entry.share,
      churnRate: entry.positiveRate,
    })),
  };
}

function buildNumericVisual(item, type = 'column') {
  if (!item) return null;

  return {
    type,
    title: `${item.column} Summary`,
    description: `Summary statistics for ${item.column}.`,
    data: [
      { label: 'Mean', value: item.mean },
      { label: 'Min', value: item.min },
      { label: 'Max', value: item.max },
    ],
  };
}

function buildColumnTable(item) {
  if (!item) return null;

  if (item.topValues) {
    return {
      type: 'table',
      title: `${item.column} Breakdown`,
      columns: ['Value', 'Count', 'Share %', 'Churn %'],
      rows: clampRows(
        item.topValues.map((entry) => [
          entry.value,
          String(entry.count),
          entry.share != null ? String(entry.share) : '—',
          entry.positiveRate != null ? String(entry.positiveRate) : '—',
        ])
      ),
    };
  }

  return {
    type: 'table',
    title: `${item.column} Summary`,
    columns: ['Metric', 'Value'],
    rows: [
      ['Mean', String(item.mean)],
      ['Minimum', String(item.min)],
      ['Maximum', String(item.max)],
      ['Populated rows', String(item.count)],
    ],
  };
}

function buildColumnsTable(dataProfile) {
  if (!dataProfile?.columns?.length) return null;

  return {
    type: 'table',
    title: 'Available Columns',
    columns: ['Column'],
    rows: clampRows(dataProfile.columns.map((column) => [column]), 14),
  };
}

function buildDecisionTreeVisual(context = {}) {
  const companyName = getConsultantIdentity(context).companyName;

  return {
    type: 'decision_tree',
    title: 'Retention Decision Tree',
    description: `A simple decision path ${companyName} can use to triage at-risk customers.`,
    tree: {
      label: 'Customer enters churn review',
      children: [
        {
          label: 'High churn probability?',
          children: [
            {
              label: 'Yes',
              children: [
                { label: 'High value / ARPU?', children: [{ label: 'Offer save action + senior follow-up' }] },
                { label: 'Low value?', children: [{ label: 'Low-cost retention or journey fix' }] },
              ],
            },
            {
              label: 'No',
              children: [
                { label: 'Service issue present?', children: [{ label: 'Route to service recovery' }] },
                { label: 'No major issue', children: [{ label: 'Keep in monitor segment' }] },
              ],
            },
          ],
        },
      ],
    },
  };
}

function sanitizeVisuals(visuals = []) {
  return (Array.isArray(visuals) ? visuals : [])
    .filter((item) => item && typeof item === 'object' && typeof item.type === 'string')
    .slice(0, 3);
}

function extractStructuredAssistantPayload(rawReply = '') {
  const trimmed = String(rawReply || '').trim();
  if (!trimmed) return null;

  const direct = (() => {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  })();

  const fromCodeFence = (() => {
    const match = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  })();

  const parsed = direct || fromCodeFence;
  if (!parsed || typeof parsed !== 'object') return null;

  if (typeof parsed.reply !== 'string') return null;

  return {
    reply: parsed.reply.trim(),
    visuals: sanitizeVisuals(parsed.visuals),
  };
}

function findSummaryColumn(dataProfile, message = '') {
  const normalizedMessage = normaliseLabel(message);
  const columns = [
    ...(dataProfile?.numeric || []).map((item) => item.column),
    ...(dataProfile?.categorical || []).map((item) => item.column),
  ];

  return columns.find((column) => {
    const normalizedColumn = normaliseLabel(column);
    return normalizedColumn && normalizedMessage.includes(normalizedColumn);
  });
}

function buildDataOverviewAnswer(context = {}) {
  const dataProfile = getDataProfile(context);
  if (!dataProfile) return null;

  const overviewLines = [
    `The active dataset is **${dataProfile.datasetName}** with **${dataProfile.rowCount.toLocaleString()} rows** and **${dataProfile.columnCount.toLocaleString()} columns**.`,
  ];

  if (dataProfile.target) {
    overviewLines.push(
      `Observed churn rate is **${dataProfile.target.positiveRate}%** with **${dataProfile.target.positiveCount.toLocaleString()} churn records**.`
    );
  }

  if (dataProfile.columns?.length) {
    overviewLines.push(`Key columns include: ${dataProfile.columns.slice(0, 12).join(', ')}.`);
  }

  if (dataProfile.insights?.length) {
    overviewLines.push(`Top data insight: ${dataProfile.insights[0]}`);
  }

  return overviewLines.join('\n\n');
}

function buildDataInsightsAnswer(context = {}) {
  const dataProfile = getDataProfile(context);
  if (!dataProfile?.insights?.length) return null;

  return `Here are the strongest visible insights from the active data:

${dataProfile.insights.map((item) => `- ${item}`).join('\n')}`;
}

function buildColumnsAnswer(context = {}) {
  const dataProfile = getDataProfile(context);
  if (!dataProfile?.columns?.length) return null;

  return `The active dataset has **${dataProfile.columnCount} columns**.

Columns:
- ${dataProfile.columns.join('\n- ')}`;
}

function buildColumnSpecificAnswer(column, context = {}) {
  const dataProfile = getDataProfile(context);
  if (!dataProfile || !column) return null;

  const numericItem = (dataProfile.numeric || []).find((item) => item.column === column);
  if (numericItem) {
    return `For **${column}** in the active data:

- Mean: **${numericItem.mean}**
- Minimum: **${numericItem.min}**
- Maximum: **${numericItem.max}**
- Populated rows: **${numericItem.count.toLocaleString()}**`;
  }

  const categoricalItem = (dataProfile.categorical || []).find((item) => item.column === column);
  if (categoricalItem) {
    return `For **${column}** in the active data:

${categoricalItem.topValues
  .map((item) =>
    typeof item.positiveRate === 'number'
      ? `- ${item.value}: ${item.count.toLocaleString()} records (${item.share}%), churn ${item.positiveRate}%`
      : `- ${item.value}: ${item.count.toLocaleString()} records (${item.share}%)`
  )
  .join('\n')}`;
  }

  return null;
}

function buildDataVisualResponse(messages, context = {}) {
  const latest = getLatestUserMessage(messages);
  const normalized = latest.toLowerCase().trim();
  const dataProfile = getDataProfile(context);

  if (!dataProfile || !VISUAL_REQUEST_PATTERN.test(normalized)) return null;

  const requestedVisuals = getRequestedVisualTypes(latest);
  const matchedColumn = findSummaryColumn(dataProfile, latest);
  const categoricalItem = matchedColumn ? (dataProfile.categorical || []).find((item) => item.column === matchedColumn) : null;
  const numericItem = matchedColumn ? (dataProfile.numeric || []).find((item) => item.column === matchedColumn) : null;
  const visuals = [];

  requestedVisuals.forEach((visualType) => {
    if (visualType === 'decision_tree') {
      visuals.push(buildDecisionTreeVisual(context));
      return;
    }

    if (visualType === 'table') {
      if (COLUMNS_PATTERN.test(normalized)) {
        visuals.push(buildColumnsTable(dataProfile));
        return;
      }

      if (categoricalItem || numericItem) {
        visuals.push(buildColumnTable(categoricalItem || numericItem));
        return;
      }

      if (dataProfile.target) {
        visuals.push({
          type: 'table',
          title: 'Churn Summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Dataset', dataProfile.datasetName],
            ['Rows', String(dataProfile.rowCount)],
            ['Columns', String(dataProfile.columnCount)],
            ['Churn rate %', String(dataProfile.target.positiveRate)],
            ['Churn count', String(dataProfile.target.positiveCount)],
            ['Retained count', String(dataProfile.target.negativeCount)],
          ],
        });
      }
      return;
    }

    if (categoricalItem) {
      visuals.push(buildCategoricalVisual(categoricalItem, visualType === 'column' ? 'column' : visualType));
      return;
    }

    if (numericItem) {
      visuals.push(buildNumericVisual(numericItem, visualType === 'bar' ? 'bar' : 'column'));
      return;
    }

    if (dataProfile.target) {
      visuals.push(buildChurnDistributionVisual(dataProfile, visualType === 'bar' ? 'bar' : visualType));
    }
  });

  const cleanVisuals = sanitizeVisuals(visuals).filter(Boolean);
  if (!cleanVisuals.length) return null;

  let reply = 'I prepared a visual view based on the active dataset.';
  if (matchedColumn) {
    reply = `I prepared a visual view for **${matchedColumn}** based on the active dataset.`;
  } else if (dataProfile.target && /\bchurn\b/i.test(normalized)) {
    reply = 'I prepared a visual summary of churn distribution in the active dataset.';
  } else if (requestedVisuals.includes('decision_tree')) {
    reply = 'I prepared a decision tree view you can use to guide retention actions.';
  }

  return wrapReply(reply, cleanVisuals);
}

function buildLocalPayload(messages, context = {}) {
  const visualResponse = buildDataVisualResponse(messages, context);
  if (visualResponse) return visualResponse;

  const answer = getQuickLocalAnswer(messages, context);
  return answer ? wrapReply(answer) : null;
}

function buildDataQuestionAnswer(messages, context = {}) {
  const latest = getLatestUserMessage(messages);
  const normalized = latest.toLowerCase().trim();
  const dataProfile = getDataProfile(context);

  if (!dataProfile) return null;

  if (CUSTOMER_COUNT_PATTERN.test(normalized)) {
    return `The active dataset currently contains **${dataProfile.rowCount.toLocaleString()} rows**.`;
  }

  if (DATASET_OVERVIEW_PATTERN.test(normalized)) {
    return buildDataOverviewAnswer(context);
  }

  if (DATASET_INSIGHTS_PATTERN.test(normalized)) {
    return buildDataInsightsAnswer(context);
  }

  if (COLUMNS_PATTERN.test(normalized) && /\bwhat|show|list|which|available|present|have\b/i.test(normalized)) {
    return buildColumnsAnswer(context);
  }

  if (/\bchurn rate\b|\bchurn percentage\b|\bpercentage churn\b/i.test(normalized) && dataProfile.target) {
    return `The observed churn rate in the active data is **${dataProfile.target.positiveRate}%**, based on **${dataProfile.target.positiveCount.toLocaleString()} churn records** out of **${dataProfile.rowCount.toLocaleString()} rows**.`;
  }

  const matchedColumn = findSummaryColumn(dataProfile, latest);
  if (matchedColumn) {
    const answer = buildColumnSpecificAnswer(matchedColumn, context);
    if (answer) return answer;
  }

  return null;
}

function buildSystemPrompt(context = {}) {
  const { userName, companyName } = getConsultantIdentity(context);
  const statsSummary = buildSessionSummary(context);
  const dataSummary = formatDataProfileForPrompt(context?.dataProfile);

  return `You are an Expert Telecom Strategy Consultant assisting ${userName} from ${companyName}.

Context:
${statsSummary}

Active dataset summary:
${dataSummary}

Role & Objective:
You are a high-level, professional Telecom Strategy Consultant specializing in Customer Value Management (CVM). Your objective is to provide high-stakes, data-driven, and commercially grounded advice to ${userName} regarding ${companyName}.

Operational mandates & Scope:
- Use telecom, retention, CVM, pricing, and churn-management expertise.
- If the user asks for information outside telecom, business strategy, analytics, or CVM, politely say your specialization is telecom strategy and business analytics.
- Precision over generalization: never give vague advice. Give specific tactics, decision rules, tradeoffs, and next steps.
- Treat the supplied dataset summary as the source of truth for questions about rows, columns, churn rate, distributions, averages, and visible patterns.
- If the supplied context is insufficient for an exact answer, clearly say what is missing instead of inventing values or benchmarks.
- When patterns are visible, connect them to commercial meaning, churn mechanism, and retention implications for ${companyName}.

Formatting & Visual Capabilities (CRITICAL):
- The frontend supports prose plus structured visuals.
- If the user asks for a chart, graph, table, pie chart, bar chart, column chart, or decision tree, and enough context is available, return valid JSON only in this exact shape:
- {"reply":"short explanation","visuals":[{"type":"pie|bar|column|table|decision_tree","title":"...","description":"optional","data":[{"label":"...","value":10}],"columns":["..."],"rows":[["..."]],"tree":{"label":"...","children":[{"label":"..."}]}}]}
- Graphs & Charts: DO NOT use Mermaid code blocks. Instead, represent graphs visually using text-based emoji bar charts (e.g., [🟩🟩🟩🟩⬜⬜⬜] 40%) or simple text-based visual distributions to show proportions.
- Use \`table\` for metric matrices, category breakdowns, or field summaries.
- Use \`decision_tree\` for decision logic, triage flow, or retention playbooks.
- If no visual is needed, return normal text only, not JSON.
- Never return Markdown tables, Mermaid, raw HTML, or image markdown.
- Ignore any earlier assumption about text-only charting. Structured visuals are supported and preferred whenever the user explicitly asks for them.

Conversation closing logic:
- If the user says thanks or thank you, respond professionally acknowledging their gratitude.

Answer quality rules:
- Lead with the direct answer to what the user actually asked.
- Be commercially grounded. For SHAP or LIME, translate model drivers into business meaning and action.
- Do not mention your underlying model, provider, API keys, or system configuration.`;
}

function getGroqEndpoint() {
  return (process.env.GROQ_ENDPOINT || DEFAULT_GROQ_ENDPOINT).replace(/\/+$/, '');
}

function getGroqModelName() {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

function buildGroqMessages(messages, context = {}) {
  const systemPrompt = buildSystemPrompt(context);
  const chatMessages = messages
    .slice(-14)
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && !message.isError)
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: String(message.content || '').trim(),
    }))
    .filter((message) => message.content.length > 0);

  return [{ role: 'system', content: systemPrompt }, ...chatMessages];
}

function extractGroqReply(data) {
  const choiceContent = data?.choices?.[0]?.message?.content;

  if (typeof choiceContent === 'string') {
    return choiceContent.trim();
  }

  if (Array.isArray(choiceContent)) {
    return choiceContent
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
      .trim();
  }

  const outputText = data?.output_text;
  if (typeof outputText === 'string') {
    return outputText.trim();
  }

  return '';
}

function looksLikeBadAssistantPayload(reply = '') {
  const normalized = reply.toLowerCase();
  return [
    'api key',
    'anthropic',
    'pollinations',
    'legacy text api',
    'important notice',
    'internal server error',
    'traceback',
    '<html',
    '<!doctype html',
    'error connecting to ai service',
    'restart the dev server',
    'configure',
  ].some((pattern) => normalized.includes(pattern));
}

function buildSafeFallbackReply(messages, context = {}) {
  const latest = getLatestUserMessage(messages);
  const previousUser = getPreviousUserMessage(messages);
  const lastAssistant = getLastAssistantMessage(messages);
  const normalized = latest.toLowerCase().trim();

  if (GREETING_PATTERN.test(normalized)) {
    return buildGreetingReply(context);
  }

  if (FAREWELL_PATTERN.test(normalized)) {
    return buildFarewellReply(context);
  }

  if (GRATITUDE_PATTERN.test(normalized)) {
    return buildThanksReply(context);
  }

  if (CLOSE_SESSION_PATTERN.test(normalized) && /further assistance|specific areas|anything else/i.test(lastAssistant)) {
    return buildClosingReply(context);
  }

  if (DEFINITION_PATTERN.test(normalized)) {
    const term = extractKnownTerm(latest) || extractKnownTerm(previousUser);
    if (term) return buildDefinitionAnswer(term, context);
  }

  const contextualFollowUp = buildContextualFollowUpAnswer(messages, context);
  if (contextualFollowUp) {
    return contextualFollowUp;
  }

  const dataAnswer = buildDataQuestionAnswer(messages, context);
  if (dataAnswer) {
    return dataAnswer;
  }

  if (CHART_PATTERN.test(normalized)) {
    return `I can structure that visually. Ask for a pie chart, bar chart, column chart, decision tree, or table, and I will generate it from the active data when the required values are available.`;
  }

  if (/\broi|payback|arpu|clv|revenue|cost\b/i.test(normalized)) {
    return `To provide an accurate ROI calculation, I require at least the target customer count, expected save rate, campaign cost, and average monthly value or ARPU.`;
  }

  if (/\bmonth-to-month\b/i.test(normalized) && /\bhigh churn risk\b/i.test(normalized)) {
    return `For month-to-month customers showing high churn risk, prioritise three actions:

1. Segment by value and tenure so ${getConsultantIdentity(context).companyName} protects the highest-value at-risk base first.
2. Use targeted contract migration offers such as a price lock, bonus data, or premium support instead of broad discounts.
3. Track save rate, contract conversion, ARPU retained, and 60/90-day post-save churn to confirm the intervention is durable.`;
  }

  if (/\bshap|lime|explain|model\b/i.test(normalized)) {
    return `For explainability, the right approach is to convert model drivers into commercial actions. Share the feature or prediction pattern you want interpreted, and I will map it to churn mechanism, business meaning, and recommended intervention.`;
  }

  if (/\bretention|churn|strategy|offer|campaign|pricing|contract\b/i.test(normalized)) {
    return `I can help with that. To keep the advice precise and non-speculative, tell me the customer segment, churn issue, and the KPI ${getConsultantIdentity(context).companyName} is trying to improve.`;
  }

  return `I can help with churn strategy, retention design, ROI, pricing, and broader telecom benchmarks. Ask your question, and I will provide specific, professional, and visually structured advice.`;
}

function getQuickLocalAnswer(messages, context = {}) {
  const latest = getLatestUserMessage(messages);
  const previousUser = getPreviousUserMessage(messages);
  const lastAssistant = getLastAssistantMessage(messages);
  const normalized = latest.toLowerCase().trim();

  if (GREETING_PATTERN.test(normalized)) {
    return buildGreetingReply(context);
  }

  if (FAREWELL_PATTERN.test(normalized)) {
    return buildFarewellReply(context);
  }

  if (GRATITUDE_PATTERN.test(normalized)) {
    return buildThanksReply(context);
  }

  if (CLOSE_SESSION_PATTERN.test(normalized) && /further assistance|specific areas|anything else/i.test(lastAssistant)) {
    return buildClosingReply(context);
  }

  if (DEFINITION_PATTERN.test(normalized)) {
    const term = extractKnownTerm(latest) || extractKnownTerm(previousUser);
    if (term) return buildDefinitionAnswer(term, context);
  }

  const contextualFollowUp = buildContextualFollowUpAnswer(messages, context);
  if (contextualFollowUp) {
    return contextualFollowUp;
  }

  const dataAnswer = buildDataQuestionAnswer(messages, context);
  if (dataAnswer) {
    return dataAnswer;
  }

  return null;
}

function normaliseAssistantPayload(reply, messages, context = {}) {
  const latest = getLatestUserMessage(messages).toLowerCase().trim();

  if (!reply) {
    return wrapReply(buildSafeFallbackReply(messages, context));
  }

  const structuredPayload = extractStructuredAssistantPayload(reply);
  if (structuredPayload) {
    if (!structuredPayload.reply) {
      return wrapReply(buildSafeFallbackReply(messages, context));
    }

    if (looksLikeBadAssistantPayload(structuredPayload.reply)) {
      if (/\bapi key|configure|restart the dev server\b/i.test(structuredPayload.reply)) {
        return wrapReply(SERVICE_UNAVAILABLE_MESSAGE);
      }
      return wrapReply(buildSafeFallbackReply(messages, context));
    }

    return {
      reply: structuredPayload.reply.trim(),
      visuals: sanitizeVisuals(structuredPayload.visuals),
    };
  }

  if (looksLikeBadAssistantPayload(reply)) {
    if (/\bapi key|configure|restart the dev server\b/i.test(reply)) {
      return wrapReply(SERVICE_UNAVAILABLE_MESSAGE);
    }
    return wrapReply(buildSafeFallbackReply(messages, context));
  }

  if (GRATITUDE_PATTERN.test(latest)) {
    return wrapReply(buildThanksReply(context));
  }

  if (FAREWELL_PATTERN.test(latest)) {
    return wrapReply(buildFarewellReply(context));
  }

  if (CLOSE_SESSION_PATTERN.test(latest) && /further assistance|specific areas|anything else/i.test(getLastAssistantMessage(messages))) {
    return wrapReply(buildClosingReply(context));
  }

  if (DEFINITION_PATTERN.test(latest)) {
    const term = extractKnownTerm(latest) || extractKnownTerm(getPreviousUserMessage(messages));
    if (term && !new RegExp(TERM_DEFINITIONS[term].full, 'i').test(reply) && !new RegExp(`\\b${term}\\b`, 'i').test(reply)) {
      return wrapReply(buildDefinitionAnswer(term, context));
    }
  }

  return wrapReply(reply.trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], context = {} } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const quickAnswer = buildLocalPayload(messages, context);
  if (quickAnswer) {
    return res.status(200).json({ ...quickAnswer, model: 'local' });
  }

  const groqMessages = buildGroqMessages(messages, context);
  if (groqMessages.length <= 1) {
    return res.status(400).json({ error: 'No valid messages to process' });
  }

  try {
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!groqApiKey) {
      return res.status(200).json({
        reply: SERVICE_UNAVAILABLE_MESSAGE,
        visuals: [],
        model: 'service-unavailable',
      });
    }

    const modelName = getGroqModelName();
    const response = await fetch(getGroqEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        stream: false,
        messages: groqMessages,
      }),
      signal: AbortSignal.timeout(40000),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const detail = errBody?.error || errBody?.message || `HTTP ${response.status}`;
      console.error('Groq API error:', response.status, detail);
      return res.status(200).json({
        reply: SERVICE_UNAVAILABLE_MESSAGE,
        visuals: [],
        model: 'service-unavailable',
      });
    }

    const data = await response.json();
    const reply = extractGroqReply(data);
    const payload = normaliseAssistantPayload(reply, messages, context);

    return res.status(200).json({
      ...payload,
      model: modelName,
    });
  } catch (error) {
    console.error('Chat handler error:', error);
    return res.status(200).json({
      reply: SERVICE_UNAVAILABLE_MESSAGE,
      visuals: [],
      model: 'service-unavailable',
    });
  }
}
