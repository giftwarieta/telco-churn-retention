import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// StatCard - metric display card
export function StatCard({ label, value, subValue, icon: Icon, trend, trendValue, color = 'cyan', className = '' }) {
  const colorMap = {
    cyan: { bg: 'from-sky-500/12 to-cyan-400/6', border: 'border-sky-500/20', icon: 'text-sky-500', iconBg: 'bg-sky-500/12' },
    emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', icon: 'text-emerald-500', iconBg: 'bg-emerald-500/12' },
    rose: { bg: 'from-rose-500/10 to-rose-500/5', border: 'border-rose-500/20', icon: 'text-rose-500', iconBg: 'bg-rose-500/12' },
    amber: { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', icon: 'text-amber-500', iconBg: 'bg-amber-500/12' },
    purple: { bg: 'from-violet-500/10 to-violet-500/5', border: 'border-violet-500/20', icon: 'text-violet-500', iconBg: 'bg-violet-500/12' },
    slate: { bg: 'from-slate-500/10 to-slate-500/5', border: 'border-slate-500/20', icon: 'text-slate-500', iconBg: 'bg-slate-500/12' },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <div className={`relative overflow-hidden rounded-[28px] border bg-gradient-to-br ${c.bg} p-5 shadow-elevated backdrop-blur-sm ${c.border} ${className}`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 translate-x-6 -translate-y-6">
        {Icon && <Icon className="w-full h-full" />}
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className={`rounded-2xl p-2.5 ${c.iconBg}`}>
          {Icon && <Icon className={`w-5 h-5 ${c.icon}`} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono
            ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : trend < 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'}
          `}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="stat-number mb-1 text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {subValue && <div className="mt-1 text-xs text-slate-500">{subValue}</div>}
    </div>
  );
}

// RiskBadge
export function RiskBadge({ level }) {
  const classes = {
    high: 'risk-high',
    medium: 'risk-medium',
    low: 'risk-low',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${classes[level] || classes.low}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === 'high' ? 'bg-rose-400' : level === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse-slow`} />
      {level?.charAt(0).toUpperCase() + level?.slice(1)} Risk
    </span>
  );
}

// SectionHeader
export function SectionHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-2.5">
            <Icon className="h-5 w-5 text-sky-500" />
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-bold text-white sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0 self-start">{action}</div>}
    </div>
  );
}

// Card wrapper
export function Card({ children, className = '', hoverable = false }) {
  return (
    <div className={`app-panel rounded-[28px] ${hoverable ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/25' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Button
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, loading = false, icon: Icon, className = '' }) {
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary: 'btn-primary rounded-2xl font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-50',
    secondary: 'rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] font-medium text-slate-300 transition-all duration-200 hover:border-sky-500/20 hover:bg-sky-500/10',
    ghost: 'rounded-2xl text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-white',
    danger: 'rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 transition-all duration-200 hover:bg-rose-500/18',
    success: 'rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 transition-all duration-200 hover:bg-emerald-500/18',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  );
}

// Progress bar
export function ProgressBar({ value, max = 100, color = 'cyan', label, showValue = true }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colors = {
    cyan: 'bg-gradient-to-r from-sky-600 to-cyan-400',
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    rose: 'bg-gradient-to-r from-rose-600 to-rose-400',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-400',
    purple: 'bg-gradient-to-r from-violet-600 to-violet-400',
    slate: 'bg-gradient-to-r from-slate-500 to-slate-400',
  };
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && <span className="text-xs font-mono text-slate-300">{pct.toFixed(1)}%</span>}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/60">
        <div
          className={`h-full ${colors[color] || colors.cyan} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-5">
        {Icon && <Icon className="w-8 h-8 text-slate-500" />}
      </div>
      <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  );
}

// Loading spinner
export function Spinner({ size = 'md', color = 'cyan' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  const colors = { cyan: 'border-cyan-500', white: 'border-white', slate: 'border-slate-400' };
  return (
    <div className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent rounded-full animate-spin`} />
  );
}

// Feature badge
export function Badge({ children, color = 'cyan' }) {
  const colors = {
    cyan: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
    purple: 'border-violet-500/20 bg-violet-500/10 text-violet-500',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-500',
    slate: 'border-[color:var(--border)] bg-[color:var(--bg-soft)] text-slate-500',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-mono ${colors[color] || colors.cyan}`}>
      {children}
    </span>
  );
}
