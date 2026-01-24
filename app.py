import streamlit as st
import pandas as pd
import joblib
import shap
import time
import os
import glob
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix
from src.processor import clean_and_prepare, get_features, engineer_features
from src.model import train_custom_model
from src.business_impact import ChurnROI
from datetime import datetime
from st_social_media_links import SocialMediaIcons
from st_functions import st_button, load_css
from PIL import Image

# --- INITIAL STATE MANAGEMENT ---
# --- INITIAL STATE MANAGEMENT ---
if 'mode' not in st.session_state: st.session_state.mode = None
if 'confirmed' not in st.session_state: st.session_state.confirmed = False
if 'current_page' not in st.session_state: st.session_state.current_page = "🏠 Overview"
if 'training_results' not in st.session_state: st.session_state.training_results = None
if 'messages' not in st.session_state: st.session_state.messages = []
if 'user_name' not in st.session_state: st.session_state.user_name = None
if 'company_name' not in st.session_state: st.session_state.company_name = None
if 'api_key' not in st.session_state: st.session_state.api_key = None
if 'active_df' not in st.session_state: st.session_state.active_df = None
if 'user_trained_data' not in st.session_state: st.session_state.user_trained_data = None
if 'sidebar_open' not in st.session_state: st.session_state.sidebar_open = True

# --- UI STYLING & FOOTER ---
st.set_page_config(page_title="Telecom ChurnAI Pro | Developed by Warieta Gift Ejovwoke", page_icon="📉", layout="wide")

st.markdown("""
    <style>
    .footer { 
        position: fixed; left: 0; bottom: 0; width: 100%; 
        background-color: #000000; text-align: center; 
        padding: 15px; color: #ffffff; z-index: 1000; 
    }
    .footer a { color: #38bdf8; text-decoration: none; font-weight: bold; }
    .big-title { font-size: 2.2rem; font-weight: 700; color: #1e3a8a; }
    .privacy-note { font-size: 0.85rem; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 5px; border-left: 4px solid #94a3b8; margin-bottom: 20px; }
    </style>
""", unsafe_allow_html=True)

def show_footer():
    st.markdown(
        f"<div class='footer'>Developed by: <a href='https://www.linkedin.com/in/giftwarieta' target='_blank'>Warieta Gift Ejovwoke</a> | ChurnAI Pro V1</div>", 
        unsafe_allow_html=True
    )

def get_folder_context(folder_name):
    context = ""
    if os.path.exists(folder_name):
        files = glob.glob(os.path.join(folder_name, "*.txt")) + glob.glob(os.path.join(folder_name, "*.csv"))
        for file in files:
            try:
                if file.endswith(".csv"):
                    df_temp = pd.read_csv(file).head(5)
                    context += f"\nFile {os.path.basename(file)} Summary:\n{df_temp.describe().to_string()}\n"
                else:
                    with open(file, 'r', errors='ignore') as f:
                        context += f"\nFile {os.path.basename(file)}: " + f.read()[:300] + "...\n"
            except: continue
    return context


# Get the current hour
current_hour = datetime.now().hour

# Determine the appropriate greeting
if 5 <= current_hour < 12:
    greeting = "Good Morning!"
elif 12 <= current_hour < 18:
    greeting = "Good Afternoon!"
else:
    greeting = "Good Evening!"



st.sidebar.image("https://raw.githubusercontent.com/giftwarieta/Python/main/assets/GiftWarieta_Logo.png")
# Display the greeting
st.sidebar.write(greeting + " Thank you for checking by.")

# ===================================================================
# PAGES
# ===================================================================

