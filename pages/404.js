import Link from 'next/link';
import { Activity, ArrowLeft } from 'lucide-react';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-[#040812] grid-bg flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>
      <div className="text-center relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center mx-auto mb-6 shadow-glow-cyan">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <div className="font-mono text-cyan-500 text-sm uppercase tracking-widest mb-2">Error 404</div>
        <h1 className="font-display font-bold text-4xl text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          This signal got lost in the network. The page you're looking for doesn't exist.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 btn-primary text-white font-semibold rounded-xl">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
