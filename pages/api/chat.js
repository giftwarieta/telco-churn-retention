// pages/api/chat.js - AI Consultant endpoint (free, no API key required)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], context = {} } = req.body;

  const systemPrompt = `You are ChurnIQ's expert AI business consultant for telecom churn analytics.
You specialize in:
- Telco churn prediction using XGBoost, SHAP, and LIME
- Nigerian and African telecom market insights
- Customer retention strategies and lifecycle management
- Revenue impact and ROI analysis for churn reduction
- Explainable AI (XAI) interpretation and communication

Context: ${JSON.stringify(context)}

Provide specific, actionable insights. Reference KPIs like ARPU, CLV, NPS. Be concise and business-focused.`;

  try {
    // Build conversation for Pollinations
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationText}\n\nAssistant:`;
    const encodedPrompt = encodeURIComponent(fullPrompt);

    const response = await fetch(
      `https://text.pollinations.ai/${encodedPrompt}?model=mistral&seed=${Date.now() % 1000}`,
      {
        method: 'GET',
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) throw new Error(`Pollinations API error: ${response.status}`);

    const text = await response.text();
    return res.status(200).json({ reply: text.trim(), model: 'mistral' });

  } catch (error) {
    // Provide a helpful fallback
    const lastMessage = messages[messages.length - 1]?.content || '';
    const fallback = generateFallbackResponse(lastMessage);
    return res.status(200).json({
      reply: fallback,
      model: 'fallback',
      offline: true,
    });
  }
}

function generateFallbackResponse(query) {
  const q = query.toLowerCase();

  if (q.includes('retain') || q.includes('strategy') || q.includes('reduce churn')) {
    return `Here are proven retention strategies for high-risk telco customers:

**Contract Upgrade Incentives**
Offer 10-15% discount for Month-to-month customers upgrading to annual plans. This single intervention reduces churn probability by 30-40%.

**Proactive Service Recovery**
For Fiber optic customers with tech support issues, same-day resolution reduces churn by 22% (industry benchmark).

**Loyalty Reward Programs**
Customers beyond 24-month tenure show <8% churn rate. Focus retention spend on 6-18 month cohort.

**Payment Method Migration**
Migrate electronic check users to auto-pay — this correlates with 12% churn reduction and reduces delinquency.

*Note: AI service temporarily unavailable. These are evidence-based industry benchmarks.*`;
  }

  if (q.includes('shap') || q.includes('explain') || q.includes('feature')) {
    return `**Interpreting SHAP Values for Churn Prediction:**

SHAP (SHapley Additive exPlanations) values show each feature's contribution to the prediction.

- **Positive SHAP**: Feature increases churn probability (red in force plots)
- **Negative SHAP**: Feature decreases churn probability (blue in force plots)
- **Magnitude**: Larger absolute value = stronger influence

**Top Churn Drivers Typically:**
1. Month-to-month contract (+0.38 avg SHAP)
2. Short tenure under 12 months (+0.29)
3. High monthly charges >$65 (+0.22)
4. Fiber optic internet service (+0.18)
5. No tech support subscription (+0.14)

*Note: AI service temporarily unavailable. Using knowledge base.*`;
  }

  return `Thank you for your question about "${query.slice(0, 60)}...".

The AI service is temporarily unavailable. Here's what I can share from the knowledge base:

**Key Telco Churn Insights:**
- Industry average churn rate: 20-25% annually
- Cost to acquire new customer: 5-7x cost of retaining existing one
- Contract type is the #1 predictor: Month-to-month = 3-5x higher churn than annual
- Tenure is the #2 predictor: First 12 months are highest-risk period

For personalized insights, please ensure your internet connection is active and try again.`;
}
