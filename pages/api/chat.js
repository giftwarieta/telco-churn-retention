// pages/api/chat.js - AI Consultant endpoint

const BLOCKED_REPLY_PATTERNS = [
  'important notice',
  'legacy text api',
  'this service has been deprecated',
  'enter.pollinations.ai',
  'anonymous requests to text.pollinations.ai',
  'authenticated users',
  'api key required',
  'login and token management have been disabled',
  '<!doctype html',
  '<html',
  'traceback',
  'internal server error',
  'service unavailable',
  'nginx',
  'cloudflare',
];

const TERM_DEFINITIONS = {
  arpu: {
    full: 'Average Revenue Per User',
    explanation: 'ARPU measures the average revenue earned from each customer or subscriber over a specific period, usually monthly.',
    whyItMatters: 'In telecom, ARPU helps you understand customer value, compare segments, and estimate how much revenue is at risk when customers churn.',
    formula: 'ARPU = total revenue in a period / total active users in that period',
    usage: 'If ARPU is high for a segment, retaining those customers usually has a bigger revenue impact.',
  },
  clv: {
    full: 'Customer Lifetime Value',
    explanation: 'CLV estimates the total value a customer is expected to generate over the full relationship with the business.',
    whyItMatters: 'It helps you decide how much retention spend is justified for a given customer segment.',
    formula: 'A simple view is CLV = average monthly value x expected customer lifespan',
    usage: 'High-CLV customers can justify more proactive save offers or service interventions.',
  },
  nps: {
    full: 'Net Promoter Score',
    explanation: 'NPS measures customer loyalty by asking how likely customers are to recommend your company.',
    whyItMatters: 'It is useful as an early signal of satisfaction problems that can later turn into churn.',
    formula: 'NPS = % promoters - % detractors',
    usage: 'A falling NPS in a telecom segment can point to service, billing, or support issues before churn spikes.',
  },
  roi: {
    full: 'Return on Investment',
    explanation: 'ROI shows whether the financial return from an action is worth the cost of that action.',
    whyItMatters: 'In retention, it helps you judge whether a campaign protects enough revenue to justify incentives, discounts, or service costs.',
    formula: 'ROI = (return - cost) / cost',
    usage: 'Use ROI to compare retention campaigns across segments or offer types.',
  },
  shap: {
    full: 'SHapley Additive exPlanations',
    explanation: 'SHAP explains how each feature pushes a prediction up or down compared with the model baseline.',
    whyItMatters: 'It turns a churn score into a business story you can act on.',
    formula: 'There is no simple business formula; it is an explainability method based on contribution values.',
    usage: 'If contract type has a strong positive SHAP value, it means that feature is increasing churn risk for that prediction.',
  },
  lime: {
    full: 'Local Interpretable Model-agnostic Explanations',
    explanation: 'LIME explains a single prediction by approximating the model locally around that customer or case.',
    whyItMatters: 'It helps you understand why one specific customer was scored as high or low risk.',
    formula: 'There is no single business formula; it is a local explanation technique.',
    usage: 'Use LIME when you want to explain one customer decision in plain language.',
  },
  churn: {
    full: 'Customer Churn',
    explanation: 'Churn means customers leaving the service, canceling, or becoming inactive.',
    whyItMatters: 'It directly affects recurring revenue, growth efficiency, and customer acquisition payback.',
    formula: 'Churn rate = customers lost during a period / customers at the start of the period',
    usage: 'A rising churn rate is usually a sign of pricing, service quality, contract, or support issues.',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], context = {} } = req.body;
  const latestUserMessage = getLatestUserMessage(messages);
  const directAnswer = getDirectConsultantAnswer(messages);

  if (directAnswer) {
    return res.status(200).json({ reply: directAnswer, model: 'local' });
  }

  const analysis = analyzeQuery(latestUserMessage);
  const webInsights = await fetchWebInsights(latestUserMessage, analysis, context);
  const systemPrompt = buildSystemPrompt(analysis, context, webInsights);

  try {
    const conversationText = buildConversation(messages);
    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationText}\n\nAssistant:`;
    const encodedPrompt = encodeURIComponent(fullPrompt);

    const response = await fetch(
      `https://text.pollinations.ai/${encodedPrompt}?model=mistral&seed=${Date.now() % 1000}`,
      {
        method: 'GET',
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.status}`);
    }

    const text = await response.text();
    const reply = sanitizeAssistantReply(text);

    if (!reply) {
      throw new Error('Provider returned a service notice instead of a chat answer');
    }

    return res.status(200).json({ reply, model: 'mistral' });
  } catch {
    return res.status(200).json({
      reply: generateFallbackResponse(latestUserMessage, analysis, webInsights),
      model: 'fallback',
      offline: true,
    });
  }
}

function getLatestUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() || '';
}

function getRecentUserMessages(messages) {
  return messages.filter((message) => message.role === 'user').map((message) => message.content?.trim() || '').filter(Boolean);
}

function getDirectConsultantAnswer(messages) {
  const userMessages = getRecentUserMessages(messages);
  const latest = userMessages[userMessages.length - 1] || '';
  const previous = userMessages[userMessages.length - 2] || '';
  const latestNormalized = latest.toLowerCase();

  const latestTerm = extractKnownTerm(latest);
  const previousTerm = extractKnownTerm(previous);
  const activeTerm = latestTerm || (
    /\b(full meaning|meaning|expand|what does that mean|define it|explain that)\b/i.test(latest) ? previousTerm : null
  );

  if (activeTerm) {
    return buildDefinitionAnswer(activeTerm);
  }

  if (/^\s*what is\s+[a-z]{2,10}\??\s*$/i.test(latest)) {
    const unknownTerm = latest.replace(/^\s*what is\s+/i, '').replace(/\?/g, '').trim().toUpperCase();
    return `I do not have that term in my telecom glossary yet. If you want, I can still explain it in business context if you tell me whether it relates to churn, finance, explainability, or customer experience.`;
  }

  if (/^\s*(tell me the full meaning|what is the full meaning|expand it|what does it stand for)\??\s*$/i.test(latest) && previousTerm) {
    return buildDefinitionAnswer(previousTerm);
  }

  return '';
}

function extractKnownTerm(text = '') {
  const normalized = text.toLowerCase();
  return Object.keys(TERM_DEFINITIONS).find((term) => new RegExp(`\\b${term}\\b`, 'i').test(normalized)) || '';
}

function buildDefinitionAnswer(term) {
  const info = TERM_DEFINITIONS[term];
  if (!info) {
    return '';
  }

  return `**${term.toUpperCase()}** means **${info.full}**.