def page_overview():
    st.title("Telecom ChurnAI Pro")
    st.markdown("<div class='privacy-note'>🛡️ <b>Data Privacy Notice:</b> This app is session-based. Data exists only in your browser memory.</div>", unsafe_allow_html=True)
    
    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown("### The Business Challenge")
        st.markdown("""
        Customer churn represents the single largest revenue leak in the telecom industry. 
        Industry research shows that acquiring new customers costs **5-7x more** than retaining existing ones. 
        Moreover, a 5% increase in customer retention can boost profits by 25-95%.
        """)
        
        st.markdown("### The ChurnAI Solution")
        st.markdown("""
        This platform provides an end-to-end framework combining:
        
        **📈 Predictive Intelligence**  
        Advanced Gradient Boosting models achieving 85%+ accuracy in identifying at-risk customers.
        
        **🧠 Explainable AI**  
        SHAP technology providing transparent reasoning behind predictions.
        
        **💰 Financial Impact Modeling**  
        Conversion of churn probabilities into actionable business metrics including Net ROI and Revenue Protection.
        
        **🎯 Strategic Consultation**  
        AI-powered analysis for targeted retention strategies.
        """)

    with col2:
        st.markdown("### 🚀 Choose Your Path")
        st.write("Select a path to begin your analysis.")
        
        active_e = st.session_state.mode == "Expert"
        if st.button("Activated model selection" if active_e else "🚀 Use Default Expert Model", disabled=active_e, use_container_width=True):
            st.session_state.model = joblib.load('models/churn_model.pkl')
            st.session_state.explainer = joblib.load('models/explainer.pkl')
            st.session_state.feature_names = joblib.load('models/feature_names.pkl')
            st.session_state.mode = 'Expert'; st.session_state.confirmed = True; st.session_state.current_page = "📊 ROI Dashboard"; st.rerun()

        active_s = st.session_state.mode == "Simulation"
        if st.button("Activated model simulation" if active_s else "🧪 Setup Personalized Training", disabled=active_s, use_container_width=True):
            st.session_state.mode = 'Simulation'; st.session_state.confirmed = False; st.session_state.current_page = "🧪 Custom Training"; st.rerun()

def page_simulation():
    st.title("Telecom ChurnAI Pro")
    st.markdown("🧪 Custom Training & Simulation")
    template_df = pd.read_csv('data/WA_Fn-UseC_-Telco-Customer-Churn 2.csv').head(5)
    st.download_button("📥 Download Template", template_df.to_csv(index=False), "template.csv")
    file = st.file_uploader("Upload CSV", type="csv")
    if file:
        df_raw = pd.read_csv(file)
        st.session_state.active_df = df_raw
        st.session_state.user_trained_data = df_raw
        algo = st.selectbox("Choose Model", ["Gradient Boosting", "Random Forest", "Linear Regression"])
        if st.button("Train Model"):
            with st.spinner("Analyzing..."):
                df_c = clean_and_prepare(df_raw); X = get_features(df_c); y = df_c['Churn_Label']
                X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
                m, exp, stats = train_custom_model(X_tr, X_te, y_tr, y_te, algo)
                cm = confusion_matrix(y_te, m.predict(X_te))
                st.session_state.training_results = {"model": m, "exp": exp, "feats": X.columns.tolist(), "stats": stats, "algo": algo, "cm": cm}

    if st.session_state.training_results:
        res = st.session_state.training_results
        col_m, col_c = st.columns(2)
        with col_m:
            for k, v in res['stats'].items(): st.metric(k, f"{v:.1%}")
        with col_c:
            fig, ax = plt.subplots(); sns.heatmap(res['cm'], annot=True, fmt='d', cmap='Blues', ax=ax); st.pyplot(fig)
        if st.button("✅ Confirm Model & Proceed"):
            st.session_state.model, st.session_state.explainer, st.session_state.feature_names = res['model'], res['exp'], res['feats']; st.session_state.confirmed = True; st.session_state.current_page = "📊 ROI Dashboard"; st.rerun()

