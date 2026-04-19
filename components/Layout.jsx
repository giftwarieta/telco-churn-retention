import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Activity,
  BarChart3,
  Brain,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  MessageSquare,
  Moon,
  MoreHorizontal,
  SunMedium,
  TrendingUp,
  Wifi,
  WifiOff,
  UserCircle,
  Wrench,
  X,
} from 'lucide-react';
import { trackPageView } from '../lib/analytics';
import { DataSourceChip, useDataSource } from './DataOnboarding';
import { getApiBaseUrl, getApiMode } from '../lib/api';

const allNavItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/predict', label: 'Predict', icon: Brain },
  { href: '/insights', label: 'Insights', icon: TrendingUp },
  { href: '/consultant', label: 'Consultant', icon: MessageSquare },
  { href: '/roi', label: 'ROI', icon: DollarSign },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/about', label: 'About', icon: UserCircle },
];

function ThemeToggle({ theme, onToggle, compact = false }) {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : 'px-3 py-2.5'} rounded-2xl`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      type="button"
    >
      <span className={`theme-toggle-icon ${isDark ? 'theme-toggle-icon-dark' : 'theme-toggle-icon-light'}`}>
        {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
      {!compact && (
        <span className="text-sm font-medium">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  );
}

export default function Layout({ children, title = 'ChurnIQ' }) {
  const router = useRouter();
  const dataSource = useDataSource();
  const [theme, setTheme] = useState('dark');
  const [apiStatus, setApiStatus] = useState('checking');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    trackPageView(router.pathname);
  }, [router.pathname]);

  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('churniq-theme') : null;
    const preferredTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
    const nextTheme = storedTheme || preferredTheme;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    const mode = getApiMode();

    if (mode === 'unconfigured') {
      setApiStatus('setup');
      return undefined;
    }

    let mounted = true;

    async function checkApi() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!mounted) return;
        setApiStatus(response.ok ? 'online' : 'offline');
      } catch {
        if (mounted) {
          setApiStatus('offline');
        }
      }
    }

    checkApi();
    const interval = setInterval(checkApi, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [router.pathname]);

  const apiMeta = useMemo(() => {
    if (apiStatus === 'online') {
      return { label: 'Live backend', textClass: 'text-emerald-500', iconClass: 'text-emerald-500', dotClass: 'bg-emerald-500' };
    }
    if (apiStatus === 'setup') {
      return { label: 'Backend setup needed', textClass: 'text-amber-500', iconClass: 'text-amber-500', dotClass: 'bg-amber-500' };
    }
    if (apiStatus === 'checking') {
      return { label: 'Checking connection', textClass: 'text-sky-500', iconClass: 'text-sky-500', dotClass: 'bg-sky-500' };
    }
    return { label: 'Preview mode', textClass: 'text-rose-500', iconClass: 'text-rose-500', dotClass: 'bg-rose-500' };
  }, [apiStatus]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('churniq-theme', nextTheme);
  };

  const navItems = useMemo(() => {
    if (dataSource === 'custom') {
      return [
        ...allNavItems.slice(0, 5),
        { href: '/train', label: 'Train', icon: Wrench },
        ...allNavItems.slice(5),
      ];
    }
    return allNavItems;
  }, [dataSource]);
  const mobilePrimaryNav = navItems.slice(0, 3);
  const mobileMoreNav = navItems.slice(3);
  const moreActive = mobileMoreNav.some((item) => item.href === router.pathname);
  const faviconHref = theme === 'light' ? '/favicon-light.svg' : '/favicon-dark.svg';

  return (
    <>
      <Head>
        <title>{`${title} | ChurnIQ`}</title>
        <meta name="theme-color" content={theme === 'light' ? '#f8fafc' : '#07111f'} />
        <link rel="icon" href={faviconHref} type="image/svg+xml" />
      </Head>

      <div className="app-shell min-h-screen grid-bg noise-bg">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="floating-orb floating-orb-a" />
          <div className="floating-orb floating-orb-b" />
          <div className="floating-orb floating-orb-c" />
        </div>

        {moreMenuOpen && (
          <div className="app-overlay fixed inset-0 z-40 lg:hidden" onClick={() => setMoreMenuOpen(false)} />
        )}

        <aside className="app-sidebar fixed inset-y-0 left-0 z-50 hidden w-72 flex-col lg:flex">
          <div className="border-b border-[color:var(--border)] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className={`brand-mark ${theme === 'light' ? 'brand-mark-light' : 'brand-mark-dark'}`}>
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-display text-lg font-bold tracking-tight text-white">ChurnIQ</div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Retention Studio</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="app-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</div>
                  <div className="mt-1 text-sm text-slate-400">Churn analytics dashboard</div>
                </div>
                <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-3 py-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${apiMeta.dotClass} ${apiStatus === 'checking' ? 'animate-pulse' : ''}`} />
                {apiStatus === 'online' ? (
                  <Wifi className={`h-4 w-4 ${apiMeta.iconClass}`} />
                ) : (
                  <WifiOff className={`h-4 w-4 ${apiMeta.iconClass}`} />
                )}
                <span className={`text-xs font-medium ${apiMeta.textClass}`}>{apiMeta.label}</span>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  >
                    <span className={`nav-icon ${isActive ? 'nav-icon-active' : ''}`}>
                      <Icon className="h-4 w-4" style={{ width: '18px', height: '18px' }} />
                    </span>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 text-sky-500" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-[color:var(--border)] px-5 py-5">
            <div className="mb-3">
              <DataSourceChip />
            </div>
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Builder</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Personal project by <a href="https://giftwarieta.com.ng" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-sky-500/40 underline-offset-4 hover:text-sky-500">Warieta Gift Ejovwoke</a>.
              </p>
            </div>
          </div>
        </aside>

        <div className="relative z-10 flex min-h-screen flex-col lg:ml-72">
          <header className="app-topbar sticky top-0 z-30 lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <div className={`brand-mark brand-mark-sm ${theme === 'light' ? 'brand-mark-light' : 'brand-mark-dark'}`}>
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-display text-base font-bold text-white">ChurnIQ</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Retention Studio</div>
              </div>
            </Link>

            <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
          </header>

          <main className="relative flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
            <div className="mx-auto w-full max-w-[1500px]">
              {children}
            </div>
          </main>

          <footer className="border-t border-[color:var(--border)] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-6">
            <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>Built by <a href="https://giftwarieta.com.ng" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-sky-500/40 underline-offset-4 hover:text-sky-500">Warieta Gift Ejovwoke</a>.</p>
              <p>Personal project focused on churn prediction, retention strategy, and explainable analytics.</p>
            </div>
          </footer>
        </div>

        <nav className="bottom-nav lg:hidden">
          <div className="grid grid-cols-4 gap-2 px-3 py-3">
            {mobilePrimaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`bottom-nav-item bottom-nav-item-grid ${isActive ? 'bottom-nav-item-active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className={`bottom-nav-item bottom-nav-item-grid ${moreActive || moreMenuOpen ? 'bottom-nav-item-active' : ''}`}
              aria-label="Open more navigation items"
              aria-expanded={moreMenuOpen}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span>More</span>
            </button>
          </div>
        </nav>

        {moreMenuOpen && (
          <div className="mobile-more-modal lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation items">
            <div className="mobile-more-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">More</div>
                  <h3 className="font-display mt-1 text-lg font-semibold text-white">Navigate</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(false)}
                  className="mobile-more-close"
                  aria-label="Close more navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-2">
                {mobileMoreNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`mobile-more-link ${isActive ? 'mobile-more-link-active' : ''}`}
                    >
                      <span className={`nav-icon ${isActive ? 'nav-icon-active' : ''}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 text-sky-500" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