${info.explanation}

**Why it matters**
${info.whyItMatters}

**Simple formula**
${info.formula}

**In practice**
${info.usage}`;
}

function buildConversation(messages) {
  return messages
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'Human' : 'Assistant'}: ${message.content}`)
    .join('\n\n');
}

function analyzeQuery(query = '') {
  const normalized = query.toLowerCase();
  const numbers = [...query.matchAll(/(?:NGN|USD|EUR|GBP|\$)?\s?\d[\d,]*(?:\.\d+)?%?/gi)].map((match) => match[0]);

  const intent =
    normalized.includes('shap') || normalized.includes('lime') || normalized.includes('explain')
      ? 'explainability'
      : normalized.includes('roi') || normalized.includes('arpu') || normalized.includes('clv') || normalized.includes('revenue')
        ? 'roi'
        : normalized.includes('price') || normalized.includes('discount')
          ? 'pricing'
          : normalized.includes('contract') || normalized.includes('month-to-month')
            ? 'contract'
            : normalized.includes('campaign') || normalized.includes('strategy') || normalized.includes('retain')
              ? 'retention'
              : 'general';

  const focusAreas = [
    normalized.includes('tenure') && 'tenure',
    normalized.includes('fiber') && 'fiber service quality',
    normalized.includes('billing') && 'billing experience',
    normalized.includes('payment') && 'payment friction',
    normalized.includes('support') && 'support coverage',
    normalized.includes('nigeria') && 'nigerian market context',
    normalized.includes('africa') && 'african telecom context',
    /\blatest|current|today|recent|trend|benchmark|news\b/.test(normalized) && 'fresh web context',
  ].filter(Boolean);

  return { intent, focusAreas, numbers };
}

