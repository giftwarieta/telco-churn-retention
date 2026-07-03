import Head from 'next/head';
import { useEffect, useState } from 'react';
import { Globe, Youtube, Twitter, Linkedin, Brain, Code2, Database, Server, Cpu, Layers, ExternalLink, User } from 'lucide-react';
import Layout from '../components/Layout';
import { Card, SectionHeader, Badge, Button } from '../components/ui';

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
    <Layout title="About">
      <Head>
        <title>About the Developer — ChurnIQ</title>
        <meta name="description" content="Warieta Gift Ejovwoke — AI and Data Intelligence Leader, builder of intelligent systems." />
      </Head>

      <SectionHeader
        title="About the Project & Developer"
        subtitle="Learn more about the intent behind ChurnIQ and the engineering ecosystem powering it."
        icon={User}
      />

      <div className="space-y-6">
        {/* Redesigned Profile & Project Split Card */}
        <Card className="p-6 sm:p-8 bg-[color:var(--bg-card)] border border-[color:var(--border)] overflow-hidden relative">
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            
            {/* Left Side: Developer Identity (5-Columns wide on desktop) */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 lg:border-r lg:border-[color:var(--border)] lg:pr-6">
              {/* Animated Avatar Box */}
              <div className={`flex-shrink-0 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="relative inline-block">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-400 opacity-60 blur-sm" />
                  <img
                    src="https://raw.githubusercontent.com/giftwarieta/Python/main/assets/mydp.png"
                    alt="Warieta Gift Ejovwoke"
                    className="relative h-20 w-20 rounded-full border-2 border-[color:var(--border)] object-cover bg-slate-900"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.querySelector('.avatar-fallback').style.display = 'flex';
                    }}
                  />
                  <div className="avatar-fallback relative hidden h-20 w-20 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-gradient-to-br from-sky-600 to-cyan-500 text-xl font-bold text-white">
                    WG
                  </div>
                </div>
              </div>

              {/* Text Meta Info */}
              <div className={`flex-1 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h2 className="font-display text-xl font-bold text-white tracking-tight">
                  Warieta Gift Ejovwoke
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                  AI & Data Intelligence Leader
                </p>
                
                {/* Standardized Social Badges */}
                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  {SOCIAL.map(({ href, icon: Icon, label, color }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={`flex items-center gap-1 rounded-lg border border-[color:var(--border)] bg-white/3 px-2.5 py-1 text-[11px] text-slate-400 transition-all duration-200 ${color} hover:bg-white/5 hover:border-slate-500`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{label === 'giftwarieta.com.ng' ? 'Portfolio' : label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Contextual System Overview (7-Columns wide on desktop) */}
            <div className={`lg:col-span-7 flex flex-col justify-center transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge color="cyan">Platform Scope</Badge>
                  <span className="text-[11px] font-mono text-slate-500">Project: ChurnIQ</span>
                </div>
                
                <p className="text-sm leading-relaxed text-slate-300">
                  Building intelligent systems at the intersection of machine learning, crisp product architecture, and scalable engineering. This project anchors complex explainability frameworks (<span className="text-white font-medium">SHAP, LIME</span>) into real-world commercial retention loops.
                </p>
                
                <p className="text-xs leading-relaxed text-slate-400 hidden sm:block">
                  Focused on transitioning deep predictive modeling output out of isolated local data science notebooks into proactive, high-fidelity engineering systems optimized for operational infrastructure.
                </p>
              </div>
            </div>

          </div>
        </Card>

        {/* Core Expertise Grid */}
        <section className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Expertise Core</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className={`flex items-center gap-3 rounded-2xl border ${bg} p-4 bg-white/3`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <span className="text-xs font-medium text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Selected Projects Showcase */}
        <section className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Selected Work</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {PROJECTS.map((proj) => {
              const accentClass = {
                cyan: 'border-cyan-500/25 from-cyan-500/6',
                emerald: 'border-emerald-500/25 from-emerald-500/6',
                amber: 'border-amber-500/25 from-amber-500/6',
              }[proj.accent];

              const badgeColor = proj.accent === 'emerald' ? 'emerald' : proj.accent === 'cyan' ? 'cyan' : 'amber';

              return (
                <Card
                  key={proj.name}
                  className={`flex flex-col justify-between border ${accentClass} bg-gradient-to-br to-transparent p-5`}
                >
                  <div>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white">{proj.name}</h4>
                      {proj.href && (
                        <a href={proj.href} target="_blank" rel="noreferrer noopener" className="text-slate-500 hover:text-slate-300 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">{proj.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge color={badgeColor}>{proj.accent}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Contact/Collaboration CTA Panel */}
        <div className={`transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Card className="p-5 border-dashed border-[color:var(--border)] bg-white/1">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <p className="text-sm font-medium text-white">Interested in collaborating?</p>
                <p className="text-xs text-slate-500 mt-0.5">Open to consulting, research, and product engineering partnerships.</p>
              </div>
              <a href="https://giftwarieta.com.ng" target="_blank" rel="noreferrer noopener" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto">Visit Portfolio</Button>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}