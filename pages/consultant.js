import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { Badge, Button, Card, SectionHeader } from '../components/ui';
import { Copy, Lightbulb, MessageSquare, Send, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateStats, addSessionEvent } from '../lib/analytics';
import { chatWithConsultant } from '../lib/api';

const QUICK_PROMPTS = [
  { label: 'Retention Strategy', prompt: 'What are the top retention strategies for month-to-month customers showing high churn risk?' },
  { label: 'Churn Drivers', prompt: 'Explain the most common churn drivers in fiber internet customers and how to respond.' },
  { label: 'ROI Planning', prompt: 'How should I estimate the ROI of a churn reduction campaign for a telecom business?' },
  { label: 'SHAP Interpretation', prompt: 'How do I explain a SHAP result where tenure reduces churn probability?' },
  { label: 'Pricing Moves', prompt: 'What pricing changes usually reduce churn without damaging revenue?' },
  { label: 'Contract Upgrades', prompt: 'What incentives help month-to-month customers move to longer contracts?' },
];

function sanitizeConsultantReply(reply) {
  const text = (reply || '').trim();
  if (!text) {
    return '';
  }

  const normalized = text.toLowerCase();
  const blockedPatterns = [
    'important notice',
    'legacy text api',
    'enter.pollinations.ai',
    'authenticated users',
    'anonymous requests to text.pollinations.ai',
    'internal server error',
    'traceback',
    '<!doctype html',
    '<html',
  ];

  return blockedPatterns.some((pattern) => normalized.includes(pattern)) ? '' : text;
}

function ConsultantAvatar({ className = '' }) {
  return (
    <img
      src="/images/consultant-avatar.png"
      alt="Consultant avatar"
      className={`h-full w-full rounded-full object-cover ${className}`}
    />
  );
}

function MessageBubble({ msg }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    toast.success('Response copied');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border ${
          msg.role === 'user'
            ? 'border-sky-500/20 bg-sky-500/10'
            : 'overflow-hidden rounded-full border-emerald-500/20 bg-emerald-500/10'
        }`}
      >
        {msg.role === 'user'
          ? <User className="h-4 w-4 text-sky-500" />
          : <ConsultantAvatar />}
      </div>

      <div className={`group flex max-w-[88%] flex-col gap-1 sm:max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`${msg.role === 'user' ? 'chat-user' : 'chat-assistant'} px-4 py-3`}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{msg.content}</p>
        </div>

        <div className={`flex items-center gap-2 text-[10px] text-slate-500 opacity-80 transition group-hover:opacity-100 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button onClick={copy} className="inline-flex items-center gap-1 hover:text-slate-300" type="button">
            <Copy className="h-3 w-3" />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsultantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    setInput('');
    const userMessage = { role: 'user', content, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const data = await chatWithConsultant(nextMessages, { topic: 'telecom churn analytics' });
      const cleanReply = sanitizeConsultantReply(data.reply);
      const assistantMessage = {
        role: 'assistant',
        content: cleanReply || `Here is a practical starting point for "${content.slice(0, 60)}": focus on contract type, first-year tenure, payment friction, service quality complaints, and save-offer timing. Prioritize the highest-risk customers with a specific incentive, a service check, and a follow-up cadence tied to ARPU and churn probability.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      updateStats({ totalConsultations: 1 });
      addSessionEvent({ type: 'consultation', preview: content.slice(0, 60) });
    } catch {
      const fallbackMessage = {
        role: 'assistant',
        content: `Here is a practical starting point for "${content.slice(0, 60)}": focus on contract type, first-year tenure, payment friction, service quality complaints, and save-offer timing. Prioritize the highest-risk customers with a specific incentive, a service check, and a follow-up cadence tied to ARPU and churn probability.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      toast('A guided response was shown to keep the workflow moving.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const resizeTextarea = (event) => {
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 132)}px`;
  };

  return (
    <Layout title="AI Consultant">
      <SectionHeader
        title="AI Business Consultant"
        subtitle="Ask for retention tactics, churn interpretation, ROI framing, or telecom strategy support."
        icon={MessageSquare}
        action={<Badge color="emerald">Advisory Workspace</Badge>}
      />

      <div className="flex flex-col gap-4 lg:grid lg:min-h-[calc(100svh-13rem)] lg:grid-cols-4 lg:items-start lg:gap-6">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-white">Quick prompts</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => sendMessage(item.prompt)}
                  disabled={loading}
                  type="button"
                  className="rounded-2xl border border-transparent bg-white/3 px-3 py-3 text-left transition-all duration-200 hover:border-sky-500/20 hover:bg-sky-500/8"
                >
                  <div className="mb-1 text-sm font-medium text-slate-300">{item.label}</div>
                  <div className="line-clamp-2 text-xs leading-relaxed text-slate-500">{item.prompt}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Coverage</div>
            <p className="text-sm leading-relaxed text-slate-400">
              Best for churn drivers, retention design, customer communication ideas, explainability interpretation, and business impact framing.
            </p>
          </Card>
        </div>

        <Card className="flex min-h-[68svh] flex-col overflow-hidden p-0 lg:col-span-3 lg:min-h-[calc(100svh-15rem)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/12">
                <ConsultantAvatar />
              </div>
              <div>
                <div className="font-display text-sm font-semibold text-white sm:text-base">Consultant Chat</div>
                <div className="text-xs text-slate-500">Business-focused telecom retention guidance</div>
              </div>
            </div>

            {messages.length > 0 && (
              <Button icon={Trash2} variant="ghost" size="sm" onClick={() => setMessages([])}>
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <div className="mb-5 rounded-[32px] border border-emerald-500/20 bg-emerald-500/6 p-6">
                  <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border border-emerald-500/20">
                    <ConsultantAvatar />
                  </div>
                  <h3 className="font-display mb-2 text-2xl font-bold text-white">Start the conversation</h3>
                  <p className="max-w-md text-sm leading-relaxed text-slate-400">
                    Ask about churn risk patterns, campaign priorities, explainability outputs, offer design, or revenue impact.
                  </p>
                </div>

                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.slice(0, 4).map((item) => (
                    <button
                      key={item.label}
                      onClick={() => sendMessage(item.prompt)}
                      type="button"
                      className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-emerald-500/20 hover:text-emerald-500"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <MessageBubble key={`${message.timestamp}-${index}`} msg={message} />
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/10">
                      <ConsultantAvatar />
                    </div>
                    <div className="chat-assistant px-4 py-3">
                      <div className="flex h-5 items-center gap-1">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
                            style={{ animationDelay: `${dot * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-[color:var(--border)] px-4 py-4 sm:px-5">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                onInput={resizeTextarea}
                placeholder="Ask about retention playbooks, churn drivers, pricing, or SHAP insights..."
                rows={1}
                className="input-field min-h-[50px] max-h-[132px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm"
              />
              <Button
                icon={Send}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                loading={loading}
                className="h-[50px] flex-shrink-0"
              >
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
