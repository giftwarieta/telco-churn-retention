from pathlib import Path

import pandas as pd

from src.training import save_training_artifacts, train_churn_pipeline


ROOT_DIR = Path(__file__).resolve().parent
DATA_PATH = ROOT_DIR / "data" / "WA_Fn-UseC_-Telco-Customer-Churn 2.csv"
MODELS_DIR = ROOT_DIR / "models"
METRICS_PATH = ROOT_DIR / "postdictive_full_results.csv"


def run_pipeline() -> dict:
    print("Loading data...")
    df = pd.read_csv(DATA_PATH)

    print("Cleaning, engineering features, and training the model...")
    artifacts = train_churn_pipeline(
        df=df,
        algorithm="gradient_boosting",
        test_size=0.2,
        precision_floor=0.68,
        recall_target=0.80,
    )

    print("Saving model artifacts...")
    save_training_artifacts(
        artifacts=artifacts,
        models_dir=MODELS_DIR,
        metrics_path=METRICS_PATH,
    )

    summary = {
        "accuracy": artifacts.metrics["accuracy"],
        "precision": artifacts.metrics["precision"],
        "recall": artifacts.metrics["recall"],
        "f1": artifacts.metrics["f1"],
        "auc_roc": artifacts.metrics["auc_roc"],
        "decision_threshold": artifacts.metrics["decision_threshold"],
        "threshold_strategy": artifacts.metrics["threshold_strategy"],
        "met_precision_floor": artifacts.metrics["met_precision_floor"],
        "met_recall_target": artifacts.metrics["met_recall_target"],
        "met_full_target": artifacts.metrics["met_full_target"],
    }
    print(summary)
    return summary


if __name__ == "__main__":
    run_pipeline()
