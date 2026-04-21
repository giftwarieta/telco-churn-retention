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
} from 'lucide-react';
import Layout from '../components/Layout';
import { Badge, Button, Card } from '../components/ui';
import { DataSourceChip, STORAGE_KEY, resetDataSourceSelection, useDataSource } from '../components/DataOnboarding';
import { getDefaultWorkspaceContext, getWorkspaceContext, setDefaultWorkspaceModel } from '../lib/workspace';

const quickLinks = [
  { href: '/predict', title: 'Run Prediction', description: 'Score a single customer or upload a CSV batch.', icon: Brain, accent: 'cyan' },
  { href: '/insights', title: 'View Insights', description: 'Inspect SHAP and LIME explanations with cleaner summaries.', icon: TrendingUp, accent: 'purple' },
  { href: '/consultant', title: 'Open Consultant', description: 'Ask for churn strategy, offer design, or ROI guidance.', icon: Activity, accent: 'emerald' },
  { href: '/roi', title: 'Model ROI', description: 'Estimate campaign impact and revenue protected by retention.', icon: BarChart2, accent: 'amber' },
];

const solutionHighlights = [
  {
    icon: Brain,
    title: 'Predictive Intelligence',
    description: 'Score churn risk quickly and identify which customers require immediate retention intervention.',
  },
  {
    icon: TrendingUp,
    title: 'Explainable AI',
    description: 'Translate SHAP and LIME outputs into business actions your commercial teams can apply.',
  },
  {
    icon: BarChart2,
    title: 'Financial Impact Modeling',
    description: 'Turn churn patterns into ROI, revenue-at-risk, and save-rate decisions before spending retention budget.',
  },
  {
    icon: Activity,
    title: 'Strategic Consultation',
    description: 'Use the AI consultant for telecom-specific guidance grounded in your active data route and model context.',
  },
];

const challengeSignals = [
  {
    icon: AlertTriangle,
    title: 'Revenue leakage',
    description: 'Churn pressure compounds quickly when high-risk customers are not isolated early enough.',
  },
  {
    icon: Target,
    title: 'Action prioritisation',
    description: 'Commercial teams need a clear sequence of which segments to target, not only a raw risk score.',
  },
  {
    icon: LineChart,
    title: 'Decision visibility',
    description: 'Leaders need explanation, ROI, and customer-level evidence before approving retention spend.',
  },
];