def page_roi():
    st.title("Telecom ChurnAI Pro")
    st.markdown("### 📊 Business ROI & Financial Impact Dashboard")
    st.info("💡 **Simulation Tool:** Adjust the parameters below to estimate the financial impact of your retention campaign.")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        clv = st.number_input("💰 Average Customer Lifetime Value ($)", 
                             min_value=500, max_value=10000, value=2000, step=100,
                             help="The total revenue expected from a customer over their lifetime")
    
    with col2:
        cost = st.slider("💸 Retention Offer Cost per Customer ($)", 
                        min_value=10, max_value=500, value=100, step=10,
                        help="Cost of incentive/offer to retain each at-risk customer")
    
    with col3:
        success = st.slider("✅ Retention Success Rate (%)", 
                           min_value=5, max_value=100, value=30, step=5,
                           help="Percentage of targeted customers who accept the retention offer") / 100
    
    at_risk_customers = st.slider("🎯 Number of At-Risk Customers to Target", 
                                  min_value=10, max_value=1000, value=150, step=10)
    
    roi = ChurnROI(clv, cost, success)
    net, saved, expense = roi.estimate_impact(at_risk_customers)
    
    st.markdown("---")
    st.markdown("### 💼 Projected Campaign Results")
    
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("💵 Net Profit", f"${net:,.0f}")
    k2.metric("🛡️ Revenue Saved", f"${saved:,.0f}")
    k3.metric("💳 Campaign Spend", f"${expense:,.0f}")
    k4.metric("📊 ROI Ratio", f"{(net/expense*100 if expense > 0 else 0):.0f}%")
    
    with st.expander("📈 Detailed Financial Breakdown"):
        st.write(f"""
        **Campaign Overview:**
        - Customers Targeted: {at_risk_customers}
        - Expected Successful Retentions: {int(at_risk_customers * success)}
        - Cost Per Retention: ${cost}
        - Value Per Retained Customer: ${clv}
        
        **Financial Analysis:**
        - Total Revenue at Risk: ${at_risk_customers * clv:,.0f}
        - Revenue Successfully Saved: ${saved:,.0f}
        - Total Campaign Investment: ${expense:,.0f}
        - Net Profit Generated: ${net:,.0f}
        - Profit Margin: {(net/saved*100 if saved > 0 else 0):.1f}%
        """)

def page_predictor():
    st.title("Telecom ChurnAI Pro")
    st.markdown("### Individual Customer Risk Assessment")
    
    st.info("🎯 **Customer Profiler:** Enter customer details below to predict their churn probability and identify key risk factors.")
    
    with st.expander("📋 Customer Information", expanded=True):
        col1, col2, col3 = st.columns(3)
        
        with col1:
            tenure = st.slider("📅 Customer Tenure (months)", 
                             min_value=1, max_value=72, value=12,
                             help="How long the customer has been with the company")
        
        with col2:
            monthly = st.number_input("💵 Monthly Charges ($)", 
                                     min_value=18.0, max_value=150.0, value=70.0, step=5.0,
                                     help="Customer's monthly bill amount")
        
        with col3:
            contract = st.selectbox("📝 Contract Type", 
                                   ["Month-to-month", "One year", "Two year"],
                                   help="Type of service contract")
    
    col_analyze, col_clear = st.columns([3, 1])
    
    with col_analyze:
        analyze_btn = st.button("🚀 Analyze Churn Risk", use_container_width=True, type="primary")
    
    with col_clear:
        if st.button("🔄 Reset", use_container_width=True):
            st.rerun()
    
    if analyze_btn:
        with st.spinner("🔍 Analyzing customer risk profile..."):
            input_df = pd.DataFrame(0, index=[0], columns=st.session_state.feature_names)
            input_df['tenure'] = tenure
            input_df['MonthlyCharges'] = monthly
            
            if f"Contract_{contract}" in input_df.columns:
                input_df[f"Contract_{contract}"] = 1
            
            prob = st.session_state.model.predict_proba(input_df)[0][1]
            
            st.markdown("---")
            st.markdown("### 📊 Risk Assessment Results")
            
            col_prob, col_status = st.columns([1, 2])
            
            with col_prob:
                st.metric("🎯 Churn Probability", f"{prob:.1%}", 
                         help="Likelihood that this customer will churn")
            
            with col_status:
                if prob >= 0.7:
                    st.markdown("<p class='status-high'>⚠️ HIGH RISK - Immediate intervention recommended</p>", unsafe_allow_html=True)
                elif prob >= 0.4:
                    st.markdown("<p class='status-medium'>⚡ MODERATE RISK - Monitor closely and consider retention offer</p>", unsafe_allow_html=True)
                else:
                    st.markdown("<p class='status-low'>✅ LOW RISK - Customer appears stable</p>", unsafe_allow_html=True)
            
            if st.session_state.explainer:
                st.markdown("### Why This Prediction?")
                st.caption("SHAP values show how each feature contributes to the churn prediction")
                
                try:
                    fig, ax = plt.subplots(figsize=(10, 6))
                    shap_values = st.session_state.explainer(input_df)
                    shap.plots.waterfall(shap_values[0], show=False)
                    st.pyplot(fig)
                    plt.close()
                except Exception as e:
                    st.error(f"Unable to generate explanation: {str(e)}")

