import { useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info, RefreshCw, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import { Badge, Button, Card, ProgressBar, SectionHeader } from '../components/ui';
import { getSHAPExplanation } from '../lib/api';
import { updateStats } from '../lib/analytics';

const DEMO_SHAP = [
  { feature: 'Contract_Month-to-month', shap: 0.38, direction: 'positive' },
  { feature: 'tenure', shap: -0.29, direction: 'negative' },
  { feature: 'MonthlyCharges', shap: 0.22, direction: 'positive' },
  { feature: 'InternetService_Fiber', shap: 0.18, direction: 'positive' },
  { feature: 'TechSupport_No', shap: 0.14, direction: 'positive' },
  { feature: 'OnlineSecurity_No', shap: 0.11, direction: 'positive' },
  { feature: 'PaperlessBilling_Yes', shap: 0.09, direction: 'positive' },
  { feature: 'Partner_No', shap: 0.07, direction: 'positive' },
  { feature: 'TotalCharges', shap: -0.06, direction: 'negative' },
  { feature: 'PaymentMethod_Check', shap: 0.05, direction: 'positive' },
];

const DEMO_LIME = [
  { feature: 'Contract = Month-to-month', weight: 0.42, direction: 'churn' },
  { feature: 'tenure <= 12', weight: 0.31, direction: 'churn' },
  { feature: 'MonthlyCharges > 65', weight: 0.24, direction: 'churn' },
  { feature: 'TechSupport = No', weight: 0.19, direction: 'churn' },
  { feature: 'InternetService = Fiber optic', weight: 0.17, direction: 'churn' },
  { feature: 'TotalCharges > 500', weight: -0.15, direction: 'retain' },
  { feature: 'OnlineSecurity = No', weight: 0.12, direction: 'churn' },
  { feature: 'Partner = No', weight: 0.10, direction: 'churn' },
];

const FEATURE_GLOSSARY = {
  Contract: 'Customer contract term',
  tenure: 'Months the customer has stayed with the provider',
  MonthlyCharges: 'Recurring monthly bill amount',
  TotalCharges: 'Cumulative spend across the customer lifetime',
  InternetService: 'Customer internet service type',
  TechSupport: 'Support plan subscription',
  OnlineSecurity: 'Security add-on subscription',
  PaperlessBilling: 'Digital billing usage',
  PaymentMethod: 'Preferred payment method',
};

function InsightsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const datum = payload[0].payload;
  const glossaryKey = datum.feature?.split('_')[0];

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-3 text-xs shadow-elevated">
      <p className="mb-1 font-mono text-white">{datum.feature}</p>
      <p className={`font-semibold ${datum.direction === 'positive' ? 'text-rose-500' : 'text-emerald-500'}`}>
        SHAP: {datum.shap > 0 ? '+' : ''}{datum.shap?.toFixed(4)}
      </p>
      {FEATURE_GLOSSARY[glossaryKey] && (
        <p className="mt-1 max-w-48 text-slate-500">{FEATURE_GLOSSARY[glossaryKey]}</p>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [tab, setTab] = useState('shap');
  const [shapData, setShapData] = useState(DEMO_SHAP);
  const [limeData, setLimeData] = useState(DEMO_LIME);
  const [loading, setLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(true);

  const refreshExplanations = async () => {
    setLoading(true);

    try {
      const data = await getSHAPExplanation({});
      setShapData(data.shap_values || DEMO_SHAP);
      setLimeData(data.lime_values || DEMO_LIME);
      setIsPreview(false);
      updateStats({ shapAnalysisRun: 1 });
      toast.success('Insights updated');
    } catch {
      setShapData(DEMO_SHAP);
      setLimeData(DEMO_LIME);
      setIsPreview(true);
      toast('Showing sample explainability insights.', { icon: '•' });
    } finally {
      setLoading(false);
    }
  };

  const topPositiveDrivers = shapData.filter((item) => item.direction === 'positive').slice(0, 5);

  return (
    <Layout title="Insights">
      <SectionHeader
        title="Explainability Insights"
        subtitle="Review the biggest churn drivers using SHAP and LIME in a more readable, responsive layout."
        icon={TrendingUp}
        action={
          <div className="flex items-center gap-2">
            {isPreview && <Badge color="amber">Sample Data</Badge>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={refreshExplanations} loading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-6 inline-flex w-full max-w-md gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-1">
        {['shap', 'lime', 'summary'].map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            type="button"
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium uppercase tracking-wide transition-all duration-200 ${
              tab === mode
                ? 'border border-sky-500/20 bg-sky-500/10 text-sky-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {tab === 'shap' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">SHAP Feature Importance</h3>
                <p className="mt-0.5 text-xs text-slate-500">Positive values push predictions toward churn. Negative values pull them toward retention.</p>
              </div>
              <Badge color="cyan">SHAP</Badge>
            </div>

            <div className="insights-chart-scroll">
              <div className="insights-chart-stage">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={shapData} layout="vertical" margin={{ left: 132, right: 20, top: 8, bottom: 8 }}>
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[-0.4, 0.5]} />
                    <YAxis type="category" dataKey="feature" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={132} />
                    <ReferenceLine x={0} stroke="#334155" strokeWidth={1} />
                    <Tooltip content={<InsightsTooltip />} />
                    <Bar dataKey="shap" radius={[0, 6, 6, 0]} barSize={26}>
                      {shapData.map((item, index) => (
                        <Cell key={index} fill={item.direction === 'positive' ? '#f43f5e' : '#10b981'} fillOpacity={0.84} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-500" />
                <h4 className="font-display text-sm font-semibold text-white">How to read SHAP</h4>
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                <p><strong className="text-rose-500">Positive SHAP</strong> means a feature is increasing churn risk.</p>
                <p><strong className="text-emerald-500">Negative SHAP</strong> means a feature is helping retention.</p>
                <p>The larger the absolute value, the stronger the influence on the model decision.</p>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-display mb-3 text-sm font-semibold text-white">Top Churn Risks</h4>
              <div className="space-y-3">
                {topPositiveDrivers.map((item, index) => (
                  <div key={`${item.feature}-${index}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="truncate text-xs text-slate-400">{item.feature}</span>
                      <span className="text-xs font-mono text-rose-500">+{item.shap.toFixed(3)}</span>
                    </div>
                    <ProgressBar value={item.shap} max={0.5} color="rose" showValue={false} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'lime' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">LIME Local Explanation</h3>
                <p className="mt-0.5 text-xs text-slate-500">Useful for explaining a single prediction in plain business language.</p>
              </div>
              <Badge color="purple">LIME</Badge>
            </div>

            <div className="space-y-3">
              {limeData.map((item, index) => (
                <div
                  key={`${item.feature}-${index}`}
                  className={`rounded-2xl border p-4 transition-all duration-200 ${
                    item.direction === 'churn'
                      ? 'border-rose-500/15 bg-rose-500/6'
                      : 'border-emerald-500/15 bg-emerald-500/6'
                  }`}
                >
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-mono text-slate-300">{item.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${item.direction === 'churn' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {item.weight > 0 ? '+' : ''}{item.weight.toFixed(3)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] ${
                        item.direction === 'churn'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {item.direction === 'churn' ? 'Pushes churn' : 'Supports retention'}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={Math.abs(item.weight)} max={0.5} color={item.direction === 'churn' ? 'rose' : 'emerald'} showValue={false} />
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="font-display mb-3 text-sm font-semibold text-white">About LIME</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                LIME builds a simple local approximation around one prediction so you can describe why that particular customer was scored the way they were.
              </p>
            </Card>

            <Card className="border-violet-500/20 bg-violet-500/6 p-5">
              <h4 className="font-display mb-2 text-sm font-semibold text-white">Retention Lens</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                If contract type, tenure, and support subscriptions dominate the local explanation, focus interventions on offer redesign, onboarding reinforcement, and service assurance.
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Model Accuracy', value: '79.8%', sub: 'Test set performance' },
              { title: 'AUC-ROC Score', value: '0.847', sub: 'Overall discrimination strength' },
              { title: 'Precision', value: '65.2%', sub: 'Churner prediction quality' },
              { title: 'Recall', value: '54.9%', sub: 'Churner detection rate' },
              { title: 'F1 Score', value: '0.596', sub: 'Balanced precision and recall' },
              { title: 'Features Used', value: '19', sub: 'Engineered model inputs' },
            ].map((item) => (
              <Card key={item.title} className="p-5">
                <div className="stat-number mb-1 text-3xl font-bold text-white">{item.value}</div>
                <div className="text-sm font-medium text-slate-300">{item.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">{item.sub}</div>
              </Card>
            ))}
          </div>

          <Card className="p-5 sm:p-6">
            <h3 className="font-display mb-4 text-lg font-semibold text-white">Feature Impact Summary</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {shapData.map((item, index) => (
                <div key={`${item.feature}-${index}`} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-mono font-bold ${
                    item.direction === 'positive' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-mono text-slate-300">{item.feature}</div>
                    <ProgressBar value={Math.abs(item.shap)} max={0.5} color={item.direction === 'positive' ? 'rose' : 'emerald'} showValue={false} />
                  </div>
                  <span className={`text-xs font-mono ${item.direction === 'positive' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {item.shap > 0 ? '+' : ''}{item.shap.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
}
