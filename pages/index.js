import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, ArrowRight, BarChart2, Brain, Shield, TrendingUp, Users, Wand2 } from 'lucide-react';
import Layout from '../components/Layout';
import { Badge, Button, Card, StatCard } from '../components/ui';
import { getStats } from '../lib/analytics';

const churnTrend = [
  { month: 'Jan', churn: 18, retained: 82 },
  { month: 'Feb', churn: 22, retained: 78 },
  { month: 'Mar', churn: 19, retained: 81 },
  { month: 'Apr', churn: 25, retained: 75 },
  { month: 'May', churn: 21, retained: 79 },
  { month: 'Jun', churn: 17, retained: 83 },
];

const riskColors = ['#f43f5e', '#f59e0b', '#10b981'];

const quickLinks = [
  { href: '/predict', title: 'Run Prediction', description: 'Score a single customer or upload a CSV batch.', icon: Brain, accent: 'cyan' },
  { href: '/insights', title: 'View Insights', description: 'Inspect SHAP and LIME explanations with cleaner summaries.', icon: TrendingUp, accent: 'purple' },
  { href: '/consultant', title: 'Open Consultant', description: 'Ask for churn strategy, offer design, or ROI guidance.', icon: Activity, accent: 'emerald' },
  { href: '/roi', title: 'Model ROI', description: 'Estimate campaign impact and revenue protected by retention.', icon: BarChart2, accent: 'amber' },
];

export default function HomePage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const riskData = [
    { name: 'High', value: stats?.highRiskDetected || 0 },
    { name: 'Medium', value: stats?.mediumRiskDetected || 0 },
    { name: 'Low', value: stats?.lowRiskDetected || 0 },
  ];

  const totalRisk = riskData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Layout title="Overview">
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <Card className="overflow-hidden p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge color="cyan">Modern retention workspace</Badge>
            <Badge color="amber">Responsive dashboard</Badge>
          </div>

          <h1 className="font-display max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Turn churn signals into <span className="gradient-text">retention action</span>
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            Analyze customer risk, explain model decisions, explore campaign ROI, and work across mobile or desktop without losing clarity.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/predict">
              <Button icon={Brain} size="lg">
                Start Prediction
              </Button>
            </Link>
            <Link href="/consultant">
              <Button variant="secondary" size="lg" icon={Wand2}>
                Ask the Consultant
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-sky-500/10 p-3">
              <Shield className="h-6 w-6 text-sky-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Decision Snapshot</h2>
              <p className="text-sm text-slate-500">What the workspace is optimized for right now.</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-400">
            <div className="rounded-2xl bg-white/3 p-4">
              Prioritize short-tenure customers, month-to-month contracts, and billing friction first.
            </div>
            <div className="rounded-2xl bg-white/3 p-4">
              Use explainability to translate model output into account actions your team can apply.
            </div>
            <div className="rounded-2xl bg-white/3 p-4">
              Stress-test campaign assumptions with ROI before you commit retention spend.
            </div>
          </div>
        </Card>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Predictions"
          value={stats?.totalPredictions ?? '-'}
          subValue={`${stats?.batchFilesProcessed || 0} batch files`}
          icon={Brain}
          color="cyan"
        />
        <StatCard
          label="Records Analyzed"
          value={stats?.totalRecordsAnalyzed ?? '-'}
          subValue="Across all sessions"
          icon={Users}
          color="purple"
        />
        <StatCard
          label="High Risk Found"
          value={stats?.highRiskDetected ?? '-'}
          subValue={totalRisk ? `${((stats?.highRiskDetected / totalRisk) * 100 || 0).toFixed(0)}% of predictions` : 'No data yet'}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          label="Consultations"
          value={stats?.totalConsultations ?? '-'}
          subValue="Advisory prompts explored"
          icon={Activity}
          color="emerald"
        />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Churn Trend</h3>
              <p className="text-xs text-slate-500">Illustrative six-month benchmark view.</p>
            </div>
            <Badge color="slate">Reference</Badge>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={churnTrend}>
              <defs>
                <linearGradient id="churnArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="retainArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="churn" stroke="#f43f5e" fill="url(#churnArea)" strokeWidth={2.2} name="Churn %" />
              <Area type="monotone" dataKey="retained" stroke="#0ea5e9" fill="url(#retainArea)" strokeWidth={2.2} name="Retained %" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-lg font-semibold text-white">Risk Distribution</h3>
            <p className="text-xs text-slate-500">Based on your recent prediction activity.</p>
          </div>

          {totalRisk > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={riskData} dataKey="value" innerRadius={40} outerRadius={68} paddingAngle={4}>
                    {riskData.map((_, index) => (
                      <Cell key={index} fill={riskColors[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {riskData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: riskColors[index] }} />
                      <span className="text-slate-400">{entry.name} risk</span>
                    </div>
                    <span className="font-mono text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-[24px] bg-white/3 p-4">
                <BarChart2 className="h-7 w-7 text-slate-500" />
              </div>
              <p className="text-sm text-slate-500">Run a prediction to populate this panel.</p>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card hoverable className="group h-full cursor-pointer p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className={`rounded-2xl p-3 ${
                  item.accent === 'cyan'
                    ? 'bg-sky-500/10'
                    : item.accent === 'purple'
                      ? 'bg-violet-500/10'
                      : item.accent === 'emerald'
                        ? 'bg-emerald-500/10'
                        : 'bg-amber-500/10'
                }`}>
                  <item.icon className={`h-5 w-5 ${
                    item.accent === 'cyan'
                      ? 'text-sky-500'
                      : item.accent === 'purple'
                        ? 'text-violet-500'
                        : item.accent === 'emerald'
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                  }`} />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
              </div>

              <h3 className="font-display mb-2 text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
            </Card>
          </Link>
        ))}
      </section>
    </Layout>
  );
}
