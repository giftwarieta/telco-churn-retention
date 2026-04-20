import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '../components/Layout';
import { Badge, Button, Card, SectionHeader } from '../components/ui';
import {
  AlertCircle,
  Building2,
  Copy,
  Database,
  Lightbulb,
  LogOut,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { addSessionEvent, getStats, pushGlobalStats, updateStats } from '../lib/analytics';
import { chatWithConsultant } from '../lib/api';
import {
  clearConsultantHistory,
  clearConsultantProfile,
  getDefaultWorkspaceContext,
  getConsultantHistory,
  getConsultantProfile,
  getCustomDatasetSession,
  getWorkspaceContext,
  setConsultantHistory,
  setConsultantProfile,
} from '../lib/workspace';
import { summarizeCsvText } from '../lib/data-profile';

const QUICK_PROMPTS = [
  { label: 'Dataset Overview', prompt: 'Give me a clear overview of the active dataset and what stands out most.' },
  { label: 'Top Insights', prompt: 'What are the most important insights you can see from the active data?' },
  { label: 'Churn Hotspots', prompt: 'Which customer segments in this data appear to be most exposed to churn risk?' },
  { label: 'Contract Mix', prompt: 'Explain the contract mix in the data and what it means for retention strategy.' },
  { label: 'Revenue Signals', prompt: 'What does the data suggest about monthly charges, value concentration, and churn exposure?' },
  { label: 'Retention Priorities', prompt: 'Based on the active data, what retention priorities should we focus on first?' },
];

const FRIENDLY_SERVICE_MESSAGE =
  'I am sorry, but I am having difficulty providing a reliable response right now. Please contact the administrator of this website or try again in a little while.';
const CONSULTANT_AVATAR_SRC = '/images/consultant-avatar.png?v=4';

function formatNumber(value) {
  if (typeof value !== 'number') return 'not available';
  return value.toLocaleString();
}

function buildWelcomeMessage(profile, dataSummary, workspaceContext) {
  const insightLines = [];

  if (dataSummary?.rowCount) {
    insightLines.push(`- Active dataset: ${dataSummary.datasetName} with ${formatNumber(dataSummary.rowCount)} rows and ${formatNumber(dataSummary.columnCount)} columns.`);
  }

  if (dataSummary?.target?.positiveRate !== null && dataSummary?.target?.positiveRate !== undefined) {
    insightLines.push(`- Observed churn rate in the active data: ${dataSummary.target.positiveRate}%.`);
  }

  if (Array.isArray(dataSummary?.insights) && dataSummary.insights.length > 0) {
    insightLines.push(`- First data signal: ${dataSummary.insights[0]}`);
  }

  return `Hello ${profile.userName}. I am ready to support ${profile.companyName} using the ${workspaceContext.datasetName} workspace.

You can ask direct questions about the active data, including:
- dataset structure and available columns
- churn rate, segment mix, and value patterns
- contract, payment, and service distributions
- insights, anomalies, and retention implications

${insightLines.join('\n')}`;
}

function buildUserDataContext(profile, dataSummary) {
  try {
    const stats = getStats();
    const workspace = getWorkspaceContext();
    const sessionDataset = getCustomDatasetSession();
    const history = (stats.sessionHistory || []).slice(-20);

    const predictions = history.filter((event) => event.type === 'prediction');
    const recentPredictions = predictions.slice(-5).map((event) => ({
      risk: event.risk,
      preview: event.preview || null,
    }));

    const riskBreakdown = {
      high: stats.highRiskDetected || 0,
      medium: stats.mediumRiskDetected || 0,
      low: stats.lowRiskDetected || 0,
      total: (stats.highRiskDetected || 0) + (stats.mediumRiskDetected || 0) + (stats.lowRiskDetected || 0),
    };

    return {
      topic: 'telecom churn analytics',
      profile: {
        userName: profile.userName,
        companyName: profile.companyName,
      },
      sessionStats: {
        totalPredictions: stats.totalPredictions || 0,
        totalRecordsAnalyzed: stats.totalRecordsAnalyzed || 0,
        batchFilesProcessed: stats.batchFilesProcessed || 0,
        totalConsultations: stats.totalConsultations || 0,
        roiCalculations: stats.roiCalculations || 0,
        shapAnalysisRun: stats.shapAnalysisRun || 0,
      },
      workspace: {
        dataSource: workspace.dataSource,
        datasetName: workspace.datasetName,
        customerCount: workspace.customerCount || sessionDataset?.rowCount || null,
        datasetScope: workspace.datasetScope,
        modelLabel: workspace.modelLabel,
        modelStatus: workspace.modelStatus,
      },
      dataProfile: dataSummary,
      riskBreakdown,
      recentPredictions: recentPredictions.length > 0 ? recentPredictions : null,
    };
  } catch {
    return {
      topic: 'telecom churn analytics',
      profile: {
        userName: profile.userName,
        companyName: profile.companyName,
      },
      dataProfile: dataSummary,
    };
  }
}

function ConsultantAvatar({ className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return (
      <div className={`flex h-full w-full items-center justify-center rounded-full bg-emerald-500/15 ${className}`}>
        <User className="h-4 w-4 text-emerald-400" />
      </div>
    );
  }

  return (
    <img
      src={CONSULTANT_AVATAR_SRC}
      alt="Consultant avatar"
      className={`h-full w-full rounded-full object-cover object-[center_18%] scale-[1.08] ${className}`}
      loading="eager"
      draggable="false"
      onError={() => setImageFailed(true)}
    />
  );
}

function buildSimpleChatFallback(content) {
  const normalized = (content || '').trim().toLowerCase();

  if (/^(thanks|thank you|thankyou|thx|great|perfect|okay|ok|got it)[.!? ]*$/i.test(normalized)) {
    return 'You are very welcome. Are there any other specific areas or further assistance you require at this time?';
  }

  if (/^(hi|hello|hey)[.!? ]*$/i.test(normalized)) {
    return 'Hello. I can help with churn strategy, retention offers, ROI, pricing, customer value management, explainability, and questions about the active data.';
  }

  if (/^(no|nope|that\'s all|that is all|nothing else|all good|all set|no thanks|no thank you)[.!? ]*$/i.test(normalized)) {
    return 'It was a pleasure assisting you today. Wishing you continued success in your customer retention efforts. Goodbye!';
  }

  if (/^(bye|goodbye|exit|quit|see you)[.!? ]*$/i.test(normalized)) {
    return 'Goodbye. Feel free to reach out anytime for further assistance with your churn strategies.';
  }

  if (/\broi|payback|arpu|clv|revenue|cost\b/i.test(normalized)) {
    return 'To provide an accurate ROI calculation, I require at least the target customer count, expected save rate, campaign cost, and average monthly value or ARPU.';
  }

  return FRIENDLY_SERVICE_MESSAGE;
}

function sanitizeIncomingVisuals(visuals = []) {
  return (Array.isArray(visuals) ? visuals : [])
    .filter((item) => item && typeof item === 'object' && typeof item.type === 'string')
    .slice(0, 3);
}

function parseStructuredAssistantEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.reply !== 'string') return null;

  return {
    reply: value.reply.trim(),
    visuals: sanitizeIncomingVisuals(value.visuals),
  };
}

