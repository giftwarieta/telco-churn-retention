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
  const [source, setSourceState] = useState(null);
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
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setSourceState(value);
  };

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
  const [step, setStep] = useState('choose');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);

  if (!loaded || NO_ONBOARD_PATHS.includes(router.pathname)) return null;
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
    if (!file || !file.name.toLowerCase().endsWith('.csv')) return;

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

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    handleFileChange(file);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-center bg-[#070E1A]/96 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="h-full w-full max-w-3xl sm:h-auto sm:max-h-[calc(100svh-2rem)]">
        <div className="flex h-full flex-col overflow-hidden border border-[#1E2D45] bg-[#0B1324] sm:rounded-[32px]">
          <div className="border-b border-[#1E2D45] px-4 py-4 text-center sm:px-8 sm:py-6">
            <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/15 sm:h-14 sm:w-14">
              <Sparkles className="h-5 w-5 text-sky-400 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-xl font-bold text-white sm:text-3xl">Choose your data path</h1>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Pick the default expert route or start a temporary custom training session. You can switch again later from the Overview page.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
            {step === 'choose' && (
              <div className="grid h-full content-center gap-3 sm:grid-cols-2 sm:gap-4">
                <button
                  onClick={handleChooseDefault}
                  type="button"
                  className="group rounded-[28px] border border-[#1E2D45] bg-[#0D1526] p-4 text-left transition-all duration-200 hover:border-sky-500/40 hover:bg-sky-500/5 sm:p-6"
                >
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/12 sm:h-11 sm:w-11">
                      <Database className="h-5 w-5 text-sky-400" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-sky-400" />
                  </div>
                  <h2 className="mb-2 text-base font-semibold text-white sm:text-lg">Use Default Dataset</h2>
                  <p className="mb-4 text-sm leading-relaxed text-slate-400">
                    Start immediately with the IBM Telco churn dataset and the built-in expert model.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-500">
                    {['Pre-trained model ready', 'Explainability included', 'No upload required'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-center text-xs font-medium text-sky-400">
                    Start with the expert model
                  </div>
                </button>

                <button
                  onClick={handleChooseCustom}
                  type="button"
                  className="group rounded-[28px] border border-[#1E2D45] bg-[#0D1526] p-4 text-left transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/5 sm:p-6"
                >
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/12 sm:h-11 sm:w-11">
                      <FileUp className="h-5 w-5 text-purple-400" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-purple-400" />
                  </div>
                  <h2 className="mb-2 text-base font-semibold text-white sm:text-lg">Use Custom Training</h2>
                  <p className="mb-4 text-sm leading-relaxed text-slate-400">
                    Upload your CSV, train on your own customer data, and continue the session with your temporary workspace.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-500">
                    {['Download template', 'Upload your CSV', 'Redirect straight to training'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-center text-xs font-medium text-purple-400">
                    Set up my own data
                  </div>
                </button>
              </div>
            )}

            {step === 'default-confirm' && (
              <div className="mx-auto flex h-full max-w-2xl flex-col justify-center rounded-[28px] border border-[#1E2D45] bg-[#0D1526] p-4 sm:p-6">
                <button
                  onClick={() => setStep('choose')}
                  className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
                  type="button"
                >
                  Back
                </button>

                <div className="rounded-[24px] border border-sky-500/20 bg-sky-500/8 p-4 sm:p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Default model</div>
                  <h2 className="text-lg font-semibold text-white">Confirm the default training model</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    This route uses the built-in IBM Telco churn dataset and the pre-trained XGBoost model already available in the workspace.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Dataset</div>
                      <div className="mt-1 text-sm font-medium text-white">IBM Telco churn dataset</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--border)] bg-white/3 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Model</div>
                      <div className="mt-1 text-sm font-medium text-white">Pre-trained XGBoost model</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmDefault}
                  className="mt-4 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-500"
                  type="button"
                >
                  Confirm Default Model
                </button>
              </div>
            )}

            {step === 'custom-setup' && (
              <div className="mx-auto flex h-full max-w-2xl flex-col rounded-[28px] border border-[#1E2D45] bg-[#0D1526] p-4 sm:p-6">
                <button
                  onClick={() => setStep('choose')}
                  className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
                  type="button"
                >
                  Back
                </button>

                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">Set up personalized training</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Upload a template-based CSV and continue directly to training.
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 text-xs font-bold text-sky-400">1</div>
                      <div className="text-sm font-medium text-white">Download the CSV template</div>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-slate-500">
                      Use the template so the uploaded file keeps the required churn columns.
                    </p>
                    <a
                      href="/api/template"
                      download="churniq_data_template.csv"
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-400 transition-colors hover:bg-sky-500/15"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download template
                    </a>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/15 text-xs font-bold text-purple-400">2</div>
                      <div className="text-sm font-medium text-white">Upload your CSV</div>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-slate-500">
                      This custom dataset is temporary. It stays only in the current browser session and clears when the session expires or the route changes.
                    </p>

                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('onboarding-file').click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                        dragOver
                          ? 'border-purple-500 bg-purple-500/8'
                          : uploadedFile
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-[#1E2D45] hover:border-purple-500/40'
                      }`}
                    >
                      <input
                        id="onboarding-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(event) => handleFileChange(event.target.files[0])}
                      />
                      {uploadedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="max-w-[80%] truncate text-sm font-medium text-emerald-400">
                            {savingUpload ? 'Preparing training workspace...' : uploadedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setUploadedFile(null);
                            }}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="mx-auto mb-2 h-5 w-5 text-slate-600" />
                          <p className="text-xs text-slate-500">Tap to browse or drop your CSV here</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="mb-2 flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${uploadedFile ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-600'}`}>3</div>
                      <div className={`text-sm font-medium ${uploadedFile ? 'text-white' : 'text-slate-500'}`}>Redirect straight to training</div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">
                      As soon as the file is uploaded, you are redirected to the training page to choose and run the model on that temporary dataset.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-slate-600">
                  Prefer the built-in route instead?{' '}
                  <button onClick={() => setStep('default-confirm')} className="text-slate-400 underline underline-offset-2 hover:text-white" type="button">
                    Use the default dataset
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataSourceChip({ onReset }) {
  const { source, loaded, reset } = useOnboardingState();
  if (!loaded || !source) return null;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
        source === 'custom'
          ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
          : 'border-sky-500/20 bg-sky-500/10 text-sky-400'
      }`}>
        <Database className="h-3 w-3" />
        {source === 'custom' ? 'Custom data' : 'Default dataset'}
      </span>
      <button
        onClick={() => {
          reset();
          if (onReset) onReset();
        }}
        className="text-[10px] text-slate-600 underline underline-offset-2 hover:text-slate-400"
        type="button"
      >
        Change
      </button>
    </div>
  );
}