async function fetchWebInsights(query, analysis, context) {
  if (!query) {
    return { summary: '', results: [] };
  }

  const searchQuery = buildSearchQuery(query, analysis, context);

  try {
    const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; ChurnIQ/1.0; +https://giftwarieta.com.ng)',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }

    const html = await response.text();
    const results = parseDuckDuckGoResults(html).slice(0, 3);

    return {
      summary: results.length
        ? results.map((result, index) => `[${index + 1}] ${result.title}: ${result.snippet}`).join(' ')
        : '',
      results,
    };
  } catch {
    return { summary: '', results: [] };
  }
}

function buildSearchQuery(query, analysis, context) {
  const parts = [query.trim()];
  const topic = context.topic?.trim();

  if (topic && !query.toLowerCase().includes(topic.toLowerCase())) {
    parts.push(topic);
  }

  if (!/telecom|telco|churn|retention/i.test(query)) {
    parts.push('telecom churn retention');
  }

  if (analysis.intent === 'roi') {
    parts.push('benchmarks case study');
  }

  if (analysis.intent === 'explainability') {
    parts.push('explainability examples');
  }

  if (analysis.intent === 'retention' || analysis.intent === 'contract' || analysis.intent === 'pricing') {
    parts.push('best practices');
  }

  return parts.join(' ');
}

function parseDuckDuckGoResults(html = '') {
  const titleMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const snippetMatches = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/g)];

  return titleMatches
    .map((match, index) => ({
      url: decodeDuckDuckGoUrl(match[1]),
      title: stripHtml(match[2]),
      snippet: stripHtml(snippetMatches[index]?.[1] || snippetMatches[index]?.[2] || ''),
    }))
    .filter((result) => result.title && result.snippet);
}

function decodeDuckDuckGoUrl(url = '') {
  try {
    const normalized = url.startsWith('//') ? `https:${url}` : url;
    const parsed = new URL(normalized);
    const redirect = parsed.searchParams.get('uddg');
    return redirect ? decodeURIComponent(redirect) : normalized;
  } catch {
    return url;
  }
}