def page_about():
    st.title("Telecom ChurnAI Pro")
    
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.markdown("### 👨‍💻 About the Developer")
        st.markdown(
    """
    <div style="text-align: center;">
        <img src="https://raw.githubusercontent.com/giftwarieta/Python/main/assets/mydp.png" 
             alt="Warieta Gift Ejovwoke Picture" 
             style="max-width: 50%; height: auto;">
        <div></div><br>
        <p>My Name is Warieta Gift Ejovwoke</p>
        <p>Data & Analytics Leader | Data Science, ML & Decision Intelligence</p>
    </div>
    """,
    unsafe_allow_html=True
)
        st.markdown("<br>", unsafe_allow_html=True)
        
        st.markdown("""
            <div class='card'>
                <h4>Open to Opportunities</h4>
                <p>I am actively seeking opportunities in:</p>
                <ul>
                    <li><b>Full-time Roles:</b> Data Scientist, ML Engineer, AI Research positions</li>
                    <li><b>Research Collaborations:</b> Academic or industry research in AI/ML</li>
                    <li><b>Consulting & Freelance:</b> Custom AI solutions, data analytics projects</li>
                    <li><b>Speaking Engagements:</b> Technical talks, workshops, and training sessions</li>
                </ul>
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
            <div class='card'>
                <h4>Professional Expertise</h4>
                <p>Specializing in machine learning, predictive analytics, and AI-powered business solutions. 
                With extensive experience in developing end-to-end data science applications, I transform 
                complex business challenges into actionable insights.</p>
                
                <h4>Core Competencies</h4>
                <ul>
                    <li>Machine Learning & Deep Learning</li>
                    <li>Predictive Modeling & Analytics</li>
                    <li>Natural Language Processing</li>
                    <li>Business Intelligence & Data Visualization</li>
                    <li>Full-Stack Data Science Applications</li>
                </ul>
            </div>
        """, unsafe_allow_html=True)
            
        st.markdown("### 📞 Let's Connect!")
        icon_size = 20

        st_button('youtube', 'https://youtube.com/giftwarieta', 'My YouTube Channel', icon_size)
        st_button('website', 'https://giftwarieta.com.ng/', 'My Official Website', icon_size)
        st_button('twitter', 'https://twitter.com/we_gift/', 'Follow me on Twitter', icon_size)
        st_button('linkedin', 'https://www.linkedin.com/in/giftwarieta/', 'Follow me on LinkedIn', icon_size)
        st_button('tiktok', 'https://www.tiktok.com/@datasculptnexus', 'Follow me on TikTok', icon_size)
        st_button('website', 'https://giftwarieta.com.ng/reviews', 'Write a review about this', icon_size)
    

    
    
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown("""
        <div class='card' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;'>
            <h4>💡 Let's Build Something Amazing Together!</h4>
            <p>Whether you have a challenging data problem, need AI expertise, or want to collaborate on 
            innovative projects, I'd love to hear from you. Feel free to reach out through any of the channels above.</p>
        </div>
    """, unsafe_allow_html=True)

