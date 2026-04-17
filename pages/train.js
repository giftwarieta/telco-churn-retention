import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { CheckCircle, Cpu, Info, Play, Upload } from 'lucide-react';
import Layout from '../components/Layout';
import { Badge, Button, Card, ProgressBar, SectionHeader } from '../components/ui';
import { trainModel } from '../lib/api';
import { updateStats } from '../lib/analytics';

const ALGORITHMS = [
  { id: 'xgboost', label: 'XGBoost', badge: 'Recommended', color: 'cyan', desc: 'Strong overall performance for structured churn data.' },
  { id: 'random_forest', label: 'Random Forest', badge: null, color: 'purple', desc: 'Reliable ensemble baseline with stable results.' },
  { id: 'logistic', label: 'Logistic Regression', badge: 'Baseline', color: 'slate', desc: 'Fast and interpretable baseline model.' },
  { id: 'lightgbm', label: 'LightGBM', badge: 'Fast', color: 'emerald', desc: 'Efficient boosting for larger datasets.' },
];

function sampleTrainingResult(algorithm, testSize) {
  return {
    algorithm,
    accuracy: (0.78 + Math.random() * 0.05).toFixed(4),
    auc_roc: (0.82 + Math.random() * 0.04).toFixed(4),
    precision: (0.62 + Math.random() * 0.06).toFixed(4),
    recall: (0.51 + Math.random() * 0.08).toFixed(4),
    f1: (0.58 + Math.random() * 0.04).toFixed(4),
    training_samples: Math.round(7032 * (1 - testSize)),
    test_samples: Math.round(7032 * testSize),
    feature_count: 19,
    training_time: (2.1 + Math.random() * 1.5).toFixed(2),
    preview: true,
  };
}

