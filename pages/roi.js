import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Badge } from '../components/ui';
import {
  ArrowUpRight,
  Calculator,
  DollarSign,
  Gauge,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateROI } from '../lib/api';
import { addSessionEvent, pushGlobalStats, updateStats } from '../lib/analytics';

// --- CURRENCY CONFIGURATION ---
const CURRENCIES = [
  { code: 'USD', locale: 'en-US', label: '$ USD (Dollar)' },
  { code: 'NGN', locale: 'en-NG', label: '₦ NGN (Naira)' },
  { code: 'EUR', locale: 'en-GB', label: '€ EUR (Euro)' },
  { code: 'GBP', locale: 'en-GB', label: '£ GBP (Pound)' },
  { code: 'KES', locale: 'en-KE', label: 'KSh KES (Shilling)' },
  { code: 'ZAR', locale: 'en-ZA', label: 'R ZAR (Rand)' },
];

const PARAMETER_FIELDS = [
  { key: 'totalCustomers', label: 'Total Customers', step: 100, min: 100, helper: 'Active base in target segment', currency: false },
  { key: 'avgARPU', label: 'Average Monthly ARPU', step: 50, min: 10, helper: 'Monthly revenue per customer', currency: true },
  { key: 'avgCLV', label: 'Average Customer Lifetime Value', step: 500, min: 500, helper: 'Estimated long-term customer value', currency: true },
  { key: 'retentionCostPerCustomer', label: 'Retention Cost Per Customer', step: 50, min: 0, helper: 'Expected cost of each save action', currency: true },
];

const KPI_THEMES = {
  cyan: {
    iconWrap: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-400',
    value: 'text-cyan-300',
    glow: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
  },
  emerald: {
    iconWrap: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400',
    value: 'text-emerald-300',
    glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  },
  rose: {
    iconWrap: 'border-rose-400/20 bg-rose-400/10 text-rose-400',
    value: 'text-rose-300',
    glow: 'from-rose-500/20 via-rose-500/5 to-transparent',
  },
  amber: {
    iconWrap: 'border-amber-400/20 bg-amber-400/10 text-amber-400',
    value: 'text-amber-300',
    glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
  },
  purple: {
    iconWrap: 'border-violet-400/20 bg-violet-400/10 text-violet-400',
    value: 'text-violet-300',
    glow: 'from-violet-500/20 via-violet-500/5 to-transparent',
  },
};

const SCENARIO_BAR_COLORS = ['#f59e0b', '#22d3ee', '#10b981'];

function RangeControl({ label, value, onChange, min, max, step, color = 'cyan', helper }) {
  const isEmerald = color === 'emerald';
  const pillClass = isEmerald ? 'bg-emerald-500/15 text-emerald-300' : 'bg-cyan-500/15 text-cyan-300';
  const accentClass = isEmerald ? 'accent-emerald-500' : 'accent-cyan-500';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 transition-all hover:border-white/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          <div className="mt-0.5 text-xs text-slate-400">{helper}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-mono font-medium ${pillClass}`}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className={`w-full cursor-pointer ${accentClass}`}
      />
      <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500">
        <span>{(Number(min) * 100).toFixed(0)}%</span>
        <span>{(Number(max) * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function KpiCard({ item }) {
  const theme = KPI_THEMES[item.color] || KPI_THEMES.cyan;
  const Icon = item.icon;

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/50 p-4 shadow-lg backdrop-blur-sm transition-all hover:border-white/20 sm:p-5">
      <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${theme.glow} opacity-50`} />
      <div className="relative z-10 flex-1">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className={`shrink-0 rounded-xl border p-2 shadow-sm ${theme.iconWrap}`}>
            <Icon className="h-4 w-4" />
          </div>
          <Badge color={item.badgeColor || 'slate'} className="shrink-0">{item.badge}</Badge>
        </div>

        <div 
          className={`mt-1 text-2xl font-bold leading-tight tracking-tight lg:text-[1.75rem] ${theme.value}`}
          style={{ wordBreak: 'break-word' }}
        >
          {item.value}
        </div>
        
        <div className="mt-1.5 text-[13px] font-semibold text-slate-200">{item.label}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.helper}</p>
      </div>

      {item.subValue && (
        <div className="relative z-10 mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-medium leading-snug text-slate-300">
          {item.subValue}
        </div>
      )}
    </div>
  );
}

