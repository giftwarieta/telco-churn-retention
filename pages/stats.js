import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, Badge, StatCard, ProgressBar } from '../components/ui';
import { Activity, BarChart3, Brain, DollarSign, Globe, MessageSquare, RefreshCw, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const GLOBAL_STATS_CACHE_KEY = 'churniq:global_stats_cache';
const CACHE_TTL_MS = 2 * 60 * 1000;

function loadGlobalCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GLOBAL_STATS_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function saveGlobalCache(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GLOBAL_STATS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

async function fetchGlobalStats() {
  const res = await fetch('/api/global-stats');
  if (!res.ok) throw new Error('Failed to fetch global stats');
  return res.json();
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

function formatStorageSource(storageMeta) {
  if (!storageMeta?.configured) return 'Analytics store not configured';
  if (storageMeta.error === 'read_failed') return 'Analytics store read failed';
  if (storageMeta.provider === 'upstash-redis') return 'Upstash Redis';
  if (storageMeta.provider === 'redis-rest') return 'Redis REST';
  return 'Serverless database';
}

export default function StatsPage() {
  const [globalStats, setGlobalStats] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  const loadGlobal = async (skipCache = false) => {
    const cached = skipCache ? null : loadGlobalCache();
    setGlobalLoading(!cached);

    if (cached) {
      setGlobalStats(cached);
    }

    try {
      const data = await fetchGlobalStats();
      setGlobalStats(data);
      saveGlobalCache(data);
    } catch {
      if (!cached) {
        setGlobalStats(null);
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    loadGlobal();
  }, []);

  const stats = globalStats || {};
  const riskTotal = (stats.highRiskDetected || 0) + (stats.mediumRiskDetected || 0) + (stats.lowRiskDetected || 0);
  const storageMeta = stats._storage || null;

  const globalItems = [
    { label: 'Total Predictions', key: 'totalPredictions', icon: Brain, color: 'cyan', subValue: `${stats.batchFilesProcessed || 0} batch files` },
    { label: 'Records Analyzed', key: 'totalRecordsAnalyzed', icon: BarChart3, color: 'rose', subValue: 'Across all tracked usage' },
    { label: 'AI Consultations', key: 'totalConsultations', icon: MessageSquare, color: 'purple', subValue: 'Cumulative advisor prompts' },
    { label: 'ROI Calculations', key: 'roiCalculations', icon: DollarSign, color: 'amber', subValue: 'Business impact calculations' },
    { label: 'XAI Runs', key: 'shapAnalysisRun', icon: TrendingUp, color: 'emerald', subValue: 'Explainability sessions' },
    {
      label: 'High Risk Found',
      key: 'highRiskDetected',
      icon: Activity,
      color: 'slate',
      subValue: riskTotal ? `${((stats.highRiskDetected / riskTotal) * 100).toFixed(0)}% of scored risk records` : '0% of scored risk records',
    },
  ];

  const riskBreakdown = [
    { label: 'High Risk', value: stats.highRiskDetected || 0, color: 'rose' },
    { label: 'Medium Risk', value: stats.mediumRiskDetected || 0, color: 'amber' },
    { label: 'Low Risk', value: stats.lowRiskDetected || 0, color: 'emerald' },
  ];

  const featureUsage = [
    { label: 'Predictions', value: stats.totalPredictions || 0, icon: Brain, color: 'cyan' },
    { label: 'Consultations', value: stats.totalConsultations || 0, icon: MessageSquare, color: 'purple' },
    { label: 'XAI Analysis', value: stats.shapAnalysisRun || 0, icon: TrendingUp, color: 'emerald' },
    { label: 'ROI Calculations', value: stats.roiCalculations || 0, icon: DollarSign, color: 'amber' },
    { label: 'Batch Files', value: stats.batchFilesProcessed || 0, icon: Activity, color: 'slate' },
  ];

  const chartData = featureUsage.map((item) => ({
    name: item.label.replace('Calculations', 'Calcs'),
    value: item.value,
  }));

  return (
    <Layout title="App Statistics">
      <SectionHeader
        title="Global Analytics"
        subtitle="Cumulative product activity across predictions, consultations, explainability, and ROI analysis."
        icon={Globe}
        action={
          <Button icon={RefreshCw} variant="secondary" size="sm" onClick={() => loadGlobal(true)} loading={globalLoading}>
            Refresh
          </Button>
        }
      />

      {globalLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {globalItems.map((item) => (
            <div key={item.key} className="h-28 animate-pulse rounded-[28px] border border-[color:var(--border)] bg-[color:var(--bg-card)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {globalItems.map((item) => (
              <StatCard
                key={item.key}
                label={item.label}
                value={stats?.[item.key] ?? 0}
                icon={item.icon}
                color={item.color}
                subValue={item.subValue}
              />
            ))}
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-white">Global Feature Usage</h3>
                  <p className="text-xs text-slate-500">A cumulative view of usage across the workspace.</p>
                </div>
                <Badge color="emerald">Cumulative view</Badge>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ background: '#0D1526', border: '1px solid #1E2D45', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" fill="#06B6D4" fillOpacity={0.8} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 font-display font-semibold text-white">Risk Distribution</h3>
              <div className="space-y-4">
                {riskBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <span className="text-sm font-mono text-white">
                        {item.value} <span className="text-xs text-slate-500">({riskTotal ? ((item.value / riskTotal) * 100).toFixed(0) : 0}%)</span>
                      </span>
                    </div>
                    <ProgressBar value={item.value} max={Math.max(riskTotal, 1)} color={item.color} showValue={false} />
                  </div>
                ))}
                <div className="border-t border-[#1E2D45] pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total risk records</span>
                    <span className="font-mono text-white">{riskTotal}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 font-display font-semibold text-white">Usage Breakdown</h3>
              <div className="space-y-3">
                {featureUsage.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-1.5 ${
                        item.color === 'cyan'
                          ? 'bg-cyan-500/15'
                          : item.color === 'purple'
                            ? 'bg-purple-500/15'
                            : item.color === 'emerald'
                              ? 'bg-emerald-500/15'
                              : item.color === 'amber'
                                ? 'bg-amber-500/15'
                                : 'bg-slate-700/30'
                      }`}
                    >
                      <item.icon
                        className={`h-3.5 w-3.5 ${
                          item.color === 'cyan'
                            ? 'text-cyan-400'
                            : item.color === 'purple'
                              ? 'text-purple-400'
                              : item.color === 'emerald'
                                ? 'text-emerald-400'
                                : item.color === 'amber'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between">
                        <span className="text-xs text-slate-400">{item.label}</span>
                        <span className="text-xs font-mono text-white">{item.value}</span>
                      </div>
                      <ProgressBar value={item.value} max={Math.max(...featureUsage.map((entry) => entry.value), 1)} color={item.color} showValue={false} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 font-display font-semibold text-white">Store Metadata</h3>
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl bg-white/3 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Tracking started</div>
                  <div className="mt-1 font-mono text-white">{formatDate(stats.createdAt)}</div>
                </div>
                <div className="rounded-2xl bg-white/3 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Last updated</div>
                  <div className="mt-1 font-mono text-white">{formatDate(stats.lastUpdated)}</div>
                </div>
                <div className="rounded-2xl bg-white/3 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Data source</div>
                  <div className="mt-1 text-white">{formatStorageSource(storageMeta)}</div>
                  {storageMeta?.key ? (
                    <div className="mt-1 font-mono text-xs text-slate-500">Connected</div>
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}
