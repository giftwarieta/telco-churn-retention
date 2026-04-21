import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart, Bar, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info, RefreshCw, TrendingUp } from 'lucide-react';
import { useDataSource } from '../components/DataOnboarding';
import Layout from '../components/Layout';
import { Badge, Button, Card, ProgressBar, SectionHeader } from '../components/ui';
import { pushGlobalStats, updateStats } from '../lib/analytics';
import { getLIMEExplanation, getModelMetrics, getSHAPExplanation } from '../lib/api';
import { getDefaultWorkspaceContext, getSessionSampleCustomer, getTrainingSession, getWorkspaceContext } from '../lib/workspace';

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

const DEMO_METRICS = [
  { metric: 'accuracy', value: 0.798 },
  { metric: 'auc_roc', value: 0.847 },
  { metric: 'precision', value: 0.652 },
  { metric: 'recall', value: 0.549 },
  { metric: 'f1', value: 0.596 },
];

const SAMPLE_CUSTOMER = {
  gender: 'Male',
  SeniorCitizen: '0',
  Partner: 'Yes',
  Dependents: 'No',
  tenure: 12,
  PhoneService: 'Yes',
  MultipleLines: 'No',
  InternetService: 'Fiber optic',
  OnlineSecurity: 'No',
  OnlineBackup: 'Yes',
  DeviceProtection: 'No',
  TechSupport: 'No',
  StreamingTV: 'Yes',
  StreamingMovies: 'No',
  Contract: 'Month-to-month',
  PaperlessBilling: 'Yes',
  PaymentMethod: 'Electronic check',
  MonthlyCharges: 70.35,
  TotalCharges: 844.2,
};

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

const FEATURE_LABELS = {
  'Contract_Month-to-month': 'Month-to-month contract',
  tenure: 'Tenure',
  MonthlyCharges: 'Monthly charges',
  InternetService_Fiber: 'Fiber internet service',
  TechSupport_No: 'No tech support',
  OnlineSecurity_No: 'No online security',
  PaperlessBilling_Yes: 'Paperless billing',
  Partner_No: 'No partner on account',
  TotalCharges: 'Total charges',
  PaymentMethod_Check: 'Check payment method',
};

function formatFeatureLabel(feature = '') {
  if (FEATURE_LABELS[feature]) return FEATURE_LABELS[feature];

  return String(feature).replace(/_/g, ' ').trim();
}

function getFeatureHint(feature = '') {
  const glossaryKey = feature?.split('_')[0];
  return FEATURE_GLOSSARY[glossaryKey] || 'Model signal in the current churn explanation view.';
}

function InsightsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const datum = payload[0].payload;

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-3 text-xs shadow-elevated">
      <p className="mb-1 text-white">{formatFeatureLabel(datum.feature)}</p>
      <p className={`font-semibold ${datum.direction === 'positive' ? 'text-rose-500' : 'text-emerald-500'}`}>
        SHAP: {datum.shap > 0 ? '+' : ''}{datum.shap?.toFixed(4)}
      </p>
      <p className="mt-1 max-w-48 text-slate-500">{getFeatureHint(datum.feature)}</p>
    </div>
  );
}

