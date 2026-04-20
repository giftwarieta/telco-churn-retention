import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, Badge } from '../components/ui';
import { DollarSign, TrendingUp, Users, Calculator, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { calculateROI } from '../lib/api';
import { addSessionEvent, pushGlobalStats, updateStats } from '../lib/analytics';

function fmt(n, isCurrency = true) {
  if (isCurrency) return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
  return new Intl.NumberFormat().format(Math.round(n));
}

export default function ROIPage() {
  const [params, setParams] = useState({
    totalCustomers: 10000,
    churnRate: 0.22,
    avgARPU: 8500,
    retentionCostPerCustomer: 1500,
    successRate: 0.35,
    avgCLV: 102000,
  });
  const [result, setResult] = useState(null);
  const [roiError, setRoiError] = useState(null);

  const set = (k, v) => setParams(p => ({ ...p, [k]: parseFloat(v) || 0 }));

  useEffect(() => {
    calculate();
  }, [params]);

  const calculate = async () => {
    const {
      totalCustomers, churnRate, avgARPU, retentionCostPerCustomer, successRate, avgCLV
    } = params;

    try {
      const data = await calculateROI({
        total_customers: totalCustomers,
        churn_rate: churnRate,
        avg_arpu: avgARPU,
        retention_cost: retentionCostPerCustomer,
        success_rate: successRate,
        avg_clv: avgCLV,
      });

      setResult({
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

  const monthlyProjection = result ? Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    cumRevenue: Math.round((result.revenueRecovered / 12) * (i + 1)),
    cumCost: Math.round(result.totalRetentionCost + (result.totalRetentionCost * 0.05 * i)),
  })) : [];

  const scenarioData = [
    { scenario: 'Conservative\n(20% success)', netROI: result ? Math.round((result.churningCustomers * 0.20 * params.avgARPU * 12) - result.totalRetentionCost) : 0 },
    { scenario: 'Base Case\n(35% success)', netROI: result?.netROI || 0 },
    { scenario: 'Optimistic\n(50% success)', netROI: result ? Math.round((result.churningCustomers * 0.50 * params.avgARPU * 12) - result.totalRetentionCost) : 0 },
  ];

  return (
    <Layout title="Business ROI">
      <SectionHeader title="Business Impact & ROI Calculator" subtitle="Model the revenue impact of your churn reduction strategy" icon={DollarSign} />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input panel */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-semibold text-white">Parameters</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: 'totalCustomers', label: 'Total Customers', step: 100, min: 100 },
              { key: 'avgARPU', label: 'Avg Monthly ARPU (₦)', step: 500, min: 100 },
              { key: 'avgCLV', label: 'Avg Customer Lifetime Value (₦)', step: 1000, min: 1000 },
              { key: 'retentionCostPerCustomer', label: 'Retention Cost per Customer (₦)', step: 100, min: 0 },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
                <input
                  type="number" step={f.step} min={f.min}
                  value={params[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Churn Rate: <span className="text-cyan-400 font-mono">{(params.churnRate * 100).toFixed(0)}%</span>
              </label>
              <input type="range" min="0.05" max="0.60" step="0.01"
                value={params.churnRate} onChange={e => set('churnRate', e.target.value)}
                className="w-full accent-cyan-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Retention Success Rate: <span className="text-emerald-400 font-mono">{(params.successRate * 100).toFixed(0)}%</span>
              </label>
              <input type="range" min="0.10" max="0.70" step="0.05"
                value={params.successRate} onChange={e => set('successRate', e.target.value)}
                className="w-full accent-emerald-500" />
            </div>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {roiError ? (
            <Card className="border-amber-500/20 bg-amber-500/8 p-5">
              <div className="text-sm font-semibold text-amber-400">ROI service unavailable</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{roiError}</p>
            </Card>
          ) : null}
          {result && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Revenue at Risk (Annual)', value: fmt(result.revenueAtRisk), color: 'rose', icon: TrendingUp },
                  { label: 'Customers to Save', value: fmt(result.savedCustomers, false), color: 'emerald', icon: Users },
                  { label: 'Revenue Recovered', value: fmt(result.revenueRecovered), color: 'cyan', icon: DollarSign },
                  { label: 'Net ROI', value: fmt(result.netROI), color: result.netROI >= 0 ? 'emerald' : 'rose', icon: Calculator },
                ].map(item => (
                  <Card key={item.label} className={`p-4 border-${item.color}-500/20`}>
                    <div className={`stat-number text-xl font-bold mb-1 ${
                      item.color === 'cyan' ? 'text-cyan-400' : item.color === 'emerald' ? 'text-emerald-400' :
                      item.color === 'rose' ? 'text-rose-400' : item.color === 'amber' ? 'text-amber-400' : 'text-white'
                    }`}>{item.value}</div>
                    <div className="text-xs text-slate-400">{item.label}</div>
                  </Card>
                ))}
              </div>

              {/* ROI highlight */}
              <Card className={`p-5 ${result.roiPercent >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Return on Investment</div>
                    <div className={`stat-number text-4xl font-bold ${result.roiPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {result.roiPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Payback Period</div>
                    <div className="stat-number text-2xl font-bold text-white">{result.paybackMonths.toFixed(1)} mo</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">CLV Preserved</div>
                    <div className="stat-number text-2xl font-bold text-purple-400">{fmt(result.clvSaved)}</div>
                  </div>
                </div>
              </Card>

              {/* Scenario analysis */}
              <Card className="p-5">
                <h4 className="font-display font-semibold text-white mb-4 text-sm">Scenario Analysis</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={scenarioData}>
                    <XAxis dataKey="scenario" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => `₦${(v/1e6).toFixed(1)}M`} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#0D1526', border: '1px solid #1E2D45', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(v) => [fmt(v), 'Net ROI']} />
                    <Bar dataKey="netROI" radius={[6, 6, 0, 0]} fill="#06B6D4" fillOpacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Monthly projection */}
              <Card className="p-5">
                <h4 className="font-display font-semibold text-white mb-4 text-sm">12-Month Revenue Recovery Projection</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={monthlyProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `₦${(v/1e6).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid #1E2D45', borderRadius: '8px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="cumRevenue" stroke="#06B6D4" strokeWidth={2} dot={false} name="Recovered Revenue" />
                    <Line type="monotone" dataKey="cumCost" stroke="#F43F5E" strokeWidth={2} dot={false} name="Total Cost" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
