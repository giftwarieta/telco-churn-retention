import { useState } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, Badge, ProgressBar } from '../components/ui';
import { Cpu, Upload, Play, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { trainModel } from '../lib/api';
import { updateStats } from '../lib/analytics';

const ALGORITHMS = [
  { id: 'xgboost', label: 'XGBoost', badge: 'Recommended', color: 'cyan', desc: 'Gradient boosting — best overall performance for tabular churn data' },
  { id: 'random_forest', label: 'Random Forest', badge: null, color: 'purple', desc: 'Ensemble of decision trees — robust and fast training' },
  { id: 'logistic', label: 'Logistic Regression', badge: 'Baseline', color: 'slate', desc: 'Linear model — fully interpretable, great baseline comparison' },
  { id: 'lightgbm', label: 'LightGBM', badge: 'Fast', color: 'emerald', desc: 'Leaf-wise gradient boosting — fastest training on large datasets' },
];

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
    onDrop: files => setTrainFile(files[0] || null),
  });

  const handleTrain = async () => {
    setLoading(true);
    setProgress(0);
    setTrainResult(null);

    const steps = [
      [10, 'Loading and validating dataset...'],
      [30, 'Preprocessing features...'],
      [50, 'Engineering features...'],
      [70, `Training ${algorithm.toUpperCase()} model...`],
      [85, 'Running SHAP analysis...'],
      [95, 'Evaluating on test set...'],
      [100, 'Saving model artifacts...'],
    ];

    for (const [p, msg] of steps) {
      await new Promise(r => setTimeout(r, 600));
      setProgress(p);
      setPhase(msg);
    }

    try {
      const result = await trainModel({ algorithm, test_size: testSize });
      setTrainResult(result);
      updateStats({ totalTrainingSessions: 1 });
      toast.success('Model trained successfully!');
    } catch {
      // Demo results
      setTrainResult({
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
        demo: true,
      });
      updateStats({ totalTrainingSessions: 1 });
      toast('Demo training results — connect API for real training', { icon: '⚡' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Train Model">
      <SectionHeader title="Model Training" subtitle="Retrain with your own dataset and custom parameters" icon={Cpu} />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Algorithm selection */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-white mb-4 text-sm">Select Algorithm</h3>
            <div className="space-y-2">
              {ALGORITHMS.map(algo => (
                <button key={algo.id} onClick={() => setAlgorithm(algo.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200
                    ${algorithm === algo.id
                      ? 'border-cyan-500/40 bg-cyan-500/10'
                      : 'border-[#1E2D45] hover:border-slate-600 hover:bg-white/3'
                    }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${algorithm === algo.id ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {algo.label}
                    </span>
                    {algo.badge && <Badge color={algo.id === 'xgboost' ? 'cyan' : algo.id === 'lightgbm' ? 'emerald' : 'slate'}>{algo.badge}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">{algo.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Parameters */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-white mb-4 text-sm">Training Config</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Test Size: <span className="text-cyan-400 font-mono">{(testSize * 100).toFixed(0)}%</span>
                </label>
                <input type="range" min="0.10" max="0.40" step="0.05"
                  value={testSize} onChange={e => setTestSize(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500" />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>10% test</span><span>40% test</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Data upload */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-white mb-4 text-sm">Training Dataset (Optional)</h3>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-cyan-400 bg-cyan-500/5' : 'border-[#1E2D45] hover:border-cyan-500/40'}`}>
              <input {...getInputProps()} />
              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              {trainFile ? (
                <p className="text-sm text-emerald-400">{trainFile.name}</p>
              ) : (
                <p className="text-xs text-slate-500">Drop custom CSV or use built-in dataset</p>
              )}
            </div>
            {trainFile && (
              <button onClick={() => setTrainFile(null)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">
                Clear file (use default)
              </button>
            )}
          </Card>

          <Button icon={Play} onClick={handleTrain} loading={loading} size="lg" className="w-full">
            {loading ? phase || 'Training...' : 'Start Training'}
          </Button>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-5">
          {loading && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Training in Progress</div>
                  <div className="text-xs text-slate-500 font-mono">{phase}</div>
                </div>
              </div>
              <ProgressBar value={progress} color="cyan" label={`${progress}% complete`} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {['Data Loading', 'Feature Engineering', 'Model Training', 'Evaluation'].map((step, i) => (
                  <div key={step} className={`flex items-center gap-2 text-xs ${progress > i * 25 + 10 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {step}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {trainResult && (
            <>
              {trainResult.demo && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400">
                  ⚡ Demo results — connect your Python API for real training
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Accuracy', value: `${(parseFloat(trainResult.accuracy) * 100).toFixed(1)}%`, color: 'cyan' },
                  { label: 'AUC-ROC', value: trainResult.auc_roc, color: 'purple' },
                  { label: 'Precision', value: `${(parseFloat(trainResult.precision) * 100).toFixed(1)}%`, color: 'emerald' },
                  { label: 'Recall', value: `${(parseFloat(trainResult.recall) * 100).toFixed(1)}%`, color: 'amber' },
                  { label: 'F1 Score', value: trainResult.f1, color: 'rose' },
                  { label: 'Train Time', value: `${trainResult.training_time}s`, color: 'slate' },
                ].map(m => (
                  <Card key={m.label} className="p-4">
                    <div className={`stat-number text-2xl font-bold mb-1 ${
                      m.color === 'cyan' ? 'text-cyan-400' : m.color === 'purple' ? 'text-purple-400' :
                      m.color === 'emerald' ? 'text-emerald-400' : m.color === 'amber' ? 'text-amber-400' :
                      m.color === 'rose' ? 'text-rose-400' : 'text-slate-400'
                    }`}>{m.value}</div>
                    <div className="text-xs text-slate-400">{m.label}</div>
                  </Card>
                ))}
              </div>

              <Card className="p-5">
                <h4 className="font-display font-semibold text-white mb-3 text-sm">Training Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Algorithm', value: trainResult.algorithm?.toUpperCase() },
                    { label: 'Training Samples', value: trainResult.training_samples?.toLocaleString() },
                    { label: 'Test Samples', value: trainResult.test_samples?.toLocaleString() },
                    { label: 'Features', value: trainResult.feature_count },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-slate-500">{r.label}</span>
                      <span className="font-mono text-slate-300">{r.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 bg-emerald-500/5 border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-300 text-sm mb-1">Model Saved Successfully</div>
                    <p className="text-xs text-slate-400">
                      The trained model has been saved to <code className="text-cyan-400 font-mono">models/churn_model.pkl</code>.
                      Restart the prediction API to use the new model.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {!loading && !trainResult && (
            <Card className="p-8">
              <div className="text-center">
                <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 w-fit mx-auto mb-4">
                  <Cpu className="w-10 h-10 text-cyan-400 mx-auto" />
                </div>
                <h3 className="font-display font-bold text-white mb-2">Ready to Train</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Select an algorithm and click <strong className="text-white">Start Training</strong>. 
                  The model will be trained on the Telco churn dataset and saved for predictions.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  <span>Uses src/processor.py → src/model.py pipeline from your codebase</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
