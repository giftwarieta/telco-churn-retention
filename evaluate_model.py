import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    roc_auc_score, 
    precision_score, 
    recall_score
)
from src.processor import clean_and_prepare, get_features

def tune_thresholds(y_true, y_probs):
    """Tests different thresholds to find the best balance for business ROI."""
    print("\n--- Business Logic: Threshold Tuning Analysis ---")
    thresholds = [0.3, 0.4, 0.5, 0.6]
    results = []
    for t in thresholds:
        preds = (y_probs > t).astype(int)
        prec = precision_score(y_true, preds)
        rec = recall_score(y_true, preds)
        results.append({"Threshold": t, "Precision": prec, "Recall": rec})
        print(f"Threshold {t}: Recall (Coverage)={rec:.2f}, Precision (Efficiency)={prec:.2f}")
    return pd.DataFrame(results)

def run_evaluation(data_path, model_path):
    # Load Data
    df_raw = pd.read_csv(data_path)
    df_clean = clean_and_prepare(df_raw)
    X = get_features(df_clean)
    y = df_clean['Churn_Label']
    
    # Split
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Predict
    model = joblib.load(model_path)
    y_probs = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    # Metrics
    print("\n--- Standard Model Performance ---")
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_probs):.4f}")
    
    # Threshold Tuning
    tune_thresholds(y_test, y_probs)
    
    # Postdictive Analysis: Hits vs Misses
    results_df = X_test.copy()
    results_df['Actual'] = y_test
    results_df['Predicted'] = y_pred
    
    tp = results_df[(results_df['Actual'] == 1) & (results_df['Predicted'] == 1)]
    fn = results_df[(results_df['Actual'] == 1) & (results_df['Predicted'] == 0)]
    
    print("\n--- Postdictive Insights (Comparing TP vs FN) ---")
    comparison = pd.DataFrame({
        'Feature': ['Tenure (Avg)', 'MonthlyCharges (Avg)', 'Num_Services (Avg)'],
        'Caught_TP': [tp['tenure'].mean(), tp['MonthlyCharges'].mean(), tp['Num_Services'].mean()],
        'Missed_FN': [fn['tenure'].mean(), fn['MonthlyCharges'].mean(), fn['Num_Services'].mean()]
    })
    print(comparison)
    
    # Save Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Greens')
    plt.title('Confusion Matrix: Retention Impact')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.savefig('models/evaluation_results.png')
    
    # Export for Power BI
    results_df['Risk_Probability'] = y_probs
    results_df.to_csv('data/postdictive_results_for_bi.csv', index=False)
    print("\n[SUCCESS] Visuals saved to /models and CSV saved to /data.")

if __name__ == "__main__":
    run_evaluation('data/WA_Fn-UseC_-Telco-Customer-Churn 2.csv', 'models/churn_model.pkl')