const homeGuides = [
  {
    title: 'Start with the right route',
    description: 'Choose the default expert path for immediate analysis or switch to personalized training for your own CSV workflow.',
  },
  {
    title: 'Move from scoring to explanation',
    description: 'Use prediction and insight pages together so risk scores translate into understandable churn drivers and action plans.',
  },
  {
    title: 'Close the loop with action',
    description: 'Use ROI and the consultant to turn model outputs into campaign priorities, save actions, and commercial decisions.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const dataSource = useDataSource();
  const [workspaceContext, setWorkspaceContext] = useState(getDefaultWorkspaceContext());

  useEffect(() => {
    setWorkspaceContext(getWorkspaceContext());
  }, []);

  const handleChooseDefaultPath = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'default');
    } catch {}
    setWorkspaceContext(setDefaultWorkspaceModel());
    router.replace('/');
  };

  const handleChooseCustomPath = () => {
    resetDataSourceSelection();
    router.reload();
  };

  const routeLabel = dataSource === 'custom' ? 'Personalized training path' : 'Default expert model path';
  const routeDescription =
    dataSource === 'custom'
      ? 'Session-based custom dataset, temporary storage, and model training from your uploaded CSV.'
      : 'Built-in IBM Telco dataset with a pre-trained XGBoost model for immediate analysis.';
  const customerCountLabel =
    typeof workspaceContext.customerCount === 'number' && workspaceContext.customerCount > 0
      ? workspaceContext.customerCount.toLocaleString()
      : 'Pending';
  const renderChoosePathCard = (className = '') => (
    <Card className={`mx-auto my-auto w-full max-w-xl p-5 text-center sm:p-6 lg:mx-0 lg:text-left ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start">
        <div className="rounded-2xl bg-sky-500/10 p-3">
          <Rocket className="h-6 w-6 text-sky-500" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Choose Your Path</h2>
          <p className="text-sm text-slate-500">Select the working route and make it obvious what data and model context are active.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--border)] bg-white/3 p-4">
        <div className="flex flex-wrap items-start justify-center gap-3 text-center lg:justify-between lg:text-left">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current route</div>
            <div className="mt-2 text-lg font-semibold text-white">{routeLabel}</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{routeDescription}</p>
          </div>
          <Badge color={dataSource === 'custom' ? 'purple' : 'cyan'}>
            {dataSource === 'custom' ? 'Custom session' : 'Default active'}
          </Badge>
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={handleChooseDefaultPath}
            disabled={dataSource === 'default'}
            className={`w-full rounded-3xl border p-4 text-left transition-all sm:p-4 ${
              dataSource === 'default'
                ? 'cursor-not-allowed border-sky-500/35 bg-sky-500/10 shadow-[0_0_0_1px_rgba(14,165,233,0.08)]'
                : 'cursor-pointer border-[color:var(--border)] bg-white/3 hover:border-sky-500/25 hover:bg-sky-500/6'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-500/12 p-3">
                <Database className="h-5 w-5 text-sky-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-white">Use Default Expert Model</div>
                  {dataSource === 'default' && <Badge color="cyan">Current</Badge>}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">
                  Move straight into the built-in IBM Telco workflow with the default model and ready-made insights.
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleChooseCustomPath}
            disabled={dataSource === 'custom'}
            className={`w-full rounded-3xl border p-4 text-left transition-all sm:p-4 ${
              dataSource === 'custom'
                ? 'cursor-not-allowed border-purple-500/35 bg-purple-500/10 shadow-[0_0_0_1px_rgba(168,85,247,0.08)]'
                : 'cursor-pointer border-[color:var(--border)] bg-white/3 hover:border-purple-500/25 hover:bg-purple-500/6'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-purple-500/12 p-3">
                <FileUp className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-white">Setup Personalized Training</div>
                  {dataSource === 'custom' && <Badge color="purple">Current</Badge>}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">
                  Upload your own CSV, train a session model, and keep insights aligned to your temporary working dataset.
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <Layout title="Overview">
      <section className="mb-8 flex min-h-[calc(100svh-7rem)] flex-col justify-center gap-4 lg:grid lg:min-h-0 lg:grid-cols-[1.2fr_0.9fr] lg:gap-6">
        <Card className="mx-auto w-full max-w-4xl overflow-hidden p-5 text-center sm:p-8 lg:mx-0 lg:text-left">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <Badge color="cyan">Modern retention workspace</Badge>
            <Badge color="amber">Responsive dashboard</Badge>
            <Badge color={dataSource === 'custom' ? 'purple' : 'emerald'}>{dataSource === 'custom' ? 'Custom route active' : 'Default route active'}</Badge>
          </div>

          <h1 className="font-display mx-auto max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl lg:mx-0">
            Turn churn signals into <span className="gradient-text">retention action</span>
          </h1>

          <p className="mt-4 mx-auto max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base lg:mx-0">
            Use one guided workspace to score churn risk, explain model behaviour, evaluate retention economics, and move from analytics into practical customer action.
          </p>

          <div className="mt-6 rounded-3xl border border-sky-500/15 bg-sky-500/8 p-4">
            <div className="flex flex-wrap items-start justify-center gap-4 lg:justify-between">
              <div className="flex items-start gap-3 text-left">
                <div className="rounded-2xl bg-sky-500/12 p-3">
                  <Lock className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Data Privacy Notice</div>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
                    This app is session-based. Custom data stays only in your browser session and is cleared when the session expires or when you change data route.
                  </p>
                </div>
              </div>
              <DataSourceChip />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <span className="rounded-full border border-[color:var(--border)] bg-white/3 px-3 py-2 text-xs font-medium text-slate-300">
              Active route: {routeLabel}
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-white/3 px-3 py-2 text-xs font-medium text-slate-300">
              Dataset size: {customerCountLabel}
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-white/3 px-3 py-2 text-xs font-medium text-slate-300">
              Model: {workspaceContext.modelLabel}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/predict">
              <Button icon={Brain} size="lg">
                Start Prediction
              </Button>
            </Link>
            <Link href="/consultant">
              <Button variant="secondary" size="lg" icon={Wand2}>
                Ask the Consultant
              </Button>
            </Link>
          </div>
        </Card>
        {renderChoosePathCard('hidden lg:block')}
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-rose-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">The Business Challenge</h2>
              <p className="text-sm text-slate-500">Why this workspace matters for telecom retention.</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="max-w-3xl text-base leading-relaxed text-slate-300">
                Customer churn represents one of the biggest revenue leaks in telecom. Protecting the right customers at the right time requires more than a churn score. Teams need model visibility, campaign economics, and a practical action path they can execute quickly.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {challengeSignals.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-[color:var(--border)] bg-white/4 p-4">
                    <div className="mb-3 w-fit rounded-2xl bg-white/6 p-2.5">
                      <item.icon className="h-4 w-4 text-rose-300" />
                    </div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-sky-500/14 bg-sky-500/6 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/70">Home guide</div>
              <div className="mt-1 text-lg font-semibold text-white">How to use the workspace effectively</div>

              <div className="mt-4 space-y-3">
                {homeGuides.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-400">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">The ChurnIQ Solution</h2>
              <p className="text-sm text-slate-500">A guided retention workspace across prediction, insight, and action.</p>
            </div>
          </div>
          <div className="space-y-4">
            {solutionHighlights.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/3 p-4">
                <div className="rounded-2xl bg-sky-500/10 p-2.5">
                  <item.icon className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{item.title}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-6 lg:hidden">
        {renderChoosePathCard()}
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card hoverable className="group h-full cursor-pointer p-5">
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`rounded-2xl p-3 ${
                    item.accent === 'cyan'
                      ? 'bg-sky-500/10'
                      : item.accent === 'purple'
                        ? 'bg-violet-500/10'
                        : item.accent === 'emerald'
                          ? 'bg-emerald-500/10'
                          : 'bg-amber-500/10'
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 ${
                      item.accent === 'cyan'
                        ? 'text-sky-500'
                        : item.accent === 'purple'
                          ? 'text-violet-500'
                          : item.accent === 'emerald'
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                    }`}
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
              </div>

              <h3 className="font-display mb-2 text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
            </Card>
          </Link>
        ))}
      </section>
    </Layout>
  );
}
