import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Brain,
  CheckCircle2,
  Database,
  FileUp,
  LineChart,
  Lock,
  Rocket,
  Shield,
  Target,
  TrendingUp,
  Wand2,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Layout from '../components/Layout';
import { Button, Card } from '../components/ui';
import toast from 'react-hot-toast';
import { DataSourceChip, STORAGE_KEY, resetDataSourceSelection, useDataSource } from '../components/DataOnboarding';
import { getDefaultWorkspaceContext, getWorkspaceContext, setDefaultWorkspaceModel } from '../lib/workspace';

const quickLinks = [
  { href: '/predict', title: 'Run Prediction', description: 'Score a single customer or upload a CSV batch.', icon: Brain, accent: 'cyan' },
  { href: '/insights', title: 'View Insights', description: 'Inspect SHAP and LIME explanations with cleaner summaries.', icon: TrendingUp, accent: 'purple' },
  { href: '/consultant', title: 'Open Consultant', description: 'Ask for churn strategy, offer design, or ROI guidance.', icon: Activity, accent: 'emerald' },
  { href: '/roi', title: 'Model ROI', description: 'Estimate campaign impact and revenue protected by retention.', icon: BarChart2, accent: 'amber' },
];

const solutionHighlights = [
  { icon: Brain, title: 'Predictive Intelligence', description: 'Score churn risk quickly and identify which customers require immediate retention intervention.' },
  { icon: TrendingUp, title: 'Explainable AI', description: 'Translate SHAP and LIME outputs into business actions your commercial teams can apply.' },
  { icon: BarChart2, title: 'Financial Impact Modeling', description: 'Turn churn patterns into ROI, revenue-at-risk, and save-rate decisions before spending retention budget.' },
  { icon: Activity, title: 'Strategic Consultation', description: 'Use the AI consultant for telecom-specific guidance grounded in your active data route and model context.' },
];

const challengeSignals = [
  { icon: AlertTriangle, title: 'Revenue leakage', description: 'Churn pressure compounds quickly when high-risk customers are not isolated early enough.' },
  { icon: Target, title: 'Action prioritisation', description: 'Commercial teams need a clear sequence of which segments to target, not only a raw risk score.' },
  { icon: LineChart, title: 'Decision visibility', description: 'Leaders need explanation, ROI, and customer-level evidence before approving retention spend.' },
];

const homeGuides = [
  { title: 'Start with the right route', description: 'Choose the default expert path for immediate analysis or switch to personalized training for your own CSV workflow.' },
  { title: 'Move from scoring to explanation', description: 'Use prediction and insight pages together so risk scores translate into understandable churn drivers and action plans.' },
  { title: 'Close the loop with action', description: 'Use ROI and the consultant to turn model outputs into campaign priorities, save actions, and commercial decisions.' },
];

