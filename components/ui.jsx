import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// StatCard - metric display card
export function StatCard({ label, value, subValue, icon: Icon, trend, trendValue, color = 'cyan', className = '' }) {
  const colorMap = {
    cyan: { bg: 'from-cyan-500/10 to-cyan-500/5', border: 'border-cyan-500/20', icon: 'text-cyan-400', iconBg: 'bg-cyan-500/15' },
    emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', icon: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
    rose: { bg: 'from-rose-500/10 to-rose-500/5', border: 'border-rose-500/20', icon: 'text-rose-400', iconBg: 'bg-rose-500/15' },
    amber: { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', icon: 'text-amber-400', iconBg: 'bg-amber-500/15' },
    purple: { bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', icon: 'text-purple-400', iconBg: 'bg-purple-500/15' },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-5 ${className}`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 translate-x-6 -translate-y-6">
        {Icon && <Icon className="w-full h-full" />}
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${c.iconBg}`}>
          {Icon && <Icon className={`w-5 h-5 ${c.icon}`} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg
            ${trend > 0 ? 'text-emerald-400 bg-emerald-500/10' : trend < 0 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 bg-slate-700/30'}
          `}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="stat-number text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {subValue && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
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
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
        )}
        <div>
          <h2 className="font-display font-bold text-xl text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Card wrapper
export function Card({ children, className = '', hoverable = false }) {
  return (
    <div className={`bg-[#0D1526] border border-[#1E2D45] rounded-2xl ${hoverable ? 'hover:border-cyan-500/30 transition-colors duration-200' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Button
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, loading = false, icon: Icon, className = '' }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary: 'btn-primary text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all duration-200',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all duration-200',
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
    cyan: 'bg-gradient-to-r from-cyan-600 to-cyan-400',
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    rose: 'bg-gradient-to-r from-rose-600 to-rose-400',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-400',
    purple: 'bg-gradient-to-r from-purple-600 to-purple-400',
  };
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && <span className="text-xs font-mono text-slate-300">{pct.toFixed(1)}%</span>}
        </div>
      )}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
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
      <div className="p-5 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
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
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    slate: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${colors[color] || colors.cyan}`}>
      {children}
    </span>
  );
}