function stripHtml(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSystemPrompt(analysis, context, webInsights) {
  return `You are ChurnIQ's senior telecom retention consultant.
You combine churn analytics, customer lifecycle strategy, pricing design, explainable AI interpretation, and web-informed market research.

Your goals:
- Give business-appropriate answers that feel expert, specific, and immediately usable.
- Adapt depth to the user's question instead of giving generic templates.
- When the user mentions numbers such as ARPU, churn rate, campaign cost, CLV, or percentages, use them in your reasoning.
- If the topic is SHAP or LIME, translate the model output into plain-English business meaning and recommended action.
- If the topic is retention or campaign strategy, prioritize segmentation, offer design, service recovery, and measurement.
- If the topic is ROI, show the logic clearly and state assumptions.
- Use the live web insights below when they add useful context, examples, trends, or benchmarks.

Response rules:
- Lead with the direct answer.
- Use short sections or bullets when they improve clarity.
- Be concrete about KPIs such as churn rate, save rate, ARPU, CLV, NPS, service complaints, and cost per saved customer.
- Tie recommendations back to revenue protection, retention impact, or customer experience.
- Do not fabricate sources, statistics, or recent events.
- Avoid mentioning model providers, APIs, infrastructure, service notices, or backend details.
- Do not say you are using fallback logic.

Current context:
- Topic hint: ${context.topic || 'telecom churn analytics'}
- Detected intent: ${analysis.intent}
- Focus areas: ${analysis.focusAreas.length ? analysis.focusAreas.join(', ') : 'not explicitly stated'}
- Mentioned numbers: ${analysis.numbers.length ? analysis.numbers.join(', ') : 'none'}
- Live web insights: ${webInsights.summary || 'No live web findings were available'}

If the user's request is broad, respond like a strong consultant:
1. Diagnose the likely issue.
2. Recommend the highest-impact actions.
3. Suggest the KPIs or experiment design needed next.`;
}

function sanitizeAssistantReply(text = '') {
  const reply = text.trim();
  if (!reply) {
    return '';
  }

  const normalized = reply.toLowerCase();
  if (BLOCKED_REPLY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return '';
  }

  return reply;
}

function generateFallbackResponse(query, analysis, webInsights) {
  const amount = analysis.numbers.find((value) => value.includes('$') || /^NGN/i.test(value)) || null;
  const liveTip = webInsights.results[0]?.snippet
    ? `Live web context suggests: ${webInsights.results[0].snippet}`
    : null;

  if (analysis.intent === 'explainability') {
    return `Here is the right way to interpret that explainability result:

**What it means**
- Positive SHAP or LIME weight means the feature is pushing the customer toward churn.
- Negative contribution means the feature is helping retention.
- The largest absolute values are the features you should translate into business action first.

**How to act on it**
- If contract type is a top positive driver, test longer-term plan incentives.
- If tenure is a top positive driver, strengthen onboarding and first-90-day engagement.
- If support or service quality features dominate, prioritize service recovery before discounting.

**What to report**
- Top 3 churn drivers
- Recommended intervention for each driver
- Expected save-rate lift by segment

${liveTip || 'A strong next step is to compare those driver patterns with your actual retention interventions by segment.'}`;
  }

  if (analysis.intent === 'roi') {
    return `For ROI, use this decision logic:

**Core formula**
- Customers at risk = total customers x churn rate
- Customers saved = customers at risk x campaign success rate
- Revenue protected = customers saved x ARPU x retention horizon
- Net ROI = revenue protected - campaign cost

**What to check**
- Use a realistic save rate, not an optimistic one.
- Separate high-ARPU segments from low-ARPU segments before investing.
- Track cost per saved customer and payback period.

${amount ? `Because you mentioned ${amount}, I would anchor the first scenario analysis around that value and compare conservative, base, and aggressive save-rate assumptions.` : 'Start with conservative, base, and aggressive save-rate scenarios so the business can compare risk before launch.'}

${liveTip || 'Use at least one external benchmark or case study to sanity-check your projected save rate before launch.'}`;
  }

  if (analysis.intent === 'pricing') {
    return `Pricing changes should reduce churn without training customers to wait for discounts:

**Best moves**
- Offer targeted discounts only to high-risk, high-value customers.
- Prefer value-add bundles, loyalty rewards, or temporary credits over flat price cuts.
- Use contract-upgrade offers for month-to-month customers rather than blanket price reductions.

**Guardrails**
- Track save rate, ARPU dilution, and 90-day retention after the offer.
- Exclude low-value customers where the discount cost exceeds likely revenue protected.
- Compare discount-led saves with service-led saves so you do not overuse incentives.

${liveTip || 'Recent guidance often reinforces pairing pricing changes with service or bundle improvements instead of relying on discounts alone.'}`;
  }

  if (analysis.intent === 'contract' || analysis.intent === 'retention') {
    return `For telecom churn reduction, I would focus on the highest-yield interventions first:

**Priority segments**
- Month-to-month customers
- Short-tenure customers
- Customers with repeated support or quality complaints
- Customers with payment friction

**Highest-impact actions**
- Contract upgrade incentives for flexible-plan customers
- Early-lifecycle onboarding and usage education
- Proactive service recovery for complaint-heavy cohorts
- Auto-pay or billing simplification for customers with payment issues

**KPIs to track**
- Save rate
- Churn rate by segment
- ARPU retained
- Cost per saved customer
- 30/60/90-day post-intervention retention

${liveTip || 'A practical enhancement is to validate those interventions against recent telecom retention case studies before rollout.'}`;
  }

  return `Here is a strong way to approach that question:

**Start with diagnosis**
- Identify which customer segment is driving the churn problem.
- Separate commercial causes such as contract or pricing from experience causes such as support or service quality.

**Then choose action**
- Match each high-risk segment to one clear intervention.
- Prioritize actions that protect ARPU and customer lifetime value, not just headline save rate.

**Measure success**
- Track churn reduction, revenue protected, cost per saved customer, and retention durability over time.

${liveTip || 'Where possible, support the plan with a recent external benchmark or case example so the recommendation is grounded.'}`;
}
