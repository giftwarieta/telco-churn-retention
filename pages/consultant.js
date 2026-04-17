import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { SectionHeader, Card, Button, Badge, EmptyState } from '../components/ui';
import { MessageSquare, Send, User, Bot, Trash2, Copy, Lightbulb, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateStats, addSessionEvent } from '../lib/analytics';

const SYSTEM_CONTEXT = `You are ChurnIQ's expert AI business consultant specializing in telecom customer retention analytics. 
You have deep expertise in:
- Telco churn prediction and analysis (XGBoost, SHAP, LIME explainability)
- Nigerian and African telecom market dynamics
- Customer lifecycle management and retention strategies
- Revenue impact analysis and business ROI from churn reduction
- XAI (Explainable AI) for financial inclusion and credit scoring

When answering:
- Be specific, data-driven, and actionable
- Reference telecom KPIs (ARPU, CLV, NPS, churn rate)
- Suggest concrete retention tactics based on churn drivers
- Keep responses clear and structured
- Use Nigerian/African market context where relevant

Always tie insights back to business outcomes and ROI.`;

const QUICK_PROMPTS = [
  { label: 'Retention Strategy', prompt: 'What are the top 5 retention strategies for customers with Month-to-month contracts showing high churn risk?' },
  { label: 'Churn Drivers', prompt: 'Explain the most common churn drivers in fiber optic internet customers and how to address them' },
  { label: 'ROI of Retention', prompt: 'How do I calculate the ROI of a customer retention campaign if my average ARPU is ₦8,500/month?' },
  { label: 'SHAP Explanation', prompt: 'How should I interpret a SHAP force plot showing tenure as a negative contributor to churn probability?' },
  { label: 'Pricing Impact', prompt: 'What pricing strategies reduce churn without impacting revenue per user?' },
  { label: 'Contract Upgrades', prompt: 'How can I incentivize Month-to-month customers to upgrade to annual contracts?' },
];

async function callPollinationsAI(messages) {
  const conversation = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  const fullPrompt = `${SYSTEM_CONTEXT}\n\nConversation:\n${conversation}\n\nAssistant:`;
  const encoded = encodeURIComponent(fullPrompt);
  const response = await fetch(`https://text.pollinations.ai/${encoded}?model=mistral&seed=42`, {
    method: 'GET',
    headers: { 'Accept': 'text/plain' },
  });
  if (!response.ok) throw new Error('AI request failed');
  return await response.text();
}

function MessageBubble({ msg }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };
  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
        ${msg.role === 'user' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-purple-500/20 border border-purple-500/30'}`}>
        {msg.role === 'user'
          ? <User className="w-4 h-4 text-cyan-400" />
          : <Bot className="w-4 h-4 text-purple-400" />}
      </div>
      <div className={`max-w-[80%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={msg.role === 'user' ? 'chat-user px-4 py-3' : 'chat-assistant px-4 py-3'}>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-600">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={copy} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
            <Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy'}
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');

    const userMsg = { role: 'user', content, timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const replyText = await callPollinationsAI(newMsgs);
      const assistantMsg = { role: 'assistant', content: replyText.trim(), timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
      updateStats({ totalConsultations: 1 });
      addSessionEvent({ type: 'consultation', preview: content.slice(0, 50) });
    } catch (e) {
      const fallback = `I'm having trouble connecting to the AI service right now. Here's what I can tell you about "${content.slice(0, 60)}...":

Based on telco industry best practices:
• Month-to-month customers have 3-5x higher churn rates than annual subscribers
• Fiber optic customers churn more when experiencing service quality issues
• Tenure under 12 months is the highest-risk window for voluntary churn
• Electronic check payment users show 8-12% higher churn vs auto-pay customers

For actionable retention strategies, ensure your FastAPI backend is running and check your internet connection for AI access.`;
      setMessages(prev => [...prev, { role: 'assistant', content: fallback, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Layout title="AI Consultant">
      <SectionHeader
        title="AI Business Consultant"
        subtitle="Powered by Mistral — no API key required"
        icon={MessageSquare}
        action={
          <div className="flex items-center gap-2">
            <Badge color="emerald">Free AI</Badge>
            <Badge color="purple">Mistral</Badge>
          </div>
        }
      />

      <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Quick prompts sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Quick Insights</span>
            </div>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.prompt)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-white/3 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all duration-200 group"
                >
                  <div className="text-xs font-medium text-slate-300 group-hover:text-cyan-300 mb-0.5">{p.label}</div>
                  <div className="text-[10px] text-slate-600 line-clamp-2">{p.prompt.slice(0, 60)}…</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">Model Info</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Using <strong className="text-slate-400">Mistral 7B</strong> via Pollinations.ai — completely free, no signup required.
              Responses are contextual to telecom churn analytics.
            </p>
          </Card>
        </div>

        {/* Chat area */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden p-0">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D45]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm">ChurnIQ Assistant</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                  <span className="text-[10px] text-emerald-400">Online · Mistral 7B</span>
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <Button icon={Trash2} variant="ghost" size="sm" onClick={() => setMessages([])}>
                Clear
              </Button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 mb-4">
                  <Bot className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <h3 className="font-display font-bold text-white mb-2">Ask Anything About Churn</h3>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                    Get expert insights on customer retention, revenue impact, SHAP explanations, and Nigerian telco market dynamics
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {QUICK_PROMPTS.slice(0, 3).map(p => (
                    <button key={p.label} onClick={() => sendMessage(p.prompt)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/20 text-xs text-slate-400 hover:text-purple-300 transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="chat-assistant px-4 py-3">
                      <div className="flex gap-1 items-center h-5">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#1E2D45]">
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about churn strategies, SHAP explanations, ROI calculations... (Enter to send)"
                rows={1}
                className="input-field flex-1 px-4 py-3 rounded-xl text-sm resize-none min-h-[46px] max-h-32"
                style={{ height: 'auto' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
              <Button
                icon={Send}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                loading={loading}
                size="md"
                className="flex-shrink-0 h-[46px]"
              >
                Send
              </Button>
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">
              Powered by Mistral via Pollinations.ai · Free · No API key needed
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
