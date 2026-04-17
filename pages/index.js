import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { StatCard, Card, Badge, Button } from '../components/ui';
import {
  Brain, TrendingUp, Users, AlertTriangle, ArrowRight,
  Activity, Zap, BarChart2, Shield, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { getStats } from '../lib/analytics';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const demoChurnTrend = [
  { month: 'Jan', churn: 18, retained: 82 },
  { month: 'Feb', churn: 22, retained: 78 },
  { month: 'Mar', churn: 19, retained: 81 },
  { month: 'Apr', churn: 25, retained: 75 },
  { month: 'May', churn: 21, retained: 79 },
  { month: 'Jun', churn: 17, retained: 83 },
];

const RISK_COLORS = ['#F43F5E', '#F59E0B', '#10B981'];

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const riskData = [
    { name: 'High', value: stats?.highRiskDetected || 0 },
    { name: 'Medium', value: stats?.mediumRiskDetected || 0 },
    { name: 'Low', value: stats?.lowRiskDetected || 0 },
  ];
  const totalRisk = riskData.reduce((s, d) => s + d.value, 0);

  return (
    <Layout title="Dashboard">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color="cyan">v2.0 — XAI Powered</Badge>
              <Badge color="purple">SHAP + LIME</Badge>
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white leading-tight mb-2">
              Telco Churn{' '}
              <span className="gradient-text">Intelligence</span>
            </h1>
            <p className="text-slate-400 text-base max-w-xl leading-relaxed">
              Predict, explain, and prevent customer churn with state-of-the-art explainable AI. 
              Transform raw telco data into actionable retention strategies.
            </p>
          </div>
          <Link href="/predict">
            <Button icon={Brain} size="lg" className="mt-2">
              Run Prediction
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Predictions"
          value={stats?.totalPredictions ?? '—'}
          subValue={`${stats?.batchFilesProcessed || 0} batch files`}
          icon={Brain}
          color="cyan"
        />
        <StatCard
          label="Records Analyzed"
          value={stats?.totalRecordsAnalyzed ?? '—'}
          subValue="across all sessions"
          icon={Users}
          color="purple"
        />
        <StatCard
          label="High Risk Found"
          value={stats?.highRiskDetected ?? '—'}
          subValue={totalRisk ? `${((stats?.highRiskDetected / totalRisk) * 100 || 0).toFixed(0)}% of predictions` : 'No data yet'}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          label="AI Consultations"
          value={stats?.totalConsultations ?? '—'}
          subValue="insights generated"
          icon={Zap}
          color="emerald"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Churn trend */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-white">Industry Churn Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly churn rate benchmark (sample)</p>
            </div>
            <Badge color="slate">Demo Data</Badge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={demoChurnTrend}>
              <defs>
                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="retainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#0D1526', border: '1px solid #1E2D45', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Area type="monotone" dataKey="churn" stroke="#F43F5E" fill="url(#churnGrad)" strokeWidth={2} name="Churn %" />
              <Area type="monotone" dataKey="retained" stroke="#06B6D4" fill="url(#retainGrad)" strokeWidth={2} name="Retained %" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Risk distribution */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-white">Risk Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Your prediction history</p>
          </div>
          {totalRisk > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {riskData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {riskData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[i] }} />
                      <span className="text-slate-400">{d.name} Risk</span>
                    </div>
                    <span className="font-mono text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-slate-800/50 mb-3">
                <BarChart2 className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Run predictions to see distribution</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { href: '/predict', icon: Brain, color: 'cyan', title: 'Churn Prediction', desc: 'Single customer or batch CSV upload with instant results', badge: 'Core' },
          { href: '/insights', icon: TrendingUp, color: 'purple', title: 'XAI Insights', desc: 'SHAP force plots and LIME explanations for model decisions', badge: 'SHAP' },
          { href: '/consultant', icon: Activity, color: 'emerald', title: 'AI Consultant', desc: 'Get expert business insights powered by open-source LLM', badge: 'Free AI' },
          { href: '/roi', icon: BarChart2, color: 'amber', title: 'Business ROI', desc: 'Calculate revenue impact and retention investment returns', badge: null },
          { href: '/train', icon: Zap, color: 'rose', title: 'Train Model', desc: 'Retrain the XGBoost model with your own dataset', badge: null },
          { href: '/stats', icon: Shield, color: 'slate', title: 'App Statistics', desc: 'View usage analytics, session history, and performance data', badge: 'New' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card hoverable className="p-5 cursor-pointer group h-full">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${
                  item.color === 'cyan' ? 'bg-cyan-500/10 border border-cyan-500/20' :
                  item.color === 'purple' ? 'bg-purple-500/10 border border-purple-500/20' :
                  item.color === 'emerald' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  item.color === 'amber' ? 'bg-amber-500/10 border border-amber-500/20' :
                  item.color === 'rose' ? 'bg-rose-500/10 border border-rose-500/20' :
                  'bg-slate-700/30 border border-slate-600/30'
                }`}>
                  <item.icon className={`w-5 h-5 ${
                    item.color === 'cyan' ? 'text-cyan-400' :
                    item.color === 'purple' ? 'text-purple-400' :
                    item.color === 'emerald' ? 'text-emerald-400' :
                    item.color === 'amber' ? 'text-amber-400' :
                    item.color === 'rose' ? 'text-rose-400' :
                    'text-slate-400'
                  }`} />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-white mb-1.5 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              {item.badge && <div className="mt-3"><Badge color={item.color === 'slate' ? 'slate' : item.color}>{item.badge}</Badge></div>}
            </Card>
          </Link>
        ))}
      </div>

      {/* Model info banner */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white">XGBoost Churn Model</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Gradient boosting with SHAP explainability · Fairness-audited · FastAPI deployed
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['XGBoost', 'SHAP', 'LIME', 'FastAPI', 'XAI'].map(t => (
              <Badge key={t} color="cyan">{t}</Badge>
            ))}
          </div>
        </div>
      </Card>
    </Layout>
  );
}