export default function ROIPage() {
  // --- STATE ---
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [isLocatingCurrency, setIsLocatingCurrency] = useState(true);
  
  const [params, setParams] = useState({
    totalCustomers: 10000,
    churnRate: 0.20,
    avgARPU: 8500,
    retentionCostPerCustomer: 1500,
    retentionRate: 0.80, // Inverse of Churn
    avgCLV: 102000,
  });
  
  const [result, setResult] = useState(null);
  const [roiError, setRoiError] = useState(null);

  // --- IP GEOLOCATION EFFECT ---
  useEffect(() => {
    let isMounted = true;
    
    const detectUserCurrency = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('IP Fetch failed');
        
        const data = await response.json();
        
        if (isMounted && data.currency) {
          const localCurrency = CURRENCIES.find(c => c.code === data.currency);
          if (localCurrency) {
            setCurrency(localCurrency);
          } else {
            const fallback = CURRENCIES.find(c => c.code === 'USD');
            if (fallback) setCurrency(fallback);
          }
        }
      } catch (error) {
        console.warn('Could not auto-detect currency from IP. Falling back to default.', error);
      } finally {
        if (isMounted) setIsLocatingCurrency(false);
      }
    };

    detectUserCurrency();

    return () => { isMounted = false; };
  }, []);

  // --- FORMATTERS ---
  const fmt = (value, isCurrency = true) => {
    if (isCurrency) {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        maximumFractionDigits: 0,
      }).format(value || 0);
    }
    return new Intl.NumberFormat().format(Math.round(value || 0));
  };

  const fmtCompact = (value) => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value || 0);
  };

  // --- HANDLERS ---
  const set = (key, value) => setParams((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));

  // Synchronize Churn and Retention Rates to equal 100%
  const handleRateSync = (key, value) => {
    const val = parseFloat(value) || 0;
    if (key === 'churnRate') {
      setParams((prev) => ({ 
        ...prev, 
        churnRate: val, 
        retentionRate: parseFloat((1 - val).toFixed(2)) 
      }));
    } else if (key === 'retentionRate') {
      setParams((prev) => ({ 
        ...prev, 
        retentionRate: val, 
        churnRate: parseFloat((1 - val).toFixed(2)) 
      }));
    }
  };

  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]); 

  const calculate = async () => {
    const { totalCustomers, churnRate, avgARPU, retentionCostPerCustomer, retentionRate, avgCLV } = params;
    try {
      const data = await calculateROI({
        total_customers: totalCustomers,
        churn_rate: churnRate,
        avg_arpu: avgARPU,
        retention_cost: retentionCostPerCustomer,
        success_rate: retentionRate, // Passed to backend mapping
        avg_clv: avgCLV,
      });

      setResult({
        ...data,
        churningCustomers: data.churning_customers,
        revenueAtRisk: data.revenue_at_risk,
        totalRetentionCost: data.total_retention_cost,
        savedCustomers: data.saved_customers,
        revenueRecovered: data.revenue_recovered,
        clvSaved: data.clv_saved,
        netROI: data.net_roi,
        roiPercent: data.roi_percent,
        paybackMonths: data.payback_months,
      });
      setRoiError(null);
      updateStats({ roiCalculations: 1 });
      pushGlobalStats({ roiCalculations: 1 });
      addSessionEvent({ type: 'roi', customers: totalCustomers });
    } catch {
      setRoiError('ROI service unavailable right now. Showing no result until the backend responds again.');
      setResult(null);
    }
  };

  // --- COMPUTED DATA ---
  const monthlyProjection = useMemo(() => {
    if (!result) return [];
    return Array.from({ length: 12 }, (_, index) => ({
      month: `M${index + 1}`,
      cumRevenue: Math.round((result.revenueRecovered / 12) * (index + 1)),
      cumCost: Math.round(result.totalRetentionCost + result.totalRetentionCost * 0.05 * index),
    }));
  }, [result]);

  const scenarioData = useMemo(() => {
    // Dynamic scenarios based on current retention rate
    const consRate = Math.max(0, params.retentionRate - 0.1);
    const optRate = Math.min(1, params.retentionRate + 0.1);

    return [
      {
        scenario: 'Conservative',
        shortLabel: 'Low',
        successLabel: `${Math.round(consRate * 100)}% retention`,
        netROI: result ? Math.round(result.churningCustomers * consRate * params.avgARPU * 12 - result.totalRetentionCost) : 0,
      },
      {
        scenario: 'Base Case',
        shortLabel: 'Base',
        successLabel: `${Math.round(params.retentionRate * 100)}% retention`,
        netROI: result?.netROI || 0,
      },
      {
        scenario: 'Optimistic',
        shortLabel: 'High',
        successLabel: `${Math.round(optRate * 100)}% retention`,
        netROI: result ? Math.round(result.churningCustomers * optRate * params.avgARPU * 12 - result.totalRetentionCost) : 0,
      },
    ];
  }, [params.avgARPU, params.retentionRate, result]);

  // --- CHART TOOLTIPS ---
  const ScenarioTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs shadow-xl">
        <div className="mb-2 font-semibold text-white">{label}</div>
        <div className="font-medium text-cyan-300">Net ROI: {fmt(payload[0].value)}</div>
      </div>
    );
  };

  const ProjectionTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs shadow-xl">
        <div className="mb-2 font-semibold text-white">{label}</div>
        {payload.map((item) => (
          <div key={item.name} className="mb-1 font-medium" style={{ color: item.color }}>
            {item.name}: {fmt(item.value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout title="Business ROI">
      <SectionHeader
        title="Business Impact & ROI Calculator"
        subtitle="Stress-test retention economics with a highly responsive planning view and executive summary."
        icon={DollarSign}
      />

      {/* Main Layout Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(20rem,320px)_1fr] xl:grid-cols-[380px_1fr]">
        
        {/* LEFT PANEL: INPUTS */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col gap-5 border-white/10 bg-slate-900/40 p-5 backdrop-blur-md">
            
            {/* Header & Currency Picker */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                  </div>
                  <Badge color="cyan">Planning Inputs</Badge>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">Build the retention case</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Tune your revenue and campaign assumptions. Set your local currency below.
                </p>
              </div>

              {/* Currency Selector */}
              <div className="relative mt-2">
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Globe className={`h-3.5 w-3.5 ${isLocatingCurrency ? 'animate-pulse text-cyan-400' : ''}`} /> 
                  Base Currency {isLocatingCurrency && '(Detecting...)'}
                </label>
                <select
                  className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  value={currency.code}
                  onChange={(e) => setCurrency(CURRENCIES.find((c) => c.code === e.target.value))}
                  disabled={isLocatingCurrency}
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur.code} value={cur.code} className="bg-slate-900">
                      {cur.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute bottom-0 right-0 flex h-[42px] w-10 items-center justify-center text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Churn Rate', value: `${(params.churnRate * 100).toFixed(0)}%` },
                { label: 'Retention Rate', value: `${(params.retentionRate * 100).toFixed(0)}%` },
                { label: 'ARPU', value: fmtCompact(params.avgARPU) },
                { label: 'Base', value: fmt(params.totalCustomers, false) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-black/20 p-2.5 transition-colors hover:bg-black/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</div>
                  <div className="mt-1 text-sm font-bold text-white sm:text-base" style={{ wordBreak: 'break-word' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Number Inputs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {PARAMETER_FIELDS.map((field) => (
                <div key={field.key} className="rounded-2xl border border-white/10 bg-black/20 p-3.5 transition-all hover:border-white/20">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">{field.label}</label>
                  <input
                    type="number"
                    step={field.step}
                    min={field.min}
                    value={params[field.key]}
                    onChange={(event) => set(field.key, event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-white placeholder-slate-500 transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <div className="mt-2 text-[10px] font-medium leading-tight text-slate-500">
                    <span className="text-slate-300">{fmt(params[field.key], field.currency)}</span> • {field.helper}
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Sync Range Sliders */}
            <div className="grid gap-3">
              <RangeControl
                label="Baseline Churn Rate"
                value={params.churnRate}
                onChange={(event) => handleRateSync('churnRate', event.target.value)}
                min="0"
                max="1"
                step="0.01"
                helper="Percentage of customers leaving."
              />
              <RangeControl
                label="Retention Rate"
                value={params.retentionRate}
                onChange={(event) => handleRateSync('retentionRate', event.target.value)}
                min="0"
                max="1"
                step="0.01"
                color="emerald"
                helper="Percentage of customers staying."
              />
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: RESULTS & CHARTS */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {roiError && (
            <Card className="border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-amber-400">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold tracking-wide">ROI Service Unavailable</span>
              </div>
              <p className="mt-2 text-sm text-amber-200/70">{roiError}</p>
            </Card>
          )}

          {result && (
            <>
              {/* Executive Snapshot */}
              <Card
                className={`overflow-hidden border border-white/10 p-5 shadow-xl backdrop-blur-md sm:p-7 ${
                  result.roiPercent >= 0 ? 'bg-emerald-900/10' : 'bg-rose-900/10'
                }`}
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge color={result.roiPercent >= 0 ? 'emerald' : 'rose'} className="font-bold shadow-sm">
                          {result.roiPercent >= 0 ? 'Positive Return Scenario' : 'Negative Return Scenario'}
                        </Badge>
                        <Badge color="slate" className="shadow-sm">Live Analysis</Badge>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Executive Snapshot</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                        Your current assumptions suggest {result.roiPercent >= 0 ? 'a commercially viable retention strategy with measurable upside.' : 'the need to fundamentally rebalance targeting, cost, or retention rates before scaling this campaign.'}
                      </p>
                    </div>

                    <div className="min-w-[160px] shrink-0 rounded-3xl border border-white/10 bg-black/20 p-4 shadow-inner sm:p-5">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Net ROI (%)</div>
                      <div className={`mt-1.5 text-3xl font-extrabold tracking-tighter sm:text-4xl lg:text-5xl ${result.roiPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.roiPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Net Profit/Loss', value: fmt(result.netROI), helper: 'Total value generated after costs', icon: ArrowUpRight },
                      { label: 'Payback', value: `${result.paybackMonths.toFixed(1)} mo`, helper: 'Estimated timeline to break even', icon: Gauge },
                      { label: 'CLV Preserved', value: fmtCompact(result.clvSaved), helper: 'Future lifetime value retained', icon: ShieldCheck },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col rounded-[20px] border border-white/5 bg-white/5 p-4">
                        <div className="mb-2.5 flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0 text-cyan-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-[11px]">{item.label}</span>
                        </div>
                        <div className="text-lg font-bold leading-tight text-white sm:text-xl" style={{ wordBreak: 'break-word' }}>
                          {item.value}
                        </div>
                        <div className="mt-1 text-[11px] leading-snug text-slate-400">{item.helper}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Revenue at Risk',
                    value: fmt(result.revenueAtRisk),
                    helper: 'Value exposed if no action is taken.',
                    subValue: `${fmtCompact(result.revenueAtRisk)} exposed currently`,
                    icon: TrendingUp,
                    color: 'rose',
                    badge: 'Exposure',
                    badgeColor: 'rose',
                  },
                  {
                    label: 'Revenue Recovered',
                    value: fmt(result.revenueRecovered),
                    helper: 'Expected revenue preserved.',
                    subValue: `${(result.totalRetentionCost ? result.revenueRecovered / result.totalRetentionCost : 0).toFixed(2)}x spend recovery`,
                    icon: Wallet,
                    color: 'cyan',
                    badge: 'Recovery',
                    badgeColor: 'cyan',
                  },
                  {
                    label: 'Customers Saved',
                    value: fmt(result.savedCustomers, false),
                    helper: 'Expected retained accounts.',
                    subValue: `${params.totalCustomers ? ((result.savedCustomers / params.totalCustomers) * 100).toFixed(1) : '0.0'}% of active base`,
                    icon: Users,
                    color: 'emerald',
                    badge: 'Retention',
                    badgeColor: 'emerald',
                  },
                  {
                    label: 'Intervention Cost',
                    value: fmt(result.totalRetentionCost),
                    helper: 'Total cost to execute campaign.',
                    subValue: 'Sunk cost regardless of retention',
                    icon: Calculator,
                    color: 'amber',
                    badge: 'Expense',
                    badgeColor: 'amber',
                  },
                ].map((item) => (
                  <KpiCard key={item.label} item={item} />
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                
                {/* Scenario Bar Chart */}
                <Card className="flex flex-col border-white/10 bg-slate-900/40 p-5">
                  <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-base font-bold tracking-tight text-white">Scenario Sensitivity</h4>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Compare outcomes based on low, base, and high retention rates.
                      </p>
                    </div>
                    <Badge color="amber" className="shrink-0 self-start">Projection</Badge>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {scenarioData.map((item) => (
                      <div key={item.scenario} className="rounded-2xl border border-white/5 bg-black/20 p-3.5">
                        <div className="text-[13px] font-bold text-white">{item.scenario}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">{item.successLabel}</div>
                        <div 
                          className={`mt-2.5 text-lg font-extrabold tracking-tight ${item.netROI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                          style={{ wordBreak: 'break-word' }}
                        >
                          {fmtCompact(item.netROI)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-56 min-h-[220px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scenarioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                        <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} dy={10} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickFormatter={(value) => `${currency.symbol}${(value / 1e6).toFixed(1)}M`}
                          dx={-10}
                        />
                        <Tooltip cursor={{ fill: '#ffffff05' }} content={<ScenarioTooltip />} />
                        <Bar dataKey="netROI" radius={[6, 6, 0, 0]} maxBarSize={50}>
                          {scenarioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SCENARIO_BAR_COLORS[index % SCENARIO_BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Cashflow Line Chart */}
                <Card className="flex flex-col border-white/10 bg-slate-900/40 p-5">
                  <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-base font-bold tracking-tight text-white">12-Month Recovery Trajectory</h4>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Track cumulative revenue versus cumulative costs.
                      </p>
                    </div>
                    <Badge color="purple" className="shrink-0 self-start">Cashflow</Badge>
                  </div>

                  <div className="mt-auto h-56 min-h-[220px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyProjection} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} dy={10} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickFormatter={(value) => `${currency.symbol}${(value / 1e6).toFixed(1)}M`}
                          dx={-10}
                        />
                        <Tooltip content={<ProjectionTooltip />} />
                        <Line type="monotone" dataKey="cumRevenue" stroke="#22d3ee" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} name="Revenue" />
                        <Line type="monotone" dataKey="cumCost" stroke="#f43f5e" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} name="Cost" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}