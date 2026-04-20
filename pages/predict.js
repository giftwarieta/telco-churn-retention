import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { AlertTriangle, BarChart2, Brain, CheckCircle, Download, FileText, Server, Upload, User } from 'lucide-react';
import Layout from '../components/Layout';
import { Button, Card, EmptyState, ProgressBar, RiskBadge, SectionHeader } from '../components/ui';
import { predictBatch, predictSingle } from '../lib/api';
import { addSessionEvent, pushGlobalStats, updateStats } from '../lib/analytics';

const DEFAULT_FORM = {
  gender: 'Male',
  SeniorCitizen: '0',
  Partner: 'Yes',
  Dependents: 'No',
  tenure: '12',
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
  MonthlyCharges: '70.35',
  TotalCharges: '844.2',
};

const FIELD_CONFIG = [
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'SeniorCitizen', label: 'Senior Citizen', type: 'select', options: [['0', 'No'], ['1', 'Yes']] },
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

function getRiskLevel(probability) {
  if (probability >= 0.7) return 'high';
  if (probability >= 0.4) return 'medium';
  return 'low';
}

function BackendError({ message }) {
  return (
    <Card className="p-6 border-amber-500/20">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <Server className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-400 mb-1">Prediction service unavailable</p>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Try again later.
            {/* {message || 'The FastAPI backend is not running. Start it locally to enable live predictions.'} */}
          </p>
          <div className="rounded-xl bg-[#0D1526] border border-[#1E2D45] px-4 py-3 font-mono text-xs text-slate-400">
            Kindly contact the developer.
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function PredictPage() {
  const [tab, setTab] = useState('single');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const handleSinglePredict = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

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
      pushGlobalStats({ totalPredictions: 1, totalRecordsAnalyzed: 1 });
      addSessionEvent({ type: 'prediction', mode: 'single', risk });
      toast.success('Prediction complete');
    } catch (err) {
      setError(err?.message || 'Backend unavailable');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((files) => {
    if (files[0]) {
      setBatchFile(files[0]);
      setBatchResults(null);
      setBatchError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleBatchPredict = async () => {
    if (!batchFile) { toast.error('Please upload a CSV file'); return; }
    setBatchLoading(true);
    setBatchResults(null);
    setBatchError(null);

    try {
      const formData = new FormData();
      formData.append('file', batchFile);
      const data = await predictBatch(formData);
      setBatchResults(data);
      updateStats({
        totalBatchPredictions: 1,
        batchFilesProcessed: 1,
        totalRecordsAnalyzed: data.total_records || 0,
        highRiskDetected: data.high_risk_count || 0,
        mediumRiskDetected: data.medium_risk_count || 0,
        lowRiskDetected: data.low_risk_count || 0,
      });
      pushGlobalStats({ batchFilesProcessed: 1, totalRecordsAnalyzed: data.total_records || 0 });
      addSessionEvent({ type: 'prediction', mode: 'batch', records: data.total_records });
      toast.success(`Processed ${data.total_records} records`);
    } catch (err) {
      setBatchError(err?.message || 'Backend unavailable');
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadResults = () => {
    if (!batchResults?.export_rows?.length) return;
    const csv = Papa.unparse(batchResults.export_rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'churn_predictions.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    window.open('/api/template', '_blank');
  };

  return (
    <Layout title="Predict">
      <SectionHeader
        title="Prediction Engine"
        subtitle="Run a single customer assessment or upload a CSV for batch scoring."
        icon={Brain}
      />

      <div className="mb-6 inline-flex w-full max-w-sm gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-1">
        {['single', 'batch'].map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            type="button"
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition-all duration-200 ${
              tab === mode
                ? 'border border-sky-500/20 bg-sky-500/10 text-sky-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode === 'single' ? 'Single Customer' : 'Batch Upload'}
          </button>
        ))}
      </div>

      {tab === 'single' ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="p-5 sm:p-6 lg:col-span-3">
            <div className="mb-5 flex items-center gap-2">
              <User className="h-4 w-4 text-sky-500" />
              <h3 className="font-display text-lg font-semibold text-white">Customer Profile</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FIELD_CONFIG.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="input-field rounded-2xl px-3 py-3 text-sm"
                      value={form[field.key]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    >
                      {field.options.map((option) => {
                        const [value, label] = Array.isArray(option) ? option : [option, option];
                        return <option key={value} value={value}>{label}</option>;
                      })}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step={field.step || '1'}
                      min={field.min}
                      max={field.max}
                      className="input-field rounded-2xl px-3 py-3 text-sm"
                      value={form[field.key]}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[color:var(--border)] pt-5">
              <Button icon={Brain} onClick={handleSinglePredict} loading={loading} size="lg" className="w-full sm:w-auto">
                {loading ? 'Analyzing...' : 'Predict Churn Risk'}
              </Button>
            </div>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            {error ? (
              <BackendError message={error} />
            ) : result ? (
              <>
                <Card className={`p-6 ${result.churn_prediction === 1 ? 'border-rose-500/25' : 'border-emerald-500/25'}`}>
                  <div className="text-center">
                    <div className={`mb-4 inline-flex rounded-[24px] p-4 ${result.churn_prediction === 1 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                      {result.churn_prediction === 1
                        ? <AlertTriangle className="h-8 w-8 text-rose-500" />
                        : <CheckCircle className="h-8 w-8 text-emerald-500" />}
                    </div>
                    <div className="stat-number mb-1 text-5xl font-bold" style={{ color: result.churn_prediction === 1 ? '#f43f5e' : '#10b981' }}>
                      {(result.churn_probability * 100).toFixed(1)}%
                    </div>
                    <div className="mb-3 text-sm text-slate-400">Churn probability</div>
                    <RiskBadge level={result.risk_level || getRiskLevel(result.churn_probability)} />
                    {result.confidence && (
                      <p className="mt-2 text-xs text-slate-500">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
                    )}
                  </div>
                  <div className="mt-5">
                    <ProgressBar
                      value={result.churn_probability * 100}
                      color={result.churn_prediction === 1 ? 'rose' : 'emerald'}
                      label="Risk score"
                    />
                  </div>
                </Card>

                {result.top_factors?.length > 0 && (
                  <Card className="p-5">
                    <h4 className="font-display mb-4 text-sm font-semibold text-white">Key Drivers</h4>
                    <div className="space-y-3">
                      {result.top_factors.map((factor, index) => (
                        <div key={`${factor.feature}-${index}`}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="flex-1 truncate text-xs font-mono text-slate-400">{factor.feature}</span>
                            <span className={`text-xs font-mono ${factor.direction === 'increases' ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {factor.direction === 'increases' ? '↑' : '↓'} {Math.abs(factor.impact).toFixed(3)}
                            </span>
                          </div>
                          <ProgressBar
                            value={Math.abs(factor.impact)}
                            max={0.5}
                            color={factor.direction === 'increases' ? 'rose' : 'emerald'}
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
                  title="Ready to predict"
                  description="Complete the customer profile and run the model to view churn probability and top drivers."
                />
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-500" />
                <h3 className="font-display text-lg font-semibold text-white">Batch CSV Upload</h3>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 rounded-xl border border-[#1E2D45] bg-[#0D1526] px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download template
              </button>
            </div>

            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-[28px] border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-10 ${
                isDragActive
                  ? 'border-sky-500 bg-sky-500/8'
                  : 'border-[color:var(--border)] hover:border-sky-500/40 hover:bg-sky-500/4'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className={`mx-auto mb-3 h-10 w-10 ${isDragActive ? 'text-sky-500' : 'text-slate-600'}`} />
              {batchFile ? (
                <div>
                  <p className="font-medium text-white">{batchFile.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{(batchFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="mb-1 font-medium text-slate-300">
                    {isDragActive ? 'Drop your CSV here' : 'Drag and drop a CSV or click to browse'}
                  </p>
                  <p className="text-sm text-slate-500">Must match the template format. Download the template above if needed.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button icon={Brain} onClick={handleBatchPredict} loading={batchLoading} disabled={!batchFile}>
                {batchLoading ? 'Processing...' : 'Run Batch Prediction'}
              </Button>
              {batchFile && (
                <Button variant="secondary" onClick={() => { setBatchFile(null); setBatchResults(null); setBatchError(null); }}>
                  Clear
                </Button>
              )}
            </div>
          </Card>

          {batchError && <BackendError message={batchError} />}

          {batchResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Records', value: batchResults.total_records, color: 'cyan' },
                  { label: 'High Risk', value: batchResults.high_risk_count, color: 'rose' },
                  { label: 'Medium Risk', value: batchResults.medium_risk_count, color: 'amber' },
                  { label: 'Low Risk', value: batchResults.low_risk_count, color: 'emerald' },
                ].map((item) => (
                  <Card key={item.label} className="p-4 text-center">
                    <div className="stat-number mb-1 text-3xl font-bold text-white">{item.value}</div>
                    <div className="text-xs text-slate-400">{item.label}</div>
                  </Card>
                ))}
              </div>

              {batchResults.preview?.length > 0 && (
                <Card className="p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="font-display text-base font-semibold text-white">Preview</h4>
                    <Button icon={Download} variant="secondary" size="sm" onClick={downloadResults}>
                      Export
                    </Button>
                  </div>

                  <div className="responsive-table">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[color:var(--border)]">
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Customer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Probability</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.preview.map((row, index) => (
                          <tr key={index} className="border-b border-[color:var(--border)]/50 hover:bg-white/3">
                            <td className="px-3 py-2 text-xs font-mono text-slate-300">{row.customerID || `Customer ${index + 1}`}</td>
                            <td className="px-3 py-2 text-xs font-mono text-slate-300">
                              {(parseFloat(row.churn_probability) * 100).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2">
                              <RiskBadge level={row.risk_level} />
                            </td>
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