function extractBalancedChatJson(text = '', startIndex = 0) {
  if (text[startIndex] !== '{') return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          json: text.slice(startIndex, index + 1),
          endIndex: index + 1,
        };
      }
    }
  }

  return null;
}

function normalizeAssistantText(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildVisualFallbackText(visuals = []) {
  const primaryType = visuals[0]?.type;

  if (primaryType === 'table') return 'Here is a simple table summary based on the active data.';
  if (primaryType === 'decision_tree') return 'Here is a simple decision flow you can use for retention actions.';
  if (primaryType === 'pie' || primaryType === 'donut') return 'Here is a simple distribution view based on the active data.';
  if (primaryType === 'bar' || primaryType === 'column' || primaryType === 'line') {
    return 'Here is a simple chart summary based on the active data.';
  }

  return 'Here is a simple summary based on the active data.';
}

function extractStructuredAssistantEnvelope(rawReply = '') {
  const trimmed = normalizeAssistantText(rawReply);
  if (!trimmed) return null;

  const direct = (() => {
    try {
      const parsed = parseStructuredAssistantEnvelope(JSON.parse(trimmed));
      if (!parsed) return null;
      return { ...parsed, leadingText: '', trailingText: '' };
    } catch {
      return null;
    }
  })();

  if (direct) return direct;

  const fromCodeFence = (() => {
    const match = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (!match) return null;
    try {
      const parsed = parseStructuredAssistantEnvelope(JSON.parse(match[1]));
      if (!parsed) return null;
      return {
        ...parsed,
        leadingText: trimmed.slice(0, match.index).trim(),
        trailingText: trimmed.slice((match.index || 0) + match[0].length).trim(),
      };
    } catch {
      return null;
    }
  })();

  if (fromCodeFence) return fromCodeFence;

  const matches = trimmed.matchAll(/\{\s*"reply"\s*:/g);
  for (const match of matches) {
    const startIndex = match.index ?? -1;
    if (startIndex < 0) continue;

    const candidate = extractBalancedChatJson(trimmed, startIndex);
    if (!candidate) continue;

    try {
      const parsed = parseStructuredAssistantEnvelope(JSON.parse(candidate.json));
      if (!parsed) continue;

      return {
        ...parsed,
        leadingText: trimmed.slice(0, startIndex).trim(),
        trailingText: trimmed.slice(candidate.endIndex).trim(),
      };
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeAssistantReply(reply = '', visuals = []) {
  const safeVisuals = sanitizeIncomingVisuals(visuals);
  const structured = extractStructuredAssistantEnvelope(reply);

  if (!structured) {
    return {
      reply: normalizeAssistantText(reply),
      visuals: safeVisuals,
    };
  }

  const outerText = normalizeAssistantText([structured.leadingText, structured.trailingText].filter(Boolean).join('\n\n'));
  const cleanReply = outerText || normalizeAssistantText(structured.reply) || buildVisualFallbackText(structured.visuals);

  return {
    reply: cleanReply,
    visuals: safeVisuals.length ? safeVisuals : sanitizeIncomingVisuals(structured.visuals),
  };
}

function normalizeConsultantMessage(message) {
  if (!message || message.role !== 'assistant' || message.isError) return message;

  const normalized = normalizeAssistantReply(message.content, message.visuals);

  return {
    ...message,
    content: normalized.reply,
    visuals: normalized.visuals,
  };
}

const VISUAL_COLORS = ['#06b6d4', '#10b981', '#38bdf8', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6'];

function formatVisualValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return value ?? '-';
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}

function VisualTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-3 py-2 text-xs text-slate-200 shadow-xl">
      {label ? <div className="mb-1 font-semibold text-white">{label}</div> : null}
      {payload.map((entry) => (
        <div key={`${entry.name}-${entry.value}`} className="text-slate-300">
          {entry.name}: {formatVisualValue(entry.value)}
        </div>
      ))}
    </div>
  );
}

function ChatTableVisual({ visual }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/10">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              {visual.columns?.map((column) => (
                <th key={column} className="px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(visual.rows || []).map((row, index) => (
              <tr key={`${visual.title}-${index}`} className="border-t border-white/6">
                {row.map((value, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-3 py-2 text-slate-200">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChatPieVisual({ visual }) {
  const data = (visual.data || []).filter((item) => typeof item?.value === 'number' && item.value >= 0);
  if (!data.length) return null;
  const isDonut = visual.type === 'donut';

  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={isDonut ? 60 : 34} outerRadius={84} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={`${entry.label}-${index}`} fill={VISUAL_COLORS[index % VISUAL_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<VisualTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.map((entry, index) => (
          <div key={entry.label} className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2 text-xs text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VISUAL_COLORS[index % VISUAL_COLORS.length] }} />
            <span className="flex-1">{entry.label}</span>
            <span className="font-semibold text-white">{formatVisualValue(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatLineVisual({ visual }) {
  const data = (visual.data || []).filter((item) => typeof item?.value === 'number');
  if (!data.length) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              angle={data.length > 4 ? -18 : 0}
              textAnchor={data.length > 4 ? 'end' : 'middle'}
              interval={0}
              height={data.length > 4 ? 46 : 30}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip cursor={{ stroke: 'rgba(56,189,248,0.2)', strokeWidth: 1 }} content={<VisualTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#22d3ee' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChatBarVisual({ visual }) {
  const data = (visual.data || []).filter((item) => typeof item?.value === 'number');
  if (!data.length) return null;

  const isColumn = visual.type === 'column';

  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isColumn ? (
            <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 24 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                angle={data.length > 4 ? -18 : 0}
                textAnchor={data.length > 4 ? 'end' : 'middle'}
                interval={0}
                height={data.length > 4 ? 46 : 30}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'transparent' }} content={<VisualTooltip />} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={VISUAL_COLORS[index % VISUAL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 34, bottom: 8 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'transparent' }} content={<VisualTooltip />} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={VISUAL_COLORS[index % VISUAL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DecisionTreeNode({ node }) {
  if (!node?.label) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="min-w-[12rem] rounded-2xl border border-sky-500/15 bg-sky-500/8 px-4 py-3 text-center text-xs font-medium text-slate-100 shadow-lg shadow-sky-500/5">
        {node.label}
      </div>
      {Array.isArray(node.children) && node.children.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-3">
          {node.children.map((child, index) => (
            <DecisionTreeNode key={`${child.label}-${index}`} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChatDecisionTreeVisual({ visual }) {
  if (!visual?.tree?.label) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8 bg-black/10 p-4">
      <div className="min-w-[16rem]">
        <DecisionTreeNode node={visual.tree} />
      </div>
    </div>
  );
}

function ChatVisuals({ visuals = [] }) {
  if (!visuals.length) return null;

  return (
    <div className="mt-3 space-y-3">
      {visuals.map((visual, index) => (
        <div key={`${visual.type}-${visual.title || index}`} className="space-y-2">
          {visual.title ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{visual.title}</div> : null}
          {visual.description ? <p className="text-xs leading-relaxed text-slate-500">{visual.description}</p> : null}

          {visual.type === 'table' ? <ChatTableVisual visual={visual} /> : null}
          {visual.type === 'pie' || visual.type === 'donut' ? <ChatPieVisual visual={visual} /> : null}
          {visual.type === 'bar' || visual.type === 'column' ? <ChatBarVisual visual={visual} /> : null}
          {visual.type === 'line' ? <ChatLineVisual visual={visual} /> : null}
          {visual.type === 'decision_tree' ? <ChatDecisionTreeVisual visual={visual} /> : null}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    toast.success('Response copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const isError = msg.isError;

  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border ${
          msg.role === 'user'
            ? 'border-sky-500/20 bg-sky-500/10'
            : isError
              ? 'border-rose-500/20 bg-rose-500/10'
              : 'overflow-hidden rounded-full border-emerald-500/20 bg-emerald-500/10'
        }`}
      >
        {msg.role === 'user' ? (
          <User className="h-4 w-4 text-sky-500" />
        ) : isError ? (
          <AlertCircle className="h-4 w-4 text-rose-400" />
        ) : (
          <ConsultantAvatar />
        )}
      </div>

      <div className={`min-w-0 group flex max-w-[88%] flex-col gap-1 sm:max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        <div
          className={`${
            msg.role === 'user'
              ? 'chat-user'
              : isError
                ? 'rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3'
                : 'chat-assistant'
          } w-full overflow-hidden px-4 py-3`}
        >
          <div
            className={`consultant-markdown text-sm leading-relaxed ${
              isError ? 'text-rose-300' : 'text-slate-200'
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => <p className="mb-3 whitespace-pre-wrap break-words last:mb-0" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                em: ({ node, ...props }) => <em className="italic text-slate-100" {...props} />,
                ul: ({ node, ...props }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
                ol: ({ node, ...props }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
                li: ({ node, ...props }) => <li className="break-words" {...props} />,
                code: ({ inline, node, className, children, ...props }) =>
                  inline ? (
                    <code
                      className={`rounded bg-slate-900/70 px-1.5 py-0.5 font-mono text-[0.85em] ${
                        isError ? 'text-rose-200' : 'text-sky-200'
                      }`}
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code
                      className={`block overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70 p-3 font-mono text-xs ${
                        isError ? 'text-rose-200' : 'text-slate-100'
                      } ${className || ''}`}
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                pre: ({ node, ...props }) => <pre className="mb-3 overflow-x-auto last:mb-0" {...props} />,
                table: ({ node, ...props }) => (
                  <div className="mb-3 overflow-x-auto rounded-xl border border-white/10 last:mb-0">
                    <table className="min-w-full text-left text-xs text-slate-200" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => <thead className="bg-slate-900/70 text-[11px] uppercase tracking-[0.18em] text-slate-400" {...props} />,
                tbody: ({ node, ...props }) => <tbody className="divide-y divide-white/5" {...props} />,
                tr: ({ node, ...props }) => <tr className="align-top" {...props} />,
                th: ({ node, ...props }) => <th className="px-3 py-2 font-medium" {...props} />,
                td: ({ node, ...props }) => <td className="px-3 py-2 text-slate-300" {...props} />,
                a: ({ node, ...props }) => <a className="text-sky-300 underline underline-offset-2 hover:text-sky-200" target="_blank" rel="noreferrer" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="mb-3 border-l-2 border-sky-400/40 pl-3 italic text-slate-300 last:mb-0" {...props} />
                ),
              }}
            >
              {msg.content || ''}
            </ReactMarkdown>
          </div>
          {!isError && Array.isArray(msg.visuals) && msg.visuals.length > 0 ? <ChatVisuals visuals={msg.visuals} /> : null}
        </div>

        <div className={`flex items-center gap-2 text-[10px] text-slate-500 opacity-80 transition group-hover:opacity-100 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {!isError && (
            <button onClick={copy} className="inline-flex items-center gap-1 hover:text-slate-300" type="button">
              <Copy className="h-3 w-3" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultantSetupCard({ profileDraft, setProfileDraft, onSave }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-[32px] border border-sky-500/20 bg-sky-500/6 p-6 text-center sm:p-8">
      <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full border border-emerald-500/20 sm:h-20 sm:w-20">
        <ConsultantAvatar />
      </div>
      <h3 className="font-display text-2xl font-bold text-white sm:text-4xl">Personalise your consultant</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
        Enter your preferred name and organisation first. After that, you can ask direct questions about the active dataset, get insights from the data, and use the suggested prompts.
      </p>

      <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-slate-500">Preferred name</label>
          <input
            value={profileDraft.userName || ''}
            onChange={(event) => setProfileDraft((prev) => ({ ...prev, userName: event.target.value }))}
            className="input-field w-full rounded-2xl px-4 py-3 text-sm"
            placeholder="Enter your preferred name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-slate-500">Organisation</label>
          <input
            value={profileDraft.companyName || ''}
            onChange={(event) => setProfileDraft((prev) => ({ ...prev, companyName: event.target.value }))}
            className="input-field w-full rounded-2xl px-4 py-3 text-sm"
            placeholder="Enter your organisation name"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Button icon={Building2} onClick={onSave} className="min-w-[14rem]">
          Start Consultant Session
        </Button>
      </div>
    </div>
  );
}

function ConsultantStarterCard({ introText }) {
  const lines = String(introText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-emerald-500/20 bg-emerald-500/6 p-5 text-center sm:p-8">
      <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full border border-emerald-500/20 sm:h-20 sm:w-20">
        <ConsultantAvatar />
      </div>
      <h3 className="font-display text-2xl font-bold text-white sm:text-4xl">Ask anything about the data</h3>
      <div className="mx-auto mt-5 max-w-2xl rounded-[28px] border border-white/8 bg-black/12 p-4 text-left sm:p-5">
        <div className="space-y-3 text-sm leading-relaxed text-slate-300 sm:text-[15px]">
          {lines.map((line, index) => (
            line.startsWith('- ') ? (
              <div key={`${line}-${index}`} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>{line.slice(2)}</span>
              </div>
            ) : (
              <p key={`${line}-${index}`} className="whitespace-pre-wrap">
                {line}
              </p>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConsultantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [workspaceContext, setWorkspaceContext] = useState(getDefaultWorkspaceContext());
  const [consultantProfileState, setConsultantProfileState] = useState({ userName: '', companyName: '', updatedAt: null });
  const [profileDraft, setProfileDraft] = useState({ userName: '', companyName: '', updatedAt: null });
  const [dataSummary, setDataSummary] = useState(null);
  const [dataSummaryLoading, setDataSummaryLoading] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const profileReady = Boolean(consultantProfileState.userName && consultantProfileState.companyName);

  // --- NEW: Smart Body Scrolling Lock ---
  // Locks the body scroll ONLY on mobile/tablet view. Desktop users can still scroll normally.
  useEffect(() => {
    const handleResize = () => {
      // lg breakpoint in tailwind is 1024px. Below this, we assume mobile/tablet app-like view
      if (window.innerWidth < 1024) {
        document.body.classList.add('overflow-hidden');
        document.documentElement.classList.add('overflow-hidden');
      } else {
        document.body.classList.remove('overflow-hidden');
        document.documentElement.classList.remove('overflow-hidden');
      }
    };

    handleResize(); // Run immediately on mount
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    setConsultantHistory(messages);
  }, [messages]);

  useEffect(() => {
    let active = true;

    const loadContext = async () => {
      const workspace = getWorkspaceContext();
      const storedProfile = getConsultantProfile();
      const storedHistory = getConsultantHistory();

      if (!active) return;
      setWorkspaceContext(workspace);
      setConsultantProfileState(storedProfile);
      setProfileDraft(storedProfile);
      if (storedHistory.length > 0) {
        setMessages(storedHistory.map(normalizeConsultantMessage));
      }
      setDataSummaryLoading(true);

      try {
        let summary = null;

        if (workspace.dataSource === 'custom') {
          const sessionDataset = getCustomDatasetSession();
          if (sessionDataset?.content) {
            summary = summarizeCsvText(sessionDataset.content, {
              datasetName: sessionDataset.name || workspace.datasetName,
            });
          }
        } else {
          const response = await fetch('/api/dataset-summary');
          const payload = await response.json().catch(() => ({}));
          summary = payload?.summary || null;
        }

        if (!active) return;
        setDataSummary(summary);

      } catch {
        if (active) setDataSummary(null);
      } finally {
        if (active) setDataSummaryLoading(false);
      }
    };

    loadContext();

    return () => {
      active = false;
    };
  }, []);

  const handleSaveProfile = () => {
    const nextProfile = {
      userName: String(profileDraft.userName || '').trim(),
      companyName: String(profileDraft.companyName || '').trim(),
    };

    if (!nextProfile.userName || !nextProfile.companyName) {
      toast.error('Please enter your preferred name and organisation name.');
      return;
    }

    const saved = setConsultantProfile(nextProfile);

    setConsultantProfileState(saved);
    setProfileDraft(saved);
    setMessages([]);
    toast.success('Consultant workspace is ready');
  };

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    if (!profileReady) {
      toast.error('Please tell me your preferred name and organisation first.');
      return;
    }

    setInput('');
    const userMessage = { role: 'user', content, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const context = buildUserDataContext(consultantProfileState, dataSummary);
      const data = await chatWithConsultant(nextMessages, context);

      const normalizedAssistant = normalizeAssistantReply(data.reply, data.visuals);
      const reply = normalizedAssistant.reply;
      if (!reply) {
        throw new Error('Empty response from AI service');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          visuals: normalizedAssistant.visuals,
          timestamp: Date.now(),
        },
      ]);
      updateStats({ totalConsultations: 1 });
      pushGlobalStats({ totalConsultations: 1 });
      addSessionEvent({ type: 'consultation', preview: content.slice(0, 60) });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: buildSimpleChatFallback(content), timestamp: Date.now(), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const resizeTextarea = (event) => {
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 132)}px`;
  };

  const handleClearChat = () => {
    clearConsultantHistory();
    setMessages([]);
  };

  const handleEndSession = () => {
    clearConsultantHistory();
    clearConsultantProfile();
    setMessages([]);
    setInput('');
    setConsultantProfileState({ userName: '', companyName: '', updatedAt: null });
    setProfileDraft({ userName: '', companyName: '', updatedAt: null });
    toast.success('Consultant session ended');
  };

  const churnSummary = dataSummary?.target?.positiveRate;
  const topInsight = dataSummary?.insights?.[0];
  const hasUserMessages = messages.some((message) => message.role === 'user');
  const starterIntro = profileReady
    ? buildWelcomeMessage(consultantProfileState, dataSummary, workspaceContext)
    : '';
  const visibleMessages = hasUserMessages
    ? messages
    : messages.filter((message) => message.role === 'user' || message.isError);

  return (
    <Layout title="AI Consultant" hideFooter={true}>
      <div className="hidden sm:block">
        <SectionHeader
          title="AI Business Consultant"
          subtitle="Ask about the active data, explore churn insights, and get telecom strategy support grounded in your selected dataset."
          icon={MessageSquare}
          action={<Badge color="emerald">Advisory Workspace</Badge>}
        />
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[0.95fr_2.05fr] lg:items-start lg:gap-6">
        <div className="hidden lg:order-1 lg:flex lg:flex-col lg:gap-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active Workspace</div>
              <Badge color={workspaceContext.dataSource === 'custom' ? 'purple' : 'cyan'}>
                {workspaceContext.dataSource === 'custom' ? 'Custom session' : 'Default workspace'}
              </Badge>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-white/3 px-3 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Dataset</div>
                <div className="mt-1 font-medium text-white">{workspaceContext.datasetName}</div>
              </div>
              <div className="rounded-2xl bg-white/3 px-3 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Model</div>
                <div className="mt-1 font-medium text-white">{workspaceContext.modelLabel}</div>
              </div>
              <div className="rounded-2xl bg-white/3 px-3 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Rows available</div>
                <div className="mt-1 font-medium text-white">
                  {dataSummaryLoading ? 'Loading data...' : dataSummary?.rowCount ? formatNumber(dataSummary.rowCount) : formatNumber(workspaceContext.customerCount)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Ask questions directly about the active data and the consultant will use this workspace context when responding.
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Data snapshot</span>
            </div>
            {dataSummaryLoading ? (
              <p className="text-sm text-slate-500">Loading the active dataset summary...</p>
            ) : dataSummary ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl bg-white/3 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Churn snapshot</div>
                  <div className="mt-1 font-medium text-white">
                    {typeof churnSummary === 'number' ? `${churnSummary}% churn rate` : 'Target metric not available'}
                  </div>
                </div>
                {topInsight && (
                  <div className="rounded-2xl bg-white/3 px-3 py-3 text-xs leading-relaxed text-slate-400">
                    {topInsight}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-slate-500">
                  You can ask about columns, customer mix, churn patterns, top-risk segments, averages, and notable findings from the selected data.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Dataset summary is not available right now, but you can still ask broader telecom questions.</p>
            )}
          </Card>
        </div>

        {/* --- FIXED MOBILE HEIGHT (100svh-11rem) & MIN-H-0 --- */}
        <Card className="order-1 mx-auto flex h-[calc(100svh-11rem)] min-h-0 w-full max-w-4xl flex-col overflow-hidden p-0 sm:h-[calc(100svh-5.75rem)] lg:order-2 lg:h-[calc(100svh-3rem)]">
          
          <div className="z-10 shrink-0 border-b border-[color:var(--border)] bg-[color:var(--bg-card)] px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/12 sm:h-10 sm:w-10">
                  <ConsultantAvatar />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-semibold text-white sm:text-base">Consultant Chat</div>
                  <div className="hidden text-xs text-slate-500 sm:block">
                    {profileReady
                      ? `Data-aware guidance for ${consultantProfileState.companyName}`
                      : 'Complete your setup to begin a personalised chat'}
                  </div>
                </div>
              </div>

              {profileReady && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {messages.length > 0 && (
                    <Button icon={Trash2} variant="ghost" size="sm" onClick={handleClearChat} className="px-2.5 sm:px-3">
                      <span className="hidden sm:inline">Clear</span>
                    </Button>
                  )}
                  <Button icon={LogOut} variant="ghost" size="sm" onClick={handleEndSession} className="px-2.5 sm:px-3">
                    <span className="hidden sm:inline">End Session</span>
                  </Button>
                </div>
              )}
            </div>

            {profileReady && (
              <div className="mt-2.5 flex w-full items-center gap-2 overflow-x-auto lg:hidden">
                <Badge color={workspaceContext.dataSource === 'custom' ? 'purple' : 'cyan'}>
                  {workspaceContext.dataSource === 'custom' ? 'Custom session' : 'Default workspace'}
                </Badge>
                <Badge color="emerald">
                  {dataSummary?.rowCount ? `${formatNumber(dataSummary.rowCount)} rows` : workspaceContext.modelLabel}
                </Badge>
              </div>
            )}
          </div>

          <div className="consultant-chat-scroll flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
            <div className="space-y-4">
              {!profileReady ? (
                <ConsultantSetupCard
                  profileDraft={profileDraft}
                  setProfileDraft={setProfileDraft}
                  onSave={handleSaveProfile}
                />
              ) : !hasUserMessages ? (
                <ConsultantStarterCard introText={starterIntro} />
              ) : null}

              {visibleMessages.map((message, index) => (
                <MessageBubble key={`${message.timestamp}-${index}`} msg={message} />
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/10">
                    <ConsultantAvatar />
                  </div>
                  <div className="chat-assistant px-4 py-3">
                    <div className="flex h-5 items-center gap-1">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
                          style={{ animationDelay: `${dot * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="z-10 shrink-0 border-t border-[color:var(--border)] bg-[color:var(--bg-card-strong)] px-4 py-3 sm:px-5">
            <div className="mb-2 hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Ask questions about the active data, or tap a prompt below to get started quickly.
            </div>

            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                onInput={resizeTextarea}
                placeholder={
                  profileReady
                    ? 'Ask about churn rate, segment mix, data insights, pricing signals, or retention strategy...'
                    : 'Complete your consultant setup to start chatting...'
                }
                rows={1}
                disabled={!profileReady}
                className="input-field min-h-[46px] max-h-[132px] flex-1 resize-none rounded-2xl px-4 py-2.0 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[50px] sm:py-3"
              />
              <Button
                icon={Send}
                onClick={() => sendMessage()}
                disabled={!profileReady || !input.trim() || loading}
                loading={loading}
                className="h-[46px] flex-shrink-0 sm:h-[50px]"
              >
                Send
              </Button>
            </div>

            <div className="mt-3 hidden sm:block">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Suggested prompts</span>
              </div>
              
              <div className="flex w-full gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => sendMessage(item.prompt)}
                    disabled={loading || !profileReady}
                    type="button"
                    className="w-[240px] shrink-0 rounded-xl border border-transparent bg-white/3 px-3 py-2.5 text-left transition-all duration-200 hover:border-sky-500/20 hover:bg-sky-500/8 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="mb-0.5 text-[13px] font-medium text-slate-300">{item.label}</div>
                    <div className="line-clamp-2 text-[11px] leading-snug text-slate-500">{item.prompt}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Card>
      </div>
    </Layout>
  );
}