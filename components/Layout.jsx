import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Brain, TrendingUp, MessageSquare,
  DollarSign, Cpu, BarChart3, Menu, X, Wifi, WifiOff,
  ChevronRight, Activity, Zap
} from 'lucide-react';
import { trackPageView } from '../lib/analytics';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, tag: null },
  { href: '/predict', label: 'Predict', icon: Brain, tag: 'ML' },
  { href: '/insights', label: 'XAI Insights', icon: TrendingUp, tag: 'SHAP' },
  { href: '/consultant', label: 'AI Consultant', icon: MessageSquare, tag: 'AI' },
  { href: '/roi', label: 'Business ROI', icon: DollarSign, tag: null },
  { href: '/train', label: 'Train Model', icon: Cpu, tag: null },
  { href: '/stats', label: 'App Stats', icon: BarChart3, tag: 'NEW' },
];

export default function Layout({ children, title = 'ChurnIQ' }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    trackPageView(router.pathname);
  }, [router.pathname]);

  useEffect(() => {
    async function checkAPI() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        setApiStatus(res.ok ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    }
    checkAPI();
    const interval = setInterval(checkAPI, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  return (
    <div className="min-h-screen bg-[#040812] grid-bg noise-bg">
      {/* Hero glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 overlay-dark z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-50 flex flex-col
        bg-[#080E1C]/95 border-r border-[#1E2D45]
        backdrop-filter backdrop-blur-xl
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E2D45]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-glow-cyan">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-1 bg-cyan-500/20 rounded-xl blur-sm -z-10" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white tracking-tight">ChurnIQ</span>
              <div className="text-[10px] text-cyan-500 font-mono uppercase tracking-widest">Telco Analytics</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Status */}
        <div className="px-4 py-3 border-b border-[#1E2D45]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0D1526] border border-[#1E2D45]">
            {apiStatus === 'online' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono">API Online</span>
              </>
            ) : apiStatus === 'offline' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs text-rose-400 font-mono">API Offline</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400 font-mono">Connecting...</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200
                  ${isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-full" />
                )}
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} style={{width:'18px',height:'18px'}} />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.tag && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md
                    ${item.tag === 'NEW' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      item.tag === 'AI' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      'bg-slate-700/50 text-slate-400 border border-slate-600/30'}
                  `}>
                    {item.tag}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E2D45]">
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400">Powered by XAI</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              SHAP + LIME explainability for transparent predictions
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col relative z-10">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#080E1C]/90 backdrop-blur-xl border-b border-[#1E2D45]">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white">ChurnIQ</span>
          </div>
          <div className="w-8 h-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
