import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ChevronRight, Database, Download, FileUp, Sparkles, Upload, X } from 'lucide-react';
import { clearWorkspaceSession, saveCustomDatasetSession, setDefaultWorkspaceModel } from '../lib/workspace';

export const STORAGE_KEY = 'churniq_data_source';
const NO_ONBOARD_PATHS = ['/about'];

export function resetDataSourceSelection() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  clearWorkspaceSession();
}

function useOnboardingState() {
  const [source, setSourceState] = useState(null); // null = not loaded yet
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setSourceState(stored || '');
    } catch {
      setSourceState('default');
    }
    setLoaded(true);
  }, []);

  const setSource = (value) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
    setSourceState(value);
  };

  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    clearWorkspaceSession();
    setSourceState('');
  };

  return { source, loaded, setSource, reset };
}

export function useDataSource() {
  const [source, setSource] = useState(null);
  useEffect(() => {
    try {
      setSource(localStorage.getItem(STORAGE_KEY) || 'default');
    } catch {
      setSource('default');
    }
  }, []);
  return source;
}

export default function DataOnboarding() {
  const router = useRouter();
  const { source, loaded, setSource } = useOnboardingState();
  const [step, setStep] = useState('choose'); // 'choose' | 'custom-setup' | 'default-confirm'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);

  // Don't show on about page or while loading
  if (!loaded || NO_ONBOARD_PATHS.includes(router.pathname)) return null;
  // Already onboarded
  if (source === 'default' || source === 'custom') return null;

  const handleChooseDefault = () => {
    setStep('default-confirm');
  };

  const handleConfirmDefault = () => {
    setDefaultWorkspaceModel();
    setSource('default');
  };

  const handleChooseCustom = () => {
    setStep('custom-setup');
  };

  const handleFileChange = async (file) => {
    if (!file || !file.name.endsWith('.csv')) return;

    setUploadedFile(file);
    setSavingUpload(true);

    try {
      await saveCustomDatasetSession(file);
      setSource('custom');
      router.push('/train');
    } finally {
      setSavingUpload(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070E1A]/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/20">
            <Sparkles className="h-7 w-7 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to ChurnIQ</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Before you start, choose your data source. You can always switch later from the Overview page.
          </p>
        </div>

        {step === 'choose' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Default data */}
            <button
              onClick={handleChooseDefault}
              type="button"
              className="group text-left rounded-2xl border border-[#1E2D45] bg-[#0D1526] p-6 transition-all duration-200 hover:border-sky-500/40 hover:bg-sky-500/5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/12 border border-sky-500/20">
                  <Database className="h-5 w-5 text-sky-400" />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-sky-400 group-hover:translate-x-0.5" />
              </div>
              <h2 className="font-semibold text-white mb-2">Use Default Dataset</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Start immediately with the IBM Telco churn dataset — 7,043 customers, pre-trained XGBoost model ready to go.
              </p>
              <ul className="space-y-1.5">
                {['Pre-trained model included', '19 customer features', 'Full SHAP & LIME insights', 'No setup required'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-xs font-medium text-sky-400 text-center">
                Start immediately →
              </div>
            </button>

            {/* Custom data */}
            <button
              onClick={handleChooseCustom}
              type="button"
              className="group text-left rounded-2xl border border-[#1E2D45] bg-[#0D1526] p-6 transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/12 border border-purple-500/20">
                  <FileUp className="h-5 w-5 text-purple-400" />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-purple-400 group-hover:translate-x-0.5" />
              </div>
              <h2 className="font-semibold text-white mb-2">Upload Your Own Data</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Upload a CSV with your customer records. Download our template, fill it in, train the model, then run your own insights.
              </p>
              <ul className="space-y-1.5">
                {['Download CSV template', 'Upload your customer data', 'Train your own model', 'Run personalised insights'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-xs font-medium text-purple-400 text-center">
                Set up my data →
              </div>
            </button>
          </div>
        )}

        {step === 'default-confirm' && (
          <div className="rounded-2xl border border-[#1E2D45] bg-[#0D1526] p-6">
            <button
              onClick={() => setStep('choose')}
              className="mb-5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back
            </button>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/8 p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Default Model</div>
              <h2 className="text-lg font-semibold text-white">Confirm the default training model</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                The default route uses the built-in IBM Telco churn dataset with the pre-trained XGBoost model already available in this workspace.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[color:var(--border)] bg-white/3 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Dataset</div>
                  <div className="mt-1 text-sm font-medium text-white">IBM Telco churn dataset</div>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-white/3 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Active model</div>
                  <div className="mt-1 text-sm font-medium text-white">Pre-trained XGBoost model</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmDefault}
              className="mt-5 w-full rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-500"
            >
              Confirm Default Model
            </button>
          </div>
        )}

        {step === 'custom-setup' && (
          <div className="rounded-2xl border border-[#1E2D45] bg-[#0D1526] p-6">
            <button
              onClick={() => setStep('choose')}
              className="mb-5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back
            </button>

            <h2 className="font-semibold text-white mb-1">Set up your data</h2>
            <p className="text-sm text-slate-400 mb-6">Follow these three steps to get your own model running.</p>

            {/* Step 1 */}
            <div className="mb-5 flex gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/15 border border-sky-500/30 text-xs font-bold text-sky-400">1</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white mb-1">Download the CSV template</div>
                <p className="text-xs text-slate-500 mb-3">Your file must include all 21 required columns. The template includes sample rows and column descriptions.</p>
                <a
                  href="/api/template"
                  download="churniq_data_template.csv"
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-400 hover:bg-sky-500/15 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download template (.csv)
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-5 flex gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-400">2</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white mb-1">Upload your data file</div>
                <p className="text-xs text-slate-500 mb-3">Upload your completed CSV. It must include all required columns from the template.</p>
                <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-300">
                  This uploaded dataset is stored only for the current browser session. It is not permanently saved and will be cleared when the session expires or when you change data route.
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('onboarding-file').click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                    dragOver ? 'border-purple-500 bg-purple-500/8' : uploadedFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-[#1E2D45] hover:border-purple-500/40'
                  }`}
                >
                  <input
                    id="onboarding-file"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files[0])}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-emerald-400 font-medium">
                        {savingUpload ? 'Preparing training workspace...' : uploadedFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                        className="ml-2 text-slate-500 hover:text-slate-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                      <p className="text-xs text-slate-500">Drop your CSV here or click to browse</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="mb-6 flex gap-4">
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${uploadedFile ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>3</div>
              <div className="flex-1">
                <div className={`text-sm font-medium mb-1 ${uploadedFile ? 'text-white' : 'text-slate-600'}`}>Redirect to training</div>
                <p className="text-xs text-slate-500">As soon as your CSV is uploaded, you will be redirected directly to the Train page to choose the training model.</p>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
              You can also{' '}
              <button onClick={() => setStep('default-confirm')} className="text-slate-400 hover:text-white underline underline-offset-2">
                use the default dataset
              </button>{' '}
              and come back to upload your own data later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Small floating chip shown in the app footer/nav so user knows which data source is active
export function DataSourceChip({ onReset }) {
  const { source, loaded, reset } = useOnboardingState();
  if (!loaded || !source) return null;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border ${
        source === 'custom'
          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
          : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
      }`}>
        <Database className="h-3 w-3" />
        {source === 'custom' ? 'Custom data' : 'Default dataset'}
      </span>
      <button
        onClick={() => { reset(); if (onReset) onReset(); }}
        className="text-[10px] text-slate-600 hover:text-slate-400 underline underline-offset-2"
      >
        Change
      </button>
    </div>
  );
}
