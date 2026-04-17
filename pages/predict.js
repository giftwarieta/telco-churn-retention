import { useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, RiskBadge, ProgressBar, Badge, EmptyState } from '../components/ui';
import { Brain, Upload, User, ChevronDown, AlertTriangle, CheckCircle, Download, FileText, BarChart2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { predictSingle, predictBatch } from '../lib/api';
import { updateStats, addSessionEvent } from '../lib/analytics';

const DEFAULT_FORM = {
  gender: 'Male', SeniorCitizen: '0', Partner: 'Yes', Dependents: 'No',
  tenure: '12', PhoneService: 'Yes', MultipleLines: 'No',
  InternetService: 'Fiber optic', OnlineSecurity: 'No', OnlineBackup: 'Yes',
  DeviceProtection: 'No', TechSupport: 'No', StreamingTV: 'Yes', StreamingMovies: 'No',
  Contract: 'Month-to-month', PaperlessBilling: 'Yes', PaymentMethod: 'Electronic check',
  MonthlyCharges: '70.35', TotalCharges: '844.2',
};

const FIELD_CONFIG = [
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'SeniorCitizen', label: 'Senior Citizen', type: 'select', options: [['0','No'],['1','Yes']] },
  { key: 'Partner', label: 'Partner', type: 'select', options: ['Yes', 'No'] },
  { key: 'Dependents', label: 'Dependents', type: 'select', options: ['Yes', 'No'] },
  { key: 'tenure', label: 'Tenure (months)', type: 'number', min: 0, max: 72 },
  { key: 'PhoneService', label: 'Phone Service', type: 'select', options: ['Yes', 'No'] },
  { key: 'MultipleLines', label: 'Multiple Lines', type: 'select', options: ['Yes', 'No', 'No phone service'] },
  { key: 'InternetService', label: 'Internet Service', type: 'select', options: ['DSL', 'Fiber optic', 'No'] },
  { key: 'OnlineSecurity', label: 'Online Security', type: 'select', options: ['Yes', 'No', 'No internet service'] },
  { key: 'OnlineBackup', label: 'Online Backup', type: 'select', options: ['Yes', 'No', 'No internet service'] },
  { key: 'DeviceProtection', label: 'Device Protection', type: 'select', options: ['Yes', 'No', 'No internet service'] },
  { key: 'TechSupport', label: 'Tech Support', type: 'select', options: ['Yes', 'No', 'No internet service'] },
  { key: 'StreamingTV', label: 'Streaming TV', type: 'select', options: ['Yes', 'No', 'No internet service'] },
  { key: 'StreamingMovies', label: 'Streaming Movies', type: 'select', options: ['Yes', 'No', 'No internet service'] },
  { key: 'Contract', label: 'Contract', type: 'select', options: ['Month-to-month', 'One year', 'Two year'] },
  { key: 'PaperlessBilling', label: 'Paperless Billing', type: 'select', options: ['Yes', 'No'] },
  { key: 'PaymentMethod', label: 'Payment Method', type: 'select', options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'] },
  { key: 'MonthlyCharges', label: 'Monthly Charges ($)', type: 'number', step: '0.01' },
  { key: 'TotalCharges', label: 'Total Charges ($)', type: 'number', step: '0.01' },
];

function getRiskLevel(prob) {
  if (prob >= 0.7) return 'high';
  if (prob >= 0.4) return 'medium';
  return 'low';
}

export default function PredictPage() {
  const [tab, setTab] = useState('single');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const handleSinglePredict = async () => {
    setLoading(true);
    try {
      const data = await predictSingle(form);
      setResult(data);
      const risk = getRiskLevel(data.churn_probability);
      updateStats({
        totalPredictions: 1,
        totalRecordsAnalyzed: 1,
        highRiskDetected: risk === 'high' ? 1 : 0,
        mediumRiskDetected: risk === 'medium' ? 1 : 0,
        lowRiskDetected: risk === 'low' ? 1 : 0,
      });
      addSessionEvent({ type: 'prediction', mode: 'single', risk });
      toast.success('Prediction complete!');
    } catch (e) {
      // Use demo result when API is offline
      const prob = 0.67;
      const demo = {
        churn_probability: prob, churn_prediction: 1,
        risk_level: 'high', confidence: 0.82,
        top_factors: [
          { feature: 'Contract_Month-to-month', impact: 0.34, direction: 'increases' },
          { feature: 'tenure', impact: -0.21, direction: 'decreases' },
          { feature: 'MonthlyCharges', impact: 0.18, direction: 'increases' },
          { feature: 'InternetService_Fiber optic', impact: 0.15, direction: 'increases' },
        ],
        demo: true,
      };
      setResult(demo);
      updateStats({ totalPredictions: 1, totalRecordsAnalyzed: 1, highRiskDetected: 1 });
      toast('Using demo mode — connect API for live predictions', { icon: '⚡' });
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((files) => {
    if (files[0]) setBatchFile(files[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });

  const handleBatchPredict = async () => {
    if (!batchFile) return toast.error('Please upload a CSV file');
    setBatchLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', batchFile);
      const data = await predictBatch(fd);
      setBatchResults(data);
      updateStats({
        totalBatchPredictions: 1,
        batchFilesProcessed: 1,
        totalRecordsAnalyzed: data.total_records || 0,
        highRiskDetected: data.high_risk_count || 0,
        mediumRiskDetected: data.medium_risk_count || 0,
        lowRiskDetected: data.low_risk_count || 0,
      });
      addSessionEvent({ type: 'prediction', mode: 'batch', records: data.total_records });
      toast.success(`Processed ${data.total_records} records`);
    } catch {
      // Demo batch result
      Papa.parse(batchFile, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          const n = res.data.length;
          const high = Math.floor(n * 0.28), med = Math.floor(n * 0.35), low = n - high - med;
          setBatchResults({
            total_records: n, high_risk_count: high, medium_risk_count: med, low_risk_count: low,
            churn_rate: 0.28, avg_probability: 0.41,
            preview: res.data.slice(0, 5).map((row, i) => ({
              ...row, churn_probability: Math.random().toFixed(3),
              risk_level: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
            })),
            demo: true,
          });
          updateStats({ totalBatchPredictions: 1, batchFilesProcessed: 1, totalRecordsAnalyzed: n });
          toast('Demo batch results — connect API for real predictions', { icon: '⚡' });
        },
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadResults = () => {
    if (!batchResults?.preview) return;
    const csv = Papa.unparse(batchResults.preview);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'churn_predictions.csv'; a.click();
  };

  return (
    <Layout title="Predict">
      <SectionHeader title="Churn Prediction Engine" subtitle="Single customer or batch CSV analysis" icon={Brain} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0D1526] border border-[#1E2D45] rounded-xl w-fit mb-6">
        {['single', 'batch'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
              ${tab === t ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'single' ? '👤 Single Customer' : '📂 Batch Upload'}
          </button>
        ))}
      </div>

      {tab === 'single' ? (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <Card className="lg:col-span-3 p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display font-semibold text-white">Customer Profile</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELD_CONFIG.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                      value={form[field.key]}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    >
                      {field.options.map(opt => {
                        const [val, label] = Array.isArray(opt) ? opt : [opt, opt];
                        return <option key={val} value={val}>{label}</option>;
                      })}
                    </select>
                  ) : (
                    <input
                      type="number" step={field.step || '1'} min={field.min} max={field.max}
                      className="input-field w-full px-3 py-2.5 rounded-xl text-sm"
                      value={form[field.key]}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-[#1E2D45]">
              <Button icon={Brain} onClick={handleSinglePredict} loading={loading} size="lg" className="w-full sm:w-auto">
                {loading ? 'Analyzing...' : 'Predict Churn Risk'}
              </Button>
            </div>
          </Card>

          {/* Result */}
          <div className="lg:col-span-2 space-y-4">
            {result ? (
              <>
                {result.demo && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400">
                    ⚡ Demo mode — connect your FastAPI backend for live predictions
                  </div>
                )}
                {/* Main result card */}
                <Card className={`p-6 border-2 ${result.churn_prediction === 1 ? 'border-rose-500/30' : 'border-emerald-500/30'}`}>
                  <div className="text-center">
                    <div className={`inline-flex p-4 rounded-2xl mb-4 ${result.churn_prediction === 1 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                      {result.churn_prediction === 1
                        ? <AlertTriangle className="w-8 h-8 text-rose-400" />
                        : <CheckCircle className="w-8 h-8 text-emerald-400" />}
                    </div>
                    <div className="stat-number text-5xl font-bold mb-1" style={{
                      color: result.churn_prediction === 1 ? '#F43F5E' : '#10B981'
                    }}>
                      {(result.churn_probability * 100).toFixed(1)}%
                    </div>
                    <div className="text-slate-400 text-sm mb-3">Churn Probability</div>
                    <RiskBadge level={result.risk_level || getRiskLevel(result.churn_probability)} />
                    {result.confidence && (
                      <p className="text-xs text-slate-500 mt-2">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
                    )}
                  </div>
                  <div className="mt-5">
                    <ProgressBar
                      value={result.churn_probability * 100}
                      color={result.churn_prediction === 1 ? 'rose' : 'emerald'}
                      label="Risk Score"
                    />
                  </div>
                </Card>

                {/* Top factors */}
                {result.top_factors?.length > 0 && (
                  <Card className="p-5">
                    <h4 className="font-display font-semibold text-white mb-4 text-sm">Key Drivers</h4>
                    <div className="space-y-3">
                      {result.top_factors.map((f, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-slate-400 font-mono truncate flex-1 mr-2">{f.feature}</span>
                            <span className={`text-xs font-mono ${f.direction === 'increases' ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {f.direction === 'increases' ? '↑' : '↓'} {Math.abs(f.impact).toFixed(3)}
                            </span>
                          </div>
                          <ProgressBar
                            value={Math.abs(f.impact)}
                            max={0.5}
                            color={f.direction === 'increases' ? 'rose' : 'emerald'}
                            showValue={false}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8">
                <EmptyState
                  icon={BarChart2}
                  title="Ready to Predict"
                  description="Fill in customer details and click 'Predict Churn Risk' to see the analysis"
                />
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Batch upload */
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display font-semibold text-white">Batch CSV Upload</h3>
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-cyan-400 bg-cyan-500/5' : 'border-[#1E2D45] hover:border-cyan-500/50 hover:bg-cyan-500/3'}`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-cyan-400' : 'text-slate-600'}`} />
              {batchFile ? (
                <div>
                  <p className="text-white font-medium">{batchFile.name}</p>
                  <p className="text-sm text-slate-400 mt-1">{(batchFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 font-medium mb-1">
                    {isDragActive ? 'Drop your CSV here' : 'Drag & drop CSV or click to browse'}
                  </p>
                  <p className="text-sm text-slate-500">Supports standard WA_Fn-UseC_-Telco-Customer-Churn.csv format</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <Button icon={Brain} onClick={handleBatchPredict} loading={batchLoading} disabled={!batchFile}>
                {batchLoading ? 'Processing...' : 'Run Batch Prediction'}
              </Button>
              {batchFile && <Button variant="secondary" onClick={() => { setBatchFile(null); setBatchResults(null); }}>Clear</Button>}
            </div>
          </Card>

          {batchResults && (
            <div className="space-y-4">
              {batchResults.demo && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400">
                  ⚡ Demo results — showing parsed structure from your CSV
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Records', value: batchResults.total_records, color: 'cyan' },
                  { label: 'High Risk', value: batchResults.high_risk_count, color: 'rose' },
                  { label: 'Medium Risk', value: batchResults.medium_risk_count, color: 'amber' },
                  { label: 'Low Risk', value: batchResults.low_risk_count, color: 'emerald' },
                ].map(item => (
                  <Card key={item.label} className={`p-4 text-center border-${item.color}-500/20`}>
                    <div className="stat-number text-3xl font-bold text-white mb-1">{item.value}</div>
                    <div className="text-xs text-slate-400">{item.label}</div>
                  </Card>
                ))}
              </div>

              {batchResults.preview?.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-display font-semibold text-white">Preview (first 5 rows)</h4>
                    <Button icon={Download} variant="secondary" size="sm" onClick={downloadResults}>Export</Button>
                  </div>
                  <div className="responsive-table">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1E2D45]">
                          <th className="text-left py-2 px-3 text-xs text-slate-400 font-medium">Customer</th>
                          <th className="text-left py-2 px-3 text-xs text-slate-400 font-medium">Probability</th>
                          <th className="text-left py-2 px-3 text-xs text-slate-400 font-medium">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.preview.map((row, i) => (
                          <tr key={i} className="border-b border-[#1E2D45]/50 hover:bg-white/3">
                            <td className="py-2 px-3 font-mono text-slate-300 text-xs">{row.customerID || `Customer ${i + 1}`}</td>
                            <td className="py-2 px-3 font-mono text-slate-300 text-xs">{(parseFloat(row.churn_probability) * 100).toFixed(1)}%</td>
                            <td className="py-2 px-3"><RiskBadge level={row.risk_level} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
