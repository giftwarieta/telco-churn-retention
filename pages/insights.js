import { useState } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, Badge, ProgressBar, EmptyState } from '../components/ui';
import { TrendingUp, BarChart2, Layers, Info, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { getSHAPExplanation } from '../lib/api';
import { updateStats } from '../lib/analytics';
import toast from 'react-hot-toast';

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
  'Contract': 'Type of contract term: Month-to-month, One year, Two year',
  'tenure': 'Number of months the customer has stayed with the company',
  'MonthlyCharges': 'The amount charged to the customer monthly (USD)',
  'TotalCharges': 'Total amount charged to the customer over their entire tenure',
  'InternetService': 'Customer\'s internet service provider type',
  'TechSupport': 'Whether customer has tech support subscription',
  'OnlineSecurity': 'Whether customer has online security add-on',
  'PaperlessBilling': 'Whether customer uses paperless billing',
  'PaymentMethod': 'Customer\'s payment method',
};

export default function InsightsPage() {
  const [tab, setTab] = useState('shap');
  const [shapData, setSHAPData] = useState(DEMO_SHAP);
  const [limeData, setLIMEData] = useState(DEMO_LIME);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const refreshExplanations = async () => {
    setLoading(true);
    try {
      const data = await getSHAPExplanation({});
      setSHAPData(data.shap_values);
      setLIMEData(data.lime_values);
      setIsDemo(false);
      updateStats({ shapAnalysisRun: 1 });
      toast.success('Explanations updated');
    } catch {
      toast('Using demo explanations — connect API for live SHAP/LIME', { icon: '⚡' });
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#0D1526] border border-[#1E2D45] rounded-xl p-3 text-xs shadow-elevated">
        <p className="text-white font-mono mb-1">{d.feature}</p>
        <p className={`font-semibold ${d.direction === 'positive' || d.direction === 'churn' ? 'text-rose-400' : 'text-emerald-400'}`}>
          SHAP: {d.shap > 0 ? '+' : ''}{d.shap?.toFixed(4)}
        </p>
        {FEATURE_GLOSSARY[d.feature?.split('_')[0]] && (
          <p className="text-slate-500 mt-1 max-w-48">{FEATURE_GLOSSARY[d.feature?.split('_')[0]]}</p>
        )}
      </div>
    );
  };

  return (
    <Layout title="XAI Insights">
      <SectionHeader
        title="Explainability Insights"
        subtitle="SHAP values and LIME local explanations for model transparency"
        icon={TrendingUp}
        action={
          <div className="flex items-center gap-2">
            {isDemo && <Badge color="amber">Demo Data</Badge>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={refreshExplanations} loading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-[#0D1526] border border-[#1E2D45] rounded-xl w-fit mb-6">
        {['shap', 'lime', 'summary'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 uppercase tracking-wide
              ${tab === t ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' : 'text-slate-400 hover:text-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'shap' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-white">SHAP Feature Importance</h3>
                <p className="text-xs text-slate-500 mt-0.5">Positive values push toward churn; negative toward retention</p>
              </div>
              <Badge color="cyan">SHAP</Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={shapData} layout="vertical" margin={{ left: 160, right: 20 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }}
                  domain={[-0.4, 0.5]} tickFormatter={v => v.toFixed(1)} />
                <YAxis type="category" dataKey="feature" axisLine={false} tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }} width={160} />
                <ReferenceLine x={0} stroke="#1E2D45" strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
                  {shapData.map((d, i) => (
                    <Cell key={i} fill={d.direction === 'positive' ? '#F43F5E' : '#10B981'}
                      fillOpacity={selectedFeature === d.feature ? 1 : 0.8}
                      onClick={() => setSelectedFeature(d.feature === selectedFeature ? null : d.feature)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Legend and summary */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-cyan-400" />
                <h4 className="font-display font-semibold text-white text-sm">How to Read SHAP</h4>
              </div>
              <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <div className="w-3 h-3 rounded-sm bg-rose-500 flex-shrink-0 mt-0.5" />
                  <p><strong className="text-rose-400">Positive SHAP</strong> — feature pushes prediction toward churn</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0 mt-0.5" />
                  <p><strong className="text-emerald-400">Negative SHAP</strong> — feature reduces churn probability</p>
                </div>
                <div className="pt-2 border-t border-[#1E2D45]">
                  <p>The magnitude shows <strong className="text-white">how much</strong> each feature shifts the prediction from the model baseline.</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-display font-semibold text-white text-sm mb-3">Top Churn Risks</h4>
              <div className="space-y-2.5">
                {shapData.filter(d => d.direction === 'positive').slice(0, 5).map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-400 truncate flex-1 mr-2">{d.feature}</span>
                      <span className="text-xs font-mono text-rose-400">+{d.shap.toFixed(3)}</span>
                    </div>
                    <ProgressBar value={d.shap} max={0.5} color="rose" showValue={false} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'lime' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-white">LIME Local Explanation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Local interpretable model-agnostic explanations for this prediction</p>
              </div>
              <Badge color="purple">LIME</Badge>
            </div>
            <div className="space-y-3">
              {limeData.map((d, i) => (
                <div key={i} className={`p-3 rounded-xl border transition-all duration-200 ${
                  d.direction === 'churn'
                    ? 'bg-rose-500/5 border-rose-500/15 hover:border-rose-500/30'
                    : 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-slate-300">{d.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${d.direction === 'churn' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {d.weight > 0 ? '+' : ''}{d.weight.toFixed(3)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        d.direction === 'churn' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {d.direction === 'churn' ? '↑ Churn' : '↓ Retain'}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={Math.abs(d.weight)} max={0.5} color={d.direction === 'churn' ? 'rose' : 'emerald'} showValue={false} />
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="font-display font-semibold text-white text-sm mb-3">About LIME</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                LIME creates a locally faithful linear approximation of the model around a specific prediction. 
                Each feature's weight shows its local contribution to this individual customer's churn probability.
              </p>
              <div className="mt-3 pt-3 border-t border-[#1E2D45]">
                <p className="text-xs text-slate-500">
                  Unlike SHAP (global + local), LIME is purely local — it explains <em className="text-slate-400">this specific prediction</em> in isolation.
                </p>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <h4 className="font-display font-semibold text-purple-300 text-sm mb-2">Retention Tip</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The top LIME driver is <strong className="text-white">Contract type</strong>. 
                Offering a 10-15% discount to upgrade to an annual plan can reduce churn probability by 30-40% for this customer profile.
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Model Accuracy', value: '79.8%', sub: 'Test set performance', color: 'cyan' },
              { title: 'AUC-ROC Score', value: '0.847', sub: 'Discriminative ability', color: 'purple' },
              { title: 'Precision', value: '65.2%', sub: 'Churner prediction quality', color: 'emerald' },
              { title: 'Recall', value: '54.9%', sub: 'Churner detection rate', color: 'amber' },
              { title: 'F1 Score', value: '0.596', sub: 'Harmonic precision-recall', color: 'rose' },
              { title: 'Features Used', value: '19', sub: 'Engineered from raw data', color: 'slate' },
            ].map(item => (
              <Card key={item.title} className={`p-5 border-${item.color}-500/20`}>
                <div className={`stat-number text-3xl font-bold mb-1 ${
                  item.color === 'cyan' ? 'text-cyan-400' :
                  item.color === 'purple' ? 'text-purple-400' :
                  item.color === 'emerald' ? 'text-emerald-400' :
                  item.color === 'amber' ? 'text-amber-400' :
                  item.color === 'rose' ? 'text-rose-400' : 'text-slate-400'
                }`}>{item.value}</div>
                <div className="text-sm text-slate-300 font-medium">{item.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="font-display font-semibold text-white mb-4">Feature Impact Summary</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {shapData.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold
                    ${d.direction === 'positive' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-slate-300 truncate">{d.feature}</div>
                    <ProgressBar value={Math.abs(d.shap)} max={0.5} color={d.direction === 'positive' ? 'rose' : 'emerald'} showValue={false} />
                  </div>
                  <span className={`text-xs font-mono flex-shrink-0 ${d.direction === 'positive' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {d.shap > 0 ? '+' : ''}{d.shap.toFixed(3)}
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