function ShapSignalList({ data = [] }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={`${item.feature}-${index}`} className="rounded-2xl border border-[color:var(--border)] bg-white/3 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{formatFeatureLabel(item.feature)}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{getFeatureHint(item.feature)}</p>
            </div>
            <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              item.direction === 'positive'
                ? 'bg-rose-500/10 text-rose-500'
                : 'bg-emerald-500/10 text-emerald-500'
            }`}>
              {item.direction === 'positive' ? 'Churn risk' : 'Retention'}
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Signal strength</span>
            <span className={`text-xs font-mono ${item.direction === 'positive' ? 'text-rose-500' : 'text-emerald-500'}`}>
              {item.shap > 0 ? '+' : ''}{item.shap.toFixed(3)}
            </span>
          </div>
          <ProgressBar value={Math.abs(item.shap)} max={0.5} color={item.direction === 'positive' ? 'rose' : 'emerald'} showValue={false} />
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const dataSource = useDataSource();
  const [tab, setTab] = useState('shap');
  const [shapData, setShapData] = useState(DEMO_SHAP);
  const [limeData, setLimeData] = useState(DEMO_LIME);
  const [modelMetrics, setModelMetrics] = useState(DEMO_METRICS);
  const [loading, setLoading] = useState(false);
  const [workspaceContext, setWorkspaceContext] = useState(getDefaultWorkspaceContext());
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [hasCustomModel, setHasCustomModel] = useState(false);
  const [sessionSampleCustomer, setSessionSampleCustomer] = useState(SAMPLE_CUSTOMER);

  useEffect(() => {
    setWorkspaceContext(getWorkspaceContext());
  }, []);

  useEffect(() => {
    const trainingSession = getTrainingSession();
    setHasCustomModel(Boolean(trainingSession?.sessionModel?.artifact));

    if (dataSource === 'custom') {
      setSessionSampleCustomer(getSessionSampleCustomer() || SAMPLE_CUSTOMER);
    } else {
      setSessionSampleCustomer(SAMPLE_CUSTOMER);
    }
  }, [dataSource]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const updateViewport = () => setIsCompactViewport(mediaQuery.matches);

    updateViewport();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, []);

  const refreshExplanations = async () => {
    if (dataSource === 'custom' && !hasCustomModel) {
      setShapData([]);
      setLimeData([]);
      setModelMetrics([]);
      return;
    }

    setLoading(true);

    try {
      setWorkspaceContext(getWorkspaceContext());
      const [shapResponse, limeResponse, metricsResponse] = await Promise.all([
        getSHAPExplanation(),
        getLIMEExplanation(sessionSampleCustomer),
        getModelMetrics(),
      ]);

      setShapData(Array.isArray(shapResponse?.shap_values) && shapResponse.shap_values.length ? shapResponse.shap_values : DEMO_SHAP);
      setLimeData(Array.isArray(limeResponse?.lime_values) && limeResponse.lime_values.length ? limeResponse.lime_values : DEMO_LIME);
      setModelMetrics(Array.isArray(metricsResponse?.metrics) && metricsResponse.metrics.length ? metricsResponse.metrics : DEMO_METRICS);
      updateStats({ shapAnalysisRun: 1 });
      pushGlobalStats({ shapAnalysisRun: 1 });
    } catch {
      if (dataSource === 'custom') {
        setShapData([]);
        setLimeData([]);
        setModelMetrics([]);
      } else {
        setShapData(DEMO_SHAP);
        setLimeData(DEMO_LIME);
        setModelMetrics(DEMO_METRICS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshExplanations();
  }, [dataSource, hasCustomModel, sessionSampleCustomer]);

  const topPositiveDrivers = shapData.filter((item) => item.direction === 'positive').slice(0, 5);
  const strongestPositiveDriver = shapData.find((item) => item.direction === 'positive');
  const strongestNegativeDriver = shapData.find((item) => item.direction === 'negative');
  const topAbsoluteSignals = [...shapData]
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
    .slice(0, 3);
  const metricMap = modelMetrics.reduce((acc, item) => {
    acc[item.metric] = item.value;
    return acc;
  }, {});

  return (
    <Layout title="Insights">
      <SectionHeader
        title="Explainability Insights"
        subtitle="Review the biggest churn drivers using SHAP and LIME with the active data source and model context in view."
        icon={TrendingUp}
        action={
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
            <Badge color={workspaceContext.dataSource === 'custom' ? 'purple' : 'slate'}>
              {workspaceContext.dataSource === 'custom' ? 'Custom dataset session' : 'Built-in model'}
            </Badge>
            <Badge color={workspaceContext.modelStatus === 'active' ? 'emerald' : 'amber'}>
              {workspaceContext.modelLabel || 'Model pending'}
            </Badge>
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={refreshExplanations} loading={loading} className="w-full sm:w-auto">
              Refresh View
            </Button>
          </div>
        }
      />

      {dataSource === 'custom' && !hasCustomModel ? (
        <Card className="mb-6 border-amber-500/20 bg-amber-500/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-400">Train your custom session model first</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Explainability for the custom route is generated from your session-trained model, so this page will stay tied to your own uploaded data instead of falling back to the app default.
              </p>
            </div>
            <Link href="/train">
              <Button icon={TrendingUp}>Go To Training</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="mb-6 grid w-full max-w-xl grid-cols-3 gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-1">
        {['shap', 'lime', 'summary'].map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            type="button"
            className={`rounded-xl px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-all duration-200 sm:px-4 sm:text-sm ${
              tab === mode
                ? 'border border-sky-500/20 bg-sky-500/10 text-sky-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.95fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-400">Insight Context</div>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">Interpret the model with commercial context in view</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                This page ties model explainability to the currently selected dataset and confirmed model so teams can move from raw feature impact to clear retention action.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={workspaceContext.dataSource === 'custom' ? 'purple' : 'cyan'}>
                {workspaceContext.dataSource === 'custom' ? 'Custom session data' : 'Default dataset'}
              </Badge>
              <Badge color={workspaceContext.modelStatus === 'active' ? 'emerald' : 'amber'}>
                {workspaceContext.modelStatus === 'active' ? 'Model confirmed' : 'Model pending'}
              </Badge>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dataset</div>
              <div className="mt-2 text-sm font-semibold text-white">{workspaceContext.datasetName}</div>
              <div className="mt-1 text-xs text-slate-500">Current source for insight interpretation</div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Model</div>
              <div className="mt-2 text-sm font-semibold text-white">{workspaceContext.modelLabel}</div>
              <div className="mt-1 text-xs text-slate-500">Explainer anchored to the active model choice</div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Strongest churn driver</div>
              <div className="mt-2 text-sm font-semibold text-white">
                {strongestPositiveDriver ? formatFeatureLabel(strongestPositiveDriver.feature) : 'Not available'}
              </div>
              <div className="mt-1 text-xs text-rose-500">
                {strongestPositiveDriver ? `+${strongestPositiveDriver.shap.toFixed(3)} SHAP` : 'Awaiting signal'}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Best retention signal</div>
              <div className="mt-2 text-sm font-semibold text-white">
                {strongestNegativeDriver ? formatFeatureLabel(strongestNegativeDriver.feature) : 'Not available'}
              </div>
              <div className="mt-1 text-xs text-emerald-500">
                {strongestNegativeDriver ? `${strongestNegativeDriver.shap.toFixed(3)} SHAP` : 'Awaiting signal'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-violet-400">Executive Readout</div>
          <h3 className="mt-2 font-display text-lg font-semibold text-white">What matters most right now</h3>
          <div className="mt-4 space-y-4">
            {topAbsoluteSignals.map((item, index) => (
              <div key={`${item.feature}-${index}`} className="rounded-2xl border border-[color:var(--border)] bg-white/3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{formatFeatureLabel(item.feature)}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{getFeatureHint(item.feature)}</p>
                  </div>
                  <span className={`text-xs font-mono ${item.direction === 'positive' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {item.shap > 0 ? '+' : ''}{item.shap.toFixed(3)}
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={Math.abs(item.shap)} max={0.5} color={item.direction === 'positive' ? 'rose' : 'emerald'} showValue={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {tab === 'shap' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">SHAP Feature Importance</h3>
                <p className="mt-0.5 text-xs text-slate-500">Positive values push predictions toward churn. Negative values pull them toward retention.</p>
              </div>
              <Badge color="cyan">SHAP</Badge>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Strongest churn driver</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {strongestPositiveDriver ? formatFeatureLabel(strongestPositiveDriver.feature) : 'Not available'}
                </div>
                <div className="mt-1 text-xs text-rose-500">
                  {strongestPositiveDriver ? `+${strongestPositiveDriver.shap.toFixed(3)} SHAP` : 'No positive driver'}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Best retention signal</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {strongestNegativeDriver ? formatFeatureLabel(strongestNegativeDriver.feature) : 'Not available'}
                </div>
                <div className="mt-1 text-xs text-emerald-500">
                  {strongestNegativeDriver ? `${strongestNegativeDriver.shap.toFixed(3)} SHAP` : 'No negative driver'}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Signals reviewed</div>
                <div className="mt-2 text-2xl font-semibold text-white">{shapData.length}</div>
                <div className="mt-1 text-xs text-slate-500">Feature effects in the current model summary</div>
              </div>
            </div>

            {isCompactViewport ? (
              <ShapSignalList data={shapData} />
            ) : (
              <div className="insights-chart-scroll">
                <div className="insights-chart-stage">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart
                      data={shapData}
                      layout="vertical"
                      margin={{ left: 156, right: 20, top: 8, bottom: 8 }}
                    >
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        domain={[-0.4, 0.5]}
                      />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(value) => formatFeatureLabel(value)}
                        width={156}
                      />
                      <ReferenceLine x={0} stroke="#334155" strokeWidth={1} />
                      <Tooltip cursor={{ fill: 'transparent' }} content={<InsightsTooltip />} />
                      <Bar dataKey="shap" radius={[0, 8, 8, 0]} barSize={24}>
                        {shapData.map((item, index) => (
                          <Cell key={index} fill={item.direction === 'positive' ? '#f43f5e' : '#10b981'} fillOpacity={0.84} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
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

            <Card className="border-emerald-500/15 bg-emerald-500/6 p-5">
              <h4 className="mb-2 font-display text-sm font-semibold text-white">Recommended reading approach</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Start with the strongest positive signals to understand where churn pressure is building, then compare them with the strongest negative signals to see which customer protections are already working.
              </p>
            </Card>

            <Card className="p-5">
              <h4 className="font-display mb-3 text-sm font-semibold text-white">Top Churn Risks</h4>
              <div className="space-y-3">
                {topPositiveDrivers.map((item, index) => (
                  <div key={`${item.feature}-${index}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="truncate text-xs text-slate-400">{formatFeatureLabel(item.feature)}</span>
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
          <Card className="p-5 sm:p-6">
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

          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
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
              { title: 'Model Accuracy', value: `${((metricMap.accuracy ?? 0.798) * 100).toFixed(1)}%`, sub: 'Test set performance' },
              { title: 'AUC-ROC Score', value: (metricMap.auc_roc ?? 0.847).toFixed(3), sub: 'Overall discrimination strength' },
              { title: 'Precision', value: `${((metricMap.precision ?? 0.652) * 100).toFixed(1)}%`, sub: 'Churner prediction quality' },
              { title: 'Recall', value: `${((metricMap.recall ?? 0.549) * 100).toFixed(1)}%`, sub: 'Churner detection rate' },
              { title: 'F1 Score', value: (metricMap.f1 ?? 0.596).toFixed(3), sub: 'Balanced precision and recall' },
              { title: 'Features Used', value: String(shapData.length || 0), sub: 'Signals returned by the explainer' },
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
                    <div className="truncate text-xs text-slate-300">{formatFeatureLabel(item.feature)}</div>
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
