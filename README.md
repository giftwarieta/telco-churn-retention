# 📡 Telco Customer Retention: From Prediction to Profit

## 🚀 Business Impact
This project identifies high-risk customers in a Telco environment and provides a financial framework for retention. By targeting the top 10% of at-risk users, the company can potentially **save over $55,000 in annual revenue** with a 3x return on marketing spend.

## 📊 Evaluation & Performance
- **ROC-AUC Score:** 0.89 (High distinguishing power)
- **Precision:** 76% (Efficient targeting of actual churners)
- **Recall:** 61% (Identifies more than half of all churners; focused on predictable flight risks)

## 🔍 Postdictive Analysis: "The Silent Leavers"
Through postdictive analysis, we found:
* **The Success:** The model is 90% accurate at catching "New Customers" (Tenure < 6 months) with high monthly bills.
* **The Challenge:** The model missed "Long-term Churners" (Tenure > 24 months). This suggests these users leave due to **service quality/events** rather than price. 
* **Recommendation:** Integrate Support Ticket and Network Latency data to catch these hidden risks.

## 💡 Strategic Recommendations
1. **Contract Migration:** Offer a 15% discount to Month-to-Month Fiber Optic users to switch to 1-year plans.
2. **Onboarding Concierge:** Focus resources on the "first 90 days" where churn risk is highest.
3. **Autopay Incentives:** Encourage migration away from Electronic Checks to reduce friction-based churn.

## 🛠️ How to Run
1. `pip install -r requirements.txt`
2. `python train_pipeline.py`
3. `streamlit run app.py`