def page_ai_bot():
    st.title("Telecom ChurnAI Pro")
    st.markdown("### 🤖 AI Strategy Consultant")
    
    if not st.session_state.api_key:
        with st.expander("🔑 Configure AI Access", expanded=True):
            st.markdown("""
                <div class='professional-card'>
                    <h4>🔐 Secure AI Configuration Required</h4>
                    <p>To unlock the AI Strategy Consultant, please enter your Google Gemini API key. 
                    Your credentials are stored only in your browser session and never transmitted to external servers.</p>
                </div>
            """, unsafe_allow_html=True)
            
            key = st.text_input("Enter Google Gemini API Key", type="password",
                              help="Your API key will only be stored in session memory")
            
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input("Your Name", placeholder="Enter your name")
            
            with col2:
                company = st.text_input("Company Name", placeholder="Enter company name")
            
            if st.button("🚀 Initialize AI Consultant", use_container_width=True, type="primary"):
                if key and name and company:
                    st.session_state.api_key = key
                    st.session_state.user_name = name
                    st.session_state.company_name = company
                    st.success("✅ AI Consultant activated successfully!")
                    
                    # Add welcome message
                    welcome_msg = f"""Hello {name}! 👋

I'm your AI Strategy Consultant, ready to assist with churn analysis for **{company}**.

I can help you:
- Analyze customer churn patterns specific to {company}
- Recommend retention strategies based on your data
- Provide data-driven insights for decision making
- Compare with industry benchmarks

What would you like to explore today?"""
                    
                    st.session_state.messages.append({
                        "role": "assistant", 
                        "content": welcome_msg
                    })
                    
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Please fill in all fields")
        return
    
    # Display chat history
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Chat input
    if prompt := st.chat_input(f"Ask about {st.session_state.company_name}'s churn strategy..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Prepare AI response with typing indicator
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            
            # Show typing animation
            message_placeholder.markdown("""
                <div class='typing-indicator'>
                    <span>Analyzing your data...</span>
                    <div class='typing-dot'></div>
                    <div class='typing-dot'></div>
                    <div class='typing-dot'></div>
                </div>
            """, unsafe_allow_html=True)
            
            time.sleep(1.5)  # Simulate processing time
            
            try:
                # Prepare context
                if st.session_state.user_trained_data is not None:
                    df = st.session_state.user_trained_data
                    data_source = f"{st.session_state.company_name}'s custom dataset"
                else:
                    df = pd.read_csv('data/WA_Fn-UseC_-Telco-Customer-Churn 2.csv')
                    data_source = "industry benchmark data"
                
                stats_summary = f"""
                Dataset: {data_source}
                Total Records: {len(df)}
                Average Monthly Charges: ${df['MonthlyCharges'].mean():.2f}
                Median Tenure: {df['tenure'].median()} months
                Churn Rate: {(df['Churn'].value_counts().get('Yes', 0) / len(df) * 100):.1f}%
                """
                
                # System prompt
                sys_prompt = f"""You are a Expert Telecom Strategy Consultant assisting {st.session_state.user_name} from {st.session_state.company_name}.

Context: {stats_summary}

Focus on providing actionable, data-driven advice specifically for {st.session_state.company_name}. 
Role: You are a Expert Telecom Strategy Consultant specializing in Customer Value Management (CVM). Your objective is to provide high-stakes, data-driven advice to {st.session_state.user_name} regarding {st.session_state.company_name}.

Operational Mandates:

Precision over Generalization: Never provide vague advice (e.g., "Improve customer service"). Instead, provide specific, actionable tactics (e.g., "Implement a predictive churn model using 'Days Since Last Top-up' as a primary feature").

Anti-Hallucination Protocol: Only base insights on the statistics provided. If specific data is missing to make a claim, state: "To provide an accurate ROI calculation, I require [Specific Data Point]." Do not invent benchmarks.

Naming Convention: Always address {st.session_state.user_name} and reference {st.session_state.company_name} specifically in your recommendations to maintain a bespoke consultancy feel.

Core Response Framework:

Customer Retention: Focus on proactive vs. reactive strategies (e.g., personalized loyalty offers, network quality-of-experience triggers).

Data-Driven Insights: Analyze provided statistics for trends, anomalies, and correlations.

ROI Focus: Every recommendation must be linked to a business outcome: Churn Reduction %, ARPU (Average Revenue Per User) growth, or CLV (Customer Lifetime Value) extension.

Implementation: Provide high-level technical or operational roadmaps for each suggestion.

Visual & Graphical Representation:

When a user requests a chart or when data is too complex for text, generate a visual representation (e.g., a Markdown table, a Mermaid.js diagram for process flows, or a descriptive placeholder for a graphical image if the specific UI supports image generation).

Use bolding and tables to ensure the data is scannable at a glance.

Conversation Closing Logic:

Trigger: If the user says "Thank you," "Thanks," or any variation of gratitude.

Mandatory Response: "You are very welcome, {st.session_state.user_name}. Are there any other specific areas within {st.session_state.company_name} or further assistance you require at this time?"
If the users responds with further questions, continue the consultation.
If the user does not respond or says "No," "That's all," or similar, reply with: "It was a pleasure assisting you today, {st.session_state.user_name}. Wishing {st.session_state.company_name} continued success in your customer retention efforts. Goodbye!"
If the user does not follow up, end the session after this message.
If the user says "Goodbye" or "Exit," respond with: "Goodbye, {st.session_state.user_name}. Feel free to reach out anytime for further assistance with {st.session_state.company_name}'s churn strategies."
Constraint: Do not provide any new business insights or additional data once this trigger is met unless the user follows up with a new question.
"""
                
                # Initialize Gemini
                import google.generativeai as genai
                genai.configure(api_key=st.session_state.api_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                # Generate response
                response = model.generate_content(f"{sys_prompt}\n\nUser Question: {prompt}")
                answer = response.text
                
                # Display final response
                message_placeholder.empty()
                st.markdown(answer)
                st.session_state.messages.append({"role": "assistant", "content": answer})
                
            except Exception as e:
                error_msg = f"""⚠️ Error connecting to AI service

The error was: **{str(e)}**

This could be due to:
- Invalid API key
- Exceeded quota
- Network issues

Please restart the configuration and verify your Google Gemini API key.

[Click the button below to reconfigure]"""
                
                message_placeholder.empty()
                st.markdown(error_msg)
                
                if st.button("🔄 Reconfigure AI Settings", use_container_width=True):
                    st.session_state.api_key = None
                    st.session_state.user_name = None
                    st.session_state.company_name = None
                    st.session_state.messages = []
                    st.rerun()

# --- NAVIGATION LOGIC ---
st.sidebar.title("📌 Navigation")
nav = ["🏠 Overview","📄 About Developer"]
if st.session_state.mode:
    if st.session_state.mode == "Simulation": nav += ["🧪 Custom Training"]
    if st.session_state.confirmed: nav += ["📊 ROI Dashboard", "🔮 Predictor", "🤖 AI Consultant"]

if st.session_state.current_page not in nav: st.session_state.current_page = nav[0]
choice = st.sidebar.selectbox("Select from Dropdown", nav, index=nav.index(st.session_state.current_page)); st.session_state.current_page = choice

if choice == "🏠 Overview": page_overview()
elif "About" in choice: page_about()
elif "Custom Training" in choice: page_simulation()
elif "ROI Dashboard" in choice: page_roi()
elif "Predictor" in choice: page_predictor()
elif "AI Consultant" in choice: page_ai_bot()
show_footer()