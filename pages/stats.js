import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, Badge, StatCard, ProgressBar } from '../components/ui';
import { BarChart3, Brain, MessageSquare, TrendingUp, DollarSign, Cpu, Trash2, RefreshCw, Clock, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { getStats, clearStats, getWeeklyTrend } from '../lib/analytics';
import toast from 'react-hot-toast';

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = () => {
    setStats(getStats());
    setTrend(getWeeklyTrend());
  };

  useEffect(() => {
    load();
  }, []);

  const handleClear = () => {
    clearStats();
    load();
    setShowConfirm(false);
    toast.success('Statistics cleared');
  };

  if (!stats) return null;

  const total = (stats.highRiskDetected || 0) + (stats.mediumRiskDetected || 0) + (stats.lowRiskDetected || 0);

  const pageViewData = Object.entries(stats.pageViews || {})
    .map(([page, views]) => ({
      page: page === '/' ? 'Dashboard' : page.replace('/', '').charAt(0).toUpperCase() + page.replace('/', '').slice(1),
      views,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const sessionHistory = (stats.sessionHistory || []).slice(-20).reverse();

  const usageBreakdown = [
    { label: 'Predictions', value: stats.totalPredictions || 0, icon: Brain, color: 'cyan' },
    { label: 'Consultations', value: stats.totalConsultations || 0, icon: MessageSquare, color: 'purple' },
    { label: 'XAI Analysis', value: stats.shapAnalysisRun || 0, icon: TrendingUp, color: 'emerald' },
    { label: 'ROI Calculations', value: stats.roiCalculations || 0, icon: DollarSign, color: 'amber' },
    { label: 'Training Sessions', value: stats.totalTrainingSessions || 0, icon: Cpu, color: 'rose' },
    { label: 'Batch Files', value: stats.batchFilesProcessed || 0, icon: Activity, color: 'slate' },
  ];

  const eventTypeLabels = {
    prediction: { label: 'Prediction', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    consultation: { label: 'AI Chat', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    roi: { label: 'ROI Calc', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    training: { label: 'Training', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  };

  return (
    <Layout title="App Statistics">
      <SectionHeader
        title="Usage Statistics"
        subtitle="Your session activity, prediction history, and app engagement"
        icon={BarChart3}
        action={
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Trash2} variant="danger" size="sm" onClick={() => setShowConfirm(true)}>Clear</Button>
          </div>
        }
      />

      {/* Clear confirm */}
      {showConfirm && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm text-rose-300">Clear all usage statistics? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={handleClear}>Confirm Clear</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Predictions" value={stats.totalPredictions || 0} icon={Brain} color="cyan" subValue={`${stats.totalRecordsAnalyzed || 0} records analyzed`} />
        <StatCard label="AI Consultations" value={stats.totalConsultations || 0} icon={MessageSquare} color="purple" />
        <StatCard label="High Risk Found" value={stats.highRiskDetected || 0} icon={Activity} color="rose" subValue={total ? `${((stats.highRiskDetected / total) * 100).toFixed(0)}% of predictions` : '—'} />
        <StatCard label="Batch Files" value={stats.batchFilesProcessed || 0} icon={BarChart3} color="emerald" subValue={`${stats.totalBatchPredictions || 0} batch runs`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly trend */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">7-Day Activity</h3>
            <Badge color="cyan">This Week</Badge>
          </div>
          {trend.some(d => d.predictions > 0 || d.consultations > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid #1E2D45', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="predictions" stroke="#06B6D4" fill="url(#predGrad)" strokeWidth={2} name="Predictions" />
                <Area type="monotone" dataKey="consultations" stroke="#8B5CF6" fill="url(#chatGrad)" strokeWidth={2} name="Consultations" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
              No activity this week — start making predictions!
            </div>
          )}
        </Card>

        {/* Risk breakdown */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-white mb-4">Risk Distribution</h3>
          {total > 0 ? (
            <div className="space-y-4">
              {[
                { label: 'High Risk', value: stats.highRiskDetected || 0, color: 'rose' },
                { label: 'Medium Risk', value: stats.mediumRiskDetected || 0, color: 'amber' },
                { label: 'Low Risk', value: stats.lowRiskDetected || 0, color: 'emerald' },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-slate-400">{r.label}</span>
                    <span className="text-sm font-mono text-white">{r.value} <span className="text-xs text-slate-500">({total ? ((r.value / total) * 100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <ProgressBar value={r.value} max={total} color={r.color} showValue={false} />
                </div>
              ))}
              <div className="pt-3 border-t border-[#1E2D45]">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total analyzed</span>
                  <span className="font-mono text-white">{total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm text-center">
              Run predictions to see risk breakdown
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Page views */}
        {pageViewData.length > 0 ? (
          <Card className="p-5">
            <h3 className="font-display font-semibold text-white mb-4">Page Views</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pageViewData} layout="vertical">
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="page" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid #1E2D45', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="views" fill="#06B6D4" fillOpacity={0.7} radius={[0, 4, 4, 0]} name="Views" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card className="p-5 flex items-center justify-center">
            <p className="text-slate-600 text-sm">No page views tracked yet</p>
          </Card>
        )}

        {/* Feature usage */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-white mb-4">Feature Usage</h3>
          <div className="space-y-3">
            {usageBreakdown.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${item.color === 'cyan' ? 'bg-cyan-500/15' : item.color === 'purple' ? 'bg-purple-500/15' : item.color === 'emerald' ? 'bg-emerald-500/15' : item.color === 'amber' ? 'bg-amber-500/15' : item.color === 'rose' ? 'bg-rose-500/15' : 'bg-slate-700/30'}`}>
                  <item.icon className={`w-3.5 h-3.5 ${item.color === 'cyan' ? 'text-cyan-400' : item.color === 'purple' ? 'text-purple-400' : item.color === 'emerald' ? 'text-emerald-400' : item.color === 'amber' ? 'text-amber-400' : item.color === 'rose' ? 'text-rose-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-400">{item.label}</span>
                    <span className="text-xs font-mono text-white">{item.value}</span>
                  </div>
                  <ProgressBar value={item.value} max={Math.max(...usageBreakdown.map(u => u.value), 1)} color={item.color} showValue={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Session history */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">Recent Activity</h3>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          {sessionHistory.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {sessionHistory.map((event, i) => {
                const meta = eventTypeLabels[event.type] || { label: event.type, color: 'text-slate-400', bg: 'bg-slate-700/30' };
                return (
                  <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-[#1E2D45]/50 last:border-0">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color} flex-shrink-0 mt-0.5`}>{meta.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">
                        {event.mode === 'batch' ? `Batch: ${event.records || 0} records` :
                         event.preview ? event.preview :
                         event.risk ? `${event.risk} risk prediction` :
                         event.type}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {event.timestamp ? new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm text-center">
              Activity will appear here as you use the app
            </div>
          )}
        </Card>
      </div>

      {/* Meta info */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Tracking since: <span className="text-slate-300 font-mono">{stats.createdAt ? new Date(stats.createdAt).toLocaleDateString() : '—'}</span>
            </p>
            <p className="text-xs text-slate-500">
              Last updated: <span className="text-slate-300 font-mono">{stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '—'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="slate">localStorage</Badge>
            <Badge color="slate">Client-side</Badge>
            <Badge color="emerald">Private</Badge>
          </div>
          <p className="text-xs text-slate-600 max-w-sm">
            Statistics are stored locally in your browser and never sent to any server. Clear at any time.
          </p>
        </div>
      </Card>
    </Layout>
  );
}
