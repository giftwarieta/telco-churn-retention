from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score, roc_auc_score

from src.training import engineer_telco_features, ensure_raw_feature_frame


ROOT_DIR = Path(__file__).resolve().parent
DATA_PATH = ROOT_DIR / "data" / "WA_Fn-UseC_-Telco-Customer-Churn 2.csv"
MODEL_PATH = ROOT_DIR / "models" / "churn_model.pkl"
METADATA_PATH = ROOT_DIR / "models" / "model_metadata.pkl"


def run_evaluation() -> dict:
    df = pd.read_csv(DATA_PATH)
    metadata = joblib.load(METADATA_PATH)
    model = joblib.load(MODEL_PATH)

    frame = ensure_raw_feature_frame(df, defaults=metadata.get("feature_defaults"))
    features = engineer_telco_features(frame)
    target = df["Churn"].astype(str).str.strip().str.lower().eq("yes").astype(int)

    probabilities = model.predict_proba(features)[:, 1]
    threshold = float(metadata.get("decision_threshold", 0.5))
    predictions = (probabilities >= threshold).astype(int)

    summary = {
        "accuracy": round(float(accuracy_score(target, predictions)), 4),
        "precision": round(float(precision_score(target, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(target, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(target, predictions, zero_division=0)), 4),
        "auc_roc": round(float(roc_auc_score(target, probabilities)), 4),
        "decision_threshold": threshold,
    }

    print(summary)
    print(classification_report(target, predictions, zero_division=0))
    return summary


if __name__ == "__main__":
    run_evaluation()
