import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Globe, Youtube, Twitter, Linkedin, Brain, Code2, Database, Server, Cpu, Layers, ExternalLink } from 'lucide-react';

const SKILLS = [
  { icon: Brain, label: 'Machine Learning & XAI', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { icon: Database, label: 'Data Science & Analytics', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { icon: Server, label: 'FastAPI & Python Backends', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: Code2, label: 'Web Development', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: Layers, label: 'SaaS Product Architecture', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { icon: Cpu, label: 'AI Systems Engineering', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
];

const SOCIAL = [
  { href: 'https://giftwarieta.com.ng', icon: Globe, label: 'giftwarieta.com.ng', color: 'hover:text-sky-400' },
  { href: 'https://linkedin.com/in/giftwarieta/', icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-400' },
  { href: 'https://x.com/we_gift', icon: Twitter, label: '@we_gift', color: 'hover:text-slate-200' },
  { href: 'https://youtube.com/@giftwarieta', icon: Youtube, label: 'YouTube', color: 'hover:text-rose-400' },
];

const PROJECTS = [
  {
    name: 'Card Brand Identifier',
    description: 'Transactional intelligence project focused on identifying card schemes to improve card analytics and decision support.',
    href: 'https://cardbin.giftwarieta.com.ng',
    accent: 'cyan',
  },
  {
    name: 'Certizent',
    description: 'Certificate validation platform for verifying academic and professional credentials.',
    href: 'https://certizent.com',
    accent: 'amber',
  },
  {
    name: 'ChurnIQ',
    description: 'Explainable AI-powered telecom churn prediction and retention strategy dashboard.',
    accent: 'emerald',
  },
];

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <Head>
        <title>About the Developer — ChurnIQ</title>
        <meta name="description" content="Warieta Gift Ejovwoke — AI and Data Intelligence Leader, builder of intelligent systems." />
      </Head>

      <div className="min-h-screen bg-[#070E1A] text-white">
        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-[#1E2D45]/60 bg-[#070E1A]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sm font-bold text-sky-400">C</span>
              <span className="font-semibold text-sm text-white">ChurnIQ</span>
            </Link>
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
              ← Back to dashboard
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-5 py-14">
          {/* Hero */}
          <div className="mb-14 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="relative inline-block">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 opacity-70 blur-sm" />
                <img
                  src="https://raw.githubusercontent.com/giftwarieta/Python/main/assets/mydp.png"
                  alt="Warieta Gift Ejovwoke"
                  className="relative h-28 w-28 rounded-full border-2 border-[#1E2D45] object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.avatar-fallback').style.display = 'flex';
                  }}
                />
                <div className="avatar-fallback relative hidden h-28 w-28 items-center justify-center rounded-full border-2 border-[#1E2D45] bg-gradient-to-br from-sky-600 to-cyan-500 text-3xl font-bold text-white">
                  WG
                </div>
              </div>
            </div>

            <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Warieta Gift Ejovwoke
              </h1>
              <p className="mb-4 text-base font-medium text-sky-400 tracking-wide">
                AI and Data Intelligence Leader
              </p>
              <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-slate-400">
                Building intelligent systems at the intersection of machine learning, product design,
                and scalable engineering. Focused on explainable AI, fintech, and African digital infrastructure.
              </p>

              {/* Social links */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {SOCIAL.map(({ href, icon: Icon, label, color }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={`flex items-center gap-1.5 rounded-lg border border-[#1E2D45] bg-[#0D1526] px-3.5 py-2 text-xs text-slate-400 transition-all duration-200 ${color} hover:border-slate-600`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* About ChurnIQ */}
          <section className={`mb-12 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/8 to-transparent p-7">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-sky-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-sky-400">About This Project</h2>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-slate-300">
                <strong className="text-white">ChurnIQ</strong> is an end-to-end explainable AI platform for telecom churn prediction and retention strategy. 
                It demonstrates how machine learning models (XGBoost), explainability methods (SHAP, LIME), and business intelligence 
                can be integrated into a single analyst-facing dashboard.
              </p>
              <p className="text-sm leading-relaxed text-slate-400">
                It brings predictive modeling, explainability, and business decision support into a single workspace for churn-focused teams.
              </p>
            </div>
          </section>

          {/* Skills */}
          <section className={`mb-12 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-500">Expertise</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SKILLS.map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className={`flex items-center gap-3 rounded-xl border ${bg} p-4`}>
                  <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                  <span className="text-xs font-medium text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Projects */}
          <section className={`mb-12 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-500">Selected Work</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {PROJECTS.map((proj) => {
                const accentClass = {
                  cyan: 'border-cyan-500/25 from-cyan-500/8',
                  emerald: 'border-emerald-500/25 from-emerald-500/8',
                  amber: 'border-amber-500/25 from-amber-500/8',
                }[proj.accent];
                const badgeColor = proj.accent;

                return (
                  <div
                    key={proj.name}
                    className={`group rounded-xl border ${accentClass} bg-gradient-to-br to-transparent p-5 transition-all duration-200 hover:border-opacity-60`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-white">{proj.name}</h3>
                      {proj.href && (
                        <a href={proj.href} target="_blank" rel="noreferrer noopener" className="text-slate-600 hover:text-slate-300 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="mb-4 text-xs leading-relaxed text-slate-400">{proj.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <div className={`text-center transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-4 rounded-2xl border border-[#1E2D45] bg-[#0D1526] px-6 py-4">
              <div>
                <p className="text-sm font-medium text-white">Interested in collaborating?</p>
                <p className="text-xs text-slate-500">Open to consulting, research, and product engineering partnerships.</p>
              </div>
              <a
                href="https://giftwarieta.com.ng"
                target="_blank"
                rel="noreferrer noopener"
                className="flex-shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-400"
              >
                Visit Site
              </a>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#1E2D45]/60 py-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Warieta Gift Ejovwoke.
        </footer>
      </div>
    </>
  );
}