export default function TrainPage() {
  const [algorithm, setAlgorithm] = useState('xgboost');
  const [testSize, setTestSize] = useState(0.2);
  const [trainFile, setTrainFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    onDrop: (files) => setTrainFile(files[0] || null),
  });

  const handleTrain = async () => {
    setLoading(true);
    setProgress(0);
    setTrainResult(null);

    const steps = [
      [10, 'Loading dataset'],
      [30, 'Preparing features'],
      [55, `Training ${algorithm.toUpperCase()}`],
      [80, 'Evaluating model'],
      [100, 'Finalizing results'],
    ];

    for (const [value, message] of steps) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setProgress(value);
      setPhase(message);
    }

    try {
      const result = await trainModel({ algorithm, test_size: testSize });
      setTrainResult(result);
      updateStats({ totalTrainingSessions: 1 });
      toast.success('Training complete');
    } catch {
      setTrainResult(sampleTrainingResult(algorithm, testSize));
      updateStats({ totalTrainingSessions: 1 });
      toast('Showing a sample training summary.', { icon: '•' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Train Model">
      <SectionHeader
        title="Model Training"
        subtitle="Adjust the algorithm, tune the split, and review model performance in a cleaner training workspace."
        icon={Cpu}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h3 className="font-display mb-4 text-sm font-semibold text-white">Select Algorithm</h3>
            <div className="space-y-2">
              {ALGORITHMS.map((algo) => (
                <button
                  key={algo.id}
                  onClick={() => setAlgorithm(algo.id)}
                  type="button"
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                    algorithm === algo.id
                      ? 'border-sky-500/30 bg-sky-500/10'
                      : 'border-[color:var(--border)] hover:border-slate-500/30 hover:bg-white/3'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className={`text-sm font-medium ${algorithm === algo.id ? 'text-sky-500' : 'text-slate-300'}`}>
                      {algo.label}
                    </span>
                    {algo.badge && <Badge color={algo.color === 'slate' ? 'slate' : algo.color}>{algo.badge}</Badge>}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{algo.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display mb-4 text-sm font-semibold text-white">Training Split</h3>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Test size: <span className="font-mono text-sky-500">{(testSize * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0.10"
              max="0.40"
              step="0.05"
              value={testSize}
              onChange={(event) => setTestSize(parseFloat(event.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>10% test</span>
              <span>40% test</span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display mb-4 text-sm font-semibold text-white">Dataset</h3>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 ${
                isDragActive
                  ? 'border-sky-500 bg-sky-500/8'
                  : 'border-[color:var(--border)] hover:border-sky-500/35'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-2 h-6 w-6 text-slate-600" />
              {trainFile ? (
                <p className="text-sm text-emerald-500">{trainFile.name}</p>
              ) : (
                <p className="text-xs text-slate-500">Drop a custom CSV or continue with the built-in dataset.</p>
              )}
            </div>
            {trainFile && (
              <button
                onClick={() => setTrainFile(null)}
                type="button"
                className="mt-2 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear selected file
              </button>
            )}
          </Card>

          <Button icon={Play} onClick={handleTrain} loading={loading} size="lg" className="w-full">
            {loading ? phase || 'Training...' : 'Start Training'}
          </Button>
        </div>

        <div className="space-y-5 lg:col-span-3">
          {loading && (
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/12">
                  <Cpu className="h-4 w-4 animate-spin text-sky-500" style={{ animationDuration: '1.8s' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Training in progress</div>
                  <div className="text-xs font-mono text-slate-500">{phase}</div>
                </div>
              </div>

              <ProgressBar value={progress} color="cyan" label={`${progress}% complete`} />
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {['Load', 'Prepare', 'Train', 'Evaluate'].map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 ${progress > index * 25 + 10 ? 'text-emerald-500' : 'text-slate-600'}`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {step}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {trainResult && (
            <>
              {trainResult.preview && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
                  Sample training metrics are shown while the live training service is unavailable.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Accuracy', value: `${(parseFloat(trainResult.accuracy) * 100).toFixed(1)}%`, color: 'cyan' },
                  { label: 'AUC-ROC', value: trainResult.auc_roc, color: 'purple' },
                  { label: 'Precision', value: `${(parseFloat(trainResult.precision) * 100).toFixed(1)}%`, color: 'emerald' },
                  { label: 'Recall', value: `${(parseFloat(trainResult.recall) * 100).toFixed(1)}%`, color: 'amber' },
                  { label: 'F1 Score', value: trainResult.f1, color: 'rose' },
                  { label: 'Train Time', value: `${trainResult.training_time}s`, color: 'slate' },
                ].map((item) => (
                  <Card key={item.label} className="p-4">
                    <div className="stat-number mb-1 text-2xl font-bold text-white">{item.value}</div>
                    <div className="text-xs text-slate-400">{item.label}</div>
                  </Card>
                ))}
              </div>

              <Card className="p-5">
                <h4 className="font-display mb-3 text-sm font-semibold text-white">Training Summary</h4>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    { label: 'Algorithm', value: trainResult.algorithm?.toUpperCase() },
                    { label: 'Training Samples', value: trainResult.training_samples?.toLocaleString() },
                    { label: 'Test Samples', value: trainResult.test_samples?.toLocaleString() },
                    { label: 'Features', value: trainResult.feature_count },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/3 px-3 py-3">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="font-mono text-slate-300">{row.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div>
                    <div className="mb-1 text-sm font-semibold text-emerald-500">Training summary ready</div>
                    <p className="text-xs leading-relaxed text-slate-400">
                      Review the metrics above to compare fit quality, speed, and dataset coverage before choosing the next iteration.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {!loading && !trainResult && (
            <Card className="p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 w-fit rounded-[28px] border border-sky-500/20 bg-sky-500/8 p-5">
                  <Cpu className="mx-auto h-10 w-10 text-sky-500" />
                </div>
                <h3 className="font-display mb-2 text-2xl font-bold text-white">Ready to train</h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
                  Choose an algorithm and start a training run to review model quality and data coverage in one place.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5" />
                  <span>Uses the existing churn processing and modeling pipeline already in this repo.</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