export default function HomePage() {
  const router = useRouter();
  const dataSource = useDataSource();
  const [mounted, setMounted] = useState(false);
  const [workspaceContext, setWorkspaceContext] = useState(getDefaultWorkspaceContext());
  const [isModelTrained, setIsModelTrained] = useState(true);
  
  // Onboarding Selection Overlay State
  const [showPathModal, setShowPathModal] = useState(false);
  const [selectedPendingPath, setSelectedPendingPath] = useState(null);
  const [isSwitchingInstantly, setIsSwitchingInstantly] = useState(false);

  useEffect(() => {
    setMounted(true);

    const savedPath = localStorage.getItem(STORAGE_KEY);
    if (!savedPath) {
      setShowPathModal(true);
    } else {
      setShowPathModal(false);
    }
  }, []);

  // INSTANT REACTIVE WORKSPACE BADGE SYNC LOOP
  useEffect(() => {
    if (!mounted) return;

    const syncActiveWorkspaceData = () => {
      const currentContext = getWorkspaceContext();
      setWorkspaceContext(currentContext);

      if (currentContext.dataSource === 'custom') {
        try {
          const session = JSON.parse(localStorage.getItem('churniq_training_session') || '{}');
          setIsModelTrained(Boolean(session?.sessionModel?.artifact));
        } catch {
          setIsModelTrained(false);
        }
      } else {
        setIsModelTrained(true);
      }
    };

    syncActiveWorkspaceData();

    window.addEventListener('storage', syncActiveWorkspaceData);
    const syncPollInterval = setInterval(syncActiveWorkspaceData, 400);

    return () => {
      window.removeEventListener('storage', syncActiveWorkspaceData);
      clearInterval(syncPollInterval);
    };
  }, [dataSource, mounted]);

  const triggerPathIntent = (pathType) => {
    if (pathType === workspaceContext.dataSource) return;
    setSelectedPendingPath(pathType);
    setShowPathModal(true);
  };

  const handleConfirmPathChange = async (forcedPath) => {
    const targetPath = forcedPath || selectedPendingPath;
    if (!targetPath) return;

    setIsSwitchingInstantly(true);

    if (targetPath === 'default') {
      try {
        localStorage.setItem(STORAGE_KEY, 'default');
      } catch {}
      const defaultContext = setDefaultWorkspaceModel();
      
      setWorkspaceContext(defaultContext);
      setIsModelTrained(true);
      setShowPathModal(false);
      setSelectedPendingPath(null);
      
      toast.success('Workspace updated to built-in path');
      await router.replace(router.asPath);
      setIsSwitchingInstantly(false);
    } else if (targetPath === 'custom') {
      resetDataSourceSelection();
      try {
        localStorage.setItem(STORAGE_KEY, 'custom');
      } catch {}

      // Dispatch global storage event manually to force components (including the sidebar layout) 
      // to pick up the changes instantly without waiting for thread ticks
      window.dispatchEvent(new Event('storage'));

      setShowPathModal(false);
      setSelectedPendingPath(null);
      
      await router.push('/train');
      setIsSwitchingInstantly(false);
    }
  };

  const routeLabel = workspaceContext.dataSource === 'custom' ? 'Personalized training path' : 'Default expert model path';
  const routeDescription =
    workspaceContext.dataSource === 'custom'
      ? 'Session-based custom dataset, temporary storage, and model training from your uploaded CSV.'
      : 'Built-in IBM Telco dataset with a pre-trained XGBoost model for immediate analysis.';
      
  const customerCountLabel =
    typeof workspaceContext.customerCount === 'number' && workspaceContext.customerCount > 0
      ? workspaceContext.customerCount.toLocaleString()
      : 'Pending';

  const renderChoosePathCard = (className = '') => (
    <Card className={`w-full max-w-xl p-5 text-center sm:p-6 lg:text-left transition-all duration-500 bg-[color:var(--bg-card)] border border-[color:var(--border)] relative ${className}`}>
      {isSwitchingInstantly && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-3xl">
          <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
        </div>
      )}
      <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start">
        <div className="rounded-2xl bg-sky-500/10 p-3">
          <Rocket className="h-6 w-6 text-sky-500" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Choose Workspace Path</h2>
          <p className="text-xs text-slate-500">Easily shift active contexts smoothly at any point.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/40 bg-white/3 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mb-4 pb-4 border-b border-white/5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Active Pipeline Configuration</div>
            <div className="mt-1 text-base font-bold text-white">{routeLabel}</div>
            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{routeDescription}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled={isSwitchingInstantly}
            onClick={() => triggerPathIntent('default')}
            className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 transform active:scale-[0.99] ${
              workspaceContext.dataSource === 'default'
                ? 'border-sky-500/40 bg-sky-500/10 shadow-[0_0_12px_rgba(14,165,233,0.05)] cursor-default'
                : 'border-[color:var(--border)] bg-white/3 hover:border-sky-500/30 hover:bg-sky-500/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2.5 transition-colors ${workspaceContext.dataSource === 'default' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-slate-400'}`}>
                <Database className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Use Default Expert Model</span>
                  {workspaceContext.dataSource === 'default' && <span className="text-[9px] font-mono bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  Move straight into the built-in IBM Telco workflow with a pre-trained model.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={isSwitchingInstantly}
            onClick={() => triggerPathIntent('custom')}
            className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 transform active:scale-[0.99] ${
              workspaceContext.dataSource === 'custom'
                ? 'border-purple-500/40 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.05)] cursor-default'
                : 'border-[color:var(--border)] bg-white/3 hover:border-purple-500/30 hover:bg-purple-500/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2.5 transition-colors ${workspaceContext.dataSource === 'custom' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-slate-400'}`}>
                <FileUp className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Setup Custom Training Session</span>
                  {workspaceContext.dataSource === 'custom' && <span className="text-[9px] font-mono bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  Upload your own custom dataset file, build algorithms, and test temporary workflows.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <Layout title="Overview">
      <div className="space-y-6 relative">
        
        {/* Onboarding Overlay Modal */}
        {mounted && showPathModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 animate-fade-in">
            <div className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-800/80 bg-[#090E17] p-6 sm:p-10 shadow-2xl relative transform transition-all duration-300 scale-100">
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center mb-10">
                <div className="rounded-2xl bg-gradient-to-b from-sky-500/20 to-sky-500/5 p-3 border border-sky-500/20 shadow-inner mb-4">
                  <Sparkles className="h-6 w-6 text-sky-400" />
                </div>
                <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl tracking-tight">
                  Choose your data path
                </h2>
                <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Pick the default expert route or start a temporary custom training session. You can switch again later from the Overview page.
                </p>
              </div>

              {/* Grid Options Columns */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Built-in Expert Path */}
                <div className="flex flex-col justify-between rounded-[24px] border border-slate-800/60 bg-slate-900/40 p-6 transition-all duration-300 hover:border-sky-500/30 hover:bg-sky-500/5 group relative">
                  {isSwitchingInstantly && selectedPendingPath === 'default' && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-[24px]">
                      <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="rounded-xl bg-sky-500/10 p-3 border border-sky-500/10 text-sky-400">
                        <Database className="h-5 w-5" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-sky-400 transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-2">Use Default Dataset</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      Start immediately with the IBM Telco churn dataset and the built-in expert model.
                    </p>
                    <ul className="space-y-2.5 mb-8">
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Pre-trained model ready</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Explainability included</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>No upload required</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={isSwitchingInstantly}
                    onClick={() => handleConfirmPathChange('default')}
                    className="w-full rounded-xl bg-sky-500/10 border border-sky-500/20 py-3 text-xs font-bold text-sky-400 transition-all duration-200 hover:bg-sky-500 hover:text-white"
                  >
                    Start with the expert model
                  </button>
                </div>

                {/* Custom Dataset Training Path */}
                <div className="flex flex-col justify-between rounded-[24px] border border-slate-800/60 bg-slate-900/40 p-6 transition-all duration-300 hover:border-purple-500/30 hover:bg-purple-500/5 group relative">
                  {isSwitchingInstantly && selectedPendingPath === 'custom' && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-[24px]">
                      <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="rounded-xl bg-purple-500/10 p-3 border border-purple-500/10 text-purple-400">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-2">Use Custom Training</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      Upload your CSV, train on your own customer data, and continue the session with your temporary workspace.
                    </p>
                    <ul className="space-y-2.5 mb-8">
                      <li className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300">
                        <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>Download template schema</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300">
                        <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>Upload custom telemetry metrics</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300">
                        <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>Redirect straight to training</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={isSwitchingInstantly}
                    onClick={() => handleConfirmPathChange('custom')}
                    className="w-full rounded-xl bg-purple-500/10 border border-purple-500/20 py-3 text-xs font-bold text-purple-400 transition-all duration-200 hover:bg-purple-600 hover:text-white"
                  >
                    Set up my own data
                  </button>
                </div>
              </div>
              
              {localStorage.getItem(STORAGE_KEY) && (
                <div className="mt-6 flex justify-end">
                  <button 
                    disabled={isSwitchingInstantly}
                    onClick={() => setShowPathModal(false)}
                    className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 disabled:opacity-40"
                  >
                    Keep Current Path Context
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero Main Presentation Card Banner */}
        <section className={`transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} flex flex-col justify-center gap-4 lg:grid lg:grid-cols-[1.2fr_0.9fr] lg:gap-6`}>
          <Card className="w-full p-6 sm:p-8 text-center lg:text-left bg-[color:var(--bg-card)] border border-[color:var(--border)] relative overflow-hidden shadow-xl">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
              <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-md uppercase tracking-wider">Modern Retention Engine</span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md uppercase tracking-wider">Responsive Intel</span>
            </div>

            <h1 className="font-display mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl tracking-tight">
              Turn churn signals into <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400">retention action</span>
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-2xl mx-auto lg:mx-0">
              Use one guided platform sandbox workspace to automatically process telemetry data points, review explainable visual models, configure target thresholds, and map business decisions.
            </p>

            <div className="mt-5 rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4 text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-sky-500/10 p-2 shrink-0">
                    <Lock className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Browser Session Vault</h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                      All calculations process strictly inside temporary storage parameters and drop immediately when workflows reset.
                    </p>
                  </div>
                </div>
                <DataSourceChip />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300">
                Route: <span className="text-white font-bold">{workspaceContext.dataSource === 'custom' ? 'Custom' : 'Default'}</span>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300">
                Records: <span className="text-white font-bold">{customerCountLabel}</span>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300">
                Model: <span className="text-white font-bold">{workspaceContext.modelLabel}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
              {isModelTrained ? (
                <>
                  <Link href="/predict">
                    <Button icon={Brain} size="md" className="w-full sm:w-auto shadow-lg shadow-sky-500/10 transform transition-transform hover:scale-[1.02]">
                      Launch Predictor
                    </Button>
                  </Link>
                  <Link href="/consultant">
                    <Button variant="secondary" size="md" icon={Wand2} className="w-full sm:w-auto transform transition-transform hover:scale-[1.02]">
                      Consult Advisor
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/train">
                  <Button icon={Rocket} size="md" className="w-full sm:w-auto shadow-lg shadow-purple-500/10 transform transition-transform hover:scale-[1.02]">
                    Complete Model Training Setup
                  </Button>
                </Link>
              )}
            </div>
          </Card>
          
          {renderChoosePathCard('hidden lg:block')}
        </section>

        {/* Dynamic Warning Gating System Notification Banner */}
        {!isModelTrained && workspaceContext.dataSource === 'custom' && (
          <div className="animate-pulse">
            <Card className="p-4 border-dashed border-purple-500/40 bg-purple-500/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3 flex-col sm:flex-row">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Advanced Platform Pages Suspended</h4>
                  <p className="text-xs text-slate-400">You must finalize the pipeline training configuration sequence before viewing prediction loops, explanation charts, or ROI tables.</p>
                </div>
              </div>
              <Link href="/train" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">Go To Training Studio</Button>
              </Link>
            </Card>
          </div>
        )}

        {/* Informative Content Sections */}
        <section className={`transition-all duration-700 ease-out transform delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} grid gap-6 lg:grid-cols-[1.15fr_0.85fr]`}>
          <Card className="p-6 bg-[color:var(--bg-card)] border border-[color:var(--border)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-rose-500/10 p-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-white">The Churn Challenge</h2>
                <p className="text-xs text-slate-500">Why this workspace matters for telecom retention workflows.</p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-sm leading-relaxed text-slate-300">
                  Customer churn represents one of the biggest cumulative performance pressure vectors. Protecting margin density requires clean transparency across analytics, predictive metrics, and commercial strategy before allocating capital constraints.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {challengeSignals.map((item) => (
                    <div key={item.title} className="rounded-xl border border-[color:var(--border)] bg-white/3 p-4 transition-all hover:border-slate-700">
                      <div className="mb-3 w-fit rounded-lg bg-white/5 p-2">
                        <item.icon className="h-4 w-4 text-rose-300" />
                      </div>
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-sky-500/10 bg-sky-500/5 p-5 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-400">Tactical Steps</div>
                  <div className="mt-0.5 text-base font-bold text-white">Workspace Loop</div>
                </div>

                <div className="mt-4 space-y-2">
                  {homeGuides.map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/5 bg-white/3 p-3">
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-[color:var(--bg-card)] border border-[color:var(--border)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-white">The ChurnIQ Architecture</h2>
                <p className="text-xs text-slate-500">End-to-end framework built for intelligence visibility.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {solutionHighlights.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-xl bg-white/3 p-3.5 transition-colors hover:bg-white/5">
                  <div className="rounded-xl bg-sky-500/10 p-2 shrink-0">
                    <item.icon className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{item.title}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Mobile View Path Toggle element */}
        <section className="transition-all duration-700 ease-out transform delay-200 lg:hidden">
          {renderChoosePathCard('mx-auto')}
        </section>

        {/* Quick Link Navigation Matrix Blocks */}
        <section className={`transition-all duration-700 ease-out transform delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} grid gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
          {quickLinks.map((item) => {
            const isGated = !isModelTrained && item.href !== '/train';
            
            const cardMarkup = (
              <Card 
                hoverable={!isGated} 
                className={`group h-full p-5 relative transition-all duration-300 ${
                  isGated 
                    ? 'opacity-30 border-dashed border-white/5 bg-white/1 cursor-not-allowed' 
                    : 'cursor-pointer hover:border-slate-700 bg-[color:var(--bg-card)] shadow-md'
                }`}
              >
                {isGated && (
                  <div className="absolute top-3 right-3 text-slate-600">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )}
                
                <div className="mb-4 flex items-start justify-between">
                  <div className={`rounded-xl p-2.5 ${
                    item.accent === 'cyan' ? 'bg-sky-500/10 text-sky-400' :
                    item.accent === 'purple' ? 'bg-violet-500/10 text-violet-400' :
                    item.accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  {!isGated && <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />}
                </div>

                <h3 className="font-display mb-1 text-sm font-bold text-white">{item.title}</h3>
                <p className="text-[11px] leading-relaxed text-slate-500 group-hover:text-slate-400 transition-colors">{item.description}</p>
              </Card>
            );

            if (isGated) {
              return <div key={item.href}>{cardMarkup}</div>;
            }

            return (
              <Link key={item.href} href={item.href} className="transform active:scale-[0.98] transition-transform">
                {cardMarkup}
              </Link>
            );
          })}
        </section>
        
      </div>
    </Layout>
  );
}