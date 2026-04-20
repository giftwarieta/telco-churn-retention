from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RAW_FEATURE_COLUMNS = [
    "gender",
    "SeniorCitizen",
    "Partner",
    "Dependents",
    "tenure",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod",
    "MonthlyCharges",
    "TotalCharges",
]

RAW_FEATURE_DEFAULTS = {
    "gender": "Male",
    "SeniorCitizen": "0",
    "Partner": "Yes",
    "Dependents": "No",
    "tenure": 12,
    "PhoneService": "Yes",
    "MultipleLines": "No",
    "InternetService": "Fiber optic",
    "OnlineSecurity": "No",
    "OnlineBackup": "No",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "No",
    "StreamingMovies": "No",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 70.35,
    "TotalCharges": 1394.55,
}

TARGET_PRECISION_FLOOR = 0.68
TARGET_RECALL = 0.80

SERVICE_COLUMNS = [
    "MultipleLines",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
]

INTERNET_SERVICE_COLUMNS = [
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
]


@dataclass
class TrainingArtifacts:
    pipeline: Pipeline
    feature_names: list[str]
    metadata: dict[str, Any]
    metrics: dict[str, Any]
    metrics_frame: pd.DataFrame


def _safe_quantile_band(
    series: pd.Series,
    labels: list[str],
    fallback_label: str,
) -> pd.Series:
    non_null = pd.to_numeric(series, errors="coerce")
    if non_null.dropna().nunique() < 2:
        return pd.Series([fallback_label] * len(series), index=series.index, dtype="object")

    try:
        banded = pd.qcut(non_null, q=min(len(labels), non_null.dropna().nunique()), duplicates="drop")
        categories = list(banded.cat.categories)
        if not categories:
            return pd.Series([fallback_label] * len(series), index=series.index, dtype="object")

        mapped_labels = labels[: len(categories)]
        renamed = banded.cat.rename_categories(mapped_labels)
        return renamed.astype("object").fillna(fallback_label)
    except Exception:
        return pd.Series([fallback_label] * len(series), index=series.index, dtype="object")


def _strip_object_columns(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy()
    for column in frame.select_dtypes(include=["object"]).columns:
        frame[column] = frame[column].astype(str).str.strip()
    return frame


def clean_telco_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    frame = _strip_object_columns(df)

    for column, default in RAW_FEATURE_DEFAULTS.items():
        if column not in frame.columns:
            frame[column] = default

    frame["SeniorCitizen"] = pd.to_numeric(frame["SeniorCitizen"], errors="coerce").fillna(0).astype(int).astype(str)
    frame["tenure"] = pd.to_numeric(frame["tenure"], errors="coerce").fillna(0)
    frame["MonthlyCharges"] = pd.to_numeric(frame["MonthlyCharges"], errors="coerce").fillna(0.0)
    frame["TotalCharges"] = pd.to_numeric(frame["TotalCharges"], errors="coerce")

    total_from_tenure = frame["tenure"] * frame["MonthlyCharges"]
    frame["TotalCharges"] = frame["TotalCharges"].fillna(total_from_tenure)
    frame["TotalCharges"] = frame["TotalCharges"].fillna(0.0)

    for column in RAW_FEATURE_COLUMNS:
        if column in {"tenure", "MonthlyCharges", "TotalCharges"}:
            continue
        frame[column] = frame[column].fillna(str(RAW_FEATURE_DEFAULTS[column])).astype(str)

    if "Churn" in frame.columns and "Churn_Label" not in frame.columns:
        frame["Churn_Label"] = (
            frame["Churn"].astype(str).str.strip().str.lower().isin(["yes", "1", "true", "churn"]).astype(int)
        )
    elif "Churn_Label" in frame.columns:
        frame["Churn_Label"] = pd.to_numeric(frame["Churn_Label"], errors="coerce").fillna(0).astype(int)

    return frame


def ensure_raw_feature_frame(df: pd.DataFrame, defaults: dict[str, Any] | None = None) -> pd.DataFrame:
    frame = clean_telco_dataframe(df)
    merged_defaults = {**RAW_FEATURE_DEFAULTS, **(defaults or {})}

    for column in RAW_FEATURE_COLUMNS:
        if column not in frame.columns:
            frame[column] = merged_defaults[column]

    for column in ["tenure", "MonthlyCharges", "TotalCharges"]:
        fallback = pd.to_numeric(pd.Series([merged_defaults[column]]), errors="coerce").fillna(0).iloc[0]
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(fallback)

    for column in set(RAW_FEATURE_COLUMNS) - {"tenure", "MonthlyCharges", "TotalCharges"}:
        frame[column] = frame[column].fillna(str(merged_defaults[column])).astype(str)

    frame["SeniorCitizen"] = frame["SeniorCitizen"].replace({"0.0": "0", "1.0": "1"}).astype(str)
    return frame[RAW_FEATURE_COLUMNS].copy()


def engineer_telco_features(df: pd.DataFrame) -> pd.DataFrame:
    frame = ensure_raw_feature_frame(df)

    frame["Num_Services"] = sum(frame[column].eq("Yes").astype(int) for column in SERVICE_COLUMNS)
    frame["Num_Internet_Services"] = sum(frame[column].eq("Yes").astype(int) for column in INTERNET_SERVICE_COLUMNS)
    frame["Has_Any_Streaming"] = (
        (frame["StreamingTV"] == "Yes") | (frame["StreamingMovies"] == "Yes")
    ).astype(int)
    frame["Has_Security_Bundle"] = (
        (frame["OnlineSecurity"] == "Yes") | (frame["TechSupport"] == "Yes")
    ).astype(int)
    frame["Has_Backup_Protection"] = (
        (frame["OnlineBackup"] == "Yes") | (frame["DeviceProtection"] == "Yes")
    ).astype(int)
    frame["Is_Fiber"] = frame["InternetService"].eq("Fiber optic").astype(int)
    frame["Is_MonthToMonth"] = frame["Contract"].eq("Month-to-month").astype(int)
    frame["Is_AutoPay"] = frame["PaymentMethod"].isin(
        ["Bank transfer (automatic)", "Credit card (automatic)"]
    ).astype(int)
    frame["Is_Electronic_Check"] = frame["PaymentMethod"].eq("Electronic check").astype(int)
    frame["Household_Flag"] = ((frame["Partner"] == "Yes") | (frame["Dependents"] == "Yes")).astype(int)
    frame["Fiber_MonthToMonth"] = (
        (frame["InternetService"] == "Fiber optic") & (frame["Contract"] == "Month-to-month")
    ).astype(int)
    frame["Unprotected_Fiber"] = (
        (frame["InternetService"] == "Fiber optic")
        & (frame["OnlineSecurity"] != "Yes")
        & (frame["TechSupport"] != "Yes")
    ).astype(int)
    frame["Tenure_Band"] = pd.cut(
        frame["tenure"],
        bins=[-1, 3, 6, 12, 24, 48, 72],
        labels=["0-3", "4-6", "7-12", "13-24", "25-48", "49-72"],
    )
    frame["Monthly_Charge_Band"] = _safe_quantile_band(
        frame["MonthlyCharges"],
        labels=["very_low", "low", "mid", "high", "very_high"],
        fallback_label="mid",
    )
    frame["Charge_Per_Month"] = frame["TotalCharges"] / frame["tenure"].replace(0, np.nan)
    frame["Tenure_Charge_Interaction"] = frame["tenure"] * frame["MonthlyCharges"]
    frame["Charge_Gap"] = frame["TotalCharges"] - frame["Tenure_Charge_Interaction"]
    frame["Charge_To_Service_Ratio"] = frame["MonthlyCharges"] / (frame["Num_Services"] + 1)
    frame["Service_Density"] = frame["Num_Internet_Services"] / (frame["tenure"] + 1)
    frame["Zero_TotalCharges"] = frame["TotalCharges"].fillna(0).eq(0).astype(int)
    frame["HighValue_NewCustomer"] = (
        (frame["tenure"] <= 12) & (frame["MonthlyCharges"] >= frame["MonthlyCharges"].median())
    ).astype(int)

    return frame


def prepare_training_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    frame = clean_telco_dataframe(df)

    if "Churn_Label" in frame.columns:
        target = frame["Churn_Label"].astype(int)
    elif "Churn" in frame.columns:
        target = frame["Churn"].astype(str).str.strip().str.lower().eq("yes").astype(int)
    else:
        raise ValueError("Training requires a target column named Churn or Churn_Label.")

    features = engineer_telco_features(frame)
    return features, target


def build_preprocessor(feature_frame: pd.DataFrame) -> ColumnTransformer:
    numeric_columns = feature_frame.select_dtypes(include=[np.number, "bool"]).columns.tolist()
    categorical_columns = [column for column in feature_frame.columns if column not in numeric_columns]

    numeric_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        [
            ("num", numeric_pipeline, numeric_columns),
            ("cat", categorical_pipeline, categorical_columns),
        ]
    )


def build_training_estimator(algorithm: str = "gradient_boosting"):
    normalized = (algorithm or "gradient_boosting").strip().lower()

    if normalized == "random_forest":
        return RandomForestClassifier(
            n_estimators=700,
            random_state=42,
            class_weight="balanced_subsample",
            min_samples_leaf=2,
            max_features="sqrt",
            n_jobs=1,
        )

    if normalized == "logistic":
        return LogisticRegression(
            max_iter=5000,
            random_state=42,
            class_weight="balanced",
            C=0.35,
        )

    return GradientBoostingClassifier(
        random_state=42,
        n_estimators=300,
        learning_rate=0.04,
        max_depth=3,
        subsample=0.85,
    )


def choose_decision_threshold(
    y_true: pd.Series | np.ndarray,
    probabilities: np.ndarray,
    precision_floor: float = TARGET_PRECISION_FLOOR,
    recall_target: float = TARGET_RECALL,
) -> dict[str, Any]:
    y_true_array = np.asarray(y_true)
    candidates: list[dict[str, float | bool]] = []

    for threshold in np.arange(0.20, 0.81, 0.01):
        predictions = (probabilities >= threshold).astype(int)
        precision = precision_score(y_true_array, predictions, zero_division=0)
        recall = recall_score(y_true_array, predictions, zero_division=0)
        f1 = f1_score(y_true_array, predictions, zero_division=0)
        candidates.append(
            {
                "threshold": round(float(threshold), 2),
                "precision": float(precision),
                "recall": float(recall),
                "f1": float(f1),
                "meets_precision_floor": bool(precision >= precision_floor),
                "meets_recall_target": bool(recall >= recall_target),
            }
        )

    fully_feasible = [
        candidate
        for candidate in candidates
        if candidate["meets_precision_floor"] and candidate["meets_recall_target"]
    ]
    if fully_feasible:
        best = max(fully_feasible, key=lambda item: (item["f1"], item["precision"], item["recall"]))
        strategy = "met_precision_and_recall_targets"
    else:
        precision_feasible = [candidate for candidate in candidates if candidate["meets_precision_floor"]]
        if precision_feasible:
            best = max(precision_feasible, key=lambda item: (item["recall"], item["precision"], item["f1"]))
            strategy = "max_recall_with_precision_floor"
        else:
            best = max(
                candidates,
                key=lambda item: (
                    min(item["precision"] / max(precision_floor, 1e-6), 1.0)
                    + min(item["recall"] / max(recall_target, 1e-6), 1.0)
                    + item["f1"]
                ),
            )
            strategy = "best_compromise_below_precision_floor"

    return {
        "threshold": float(best["threshold"]),
        "precision": round(float(best["precision"]), 4),
        "recall": round(float(best["recall"]), 4),
        "f1": round(float(best["f1"]), 4),
        "strategy": strategy,
        "target_precision_floor": precision_floor,
        "target_recall": recall_target,
        "met_precision_floor": bool(best["precision"] >= precision_floor),
        "met_recall_target": bool(best["recall"] >= recall_target),
        "met_full_target": bool(best["precision"] >= precision_floor and best["recall"] >= recall_target),
    }


def extract_default_values(feature_frame: pd.DataFrame) -> dict[str, Any]:
    defaults: dict[str, Any] = {}

    for column in feature_frame.columns:
        series = feature_frame[column]
        if pd.api.types.is_numeric_dtype(series):
            defaults[column] = float(pd.to_numeric(series, errors="coerce").median())
        else:
            mode = series.astype(str).mode(dropna=True)
            defaults[column] = str(mode.iloc[0]) if not mode.empty else ""

    return defaults


def summarize_metrics(
    y_true: pd.Series | np.ndarray,
    probabilities: np.ndarray,
    threshold: float,
) -> dict[str, Any]:
    y_true_array = np.asarray(y_true)
    predictions = (probabilities >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true_array, predictions, labels=[0, 1]).ravel()

    metrics = {
        "accuracy": round(float(accuracy_score(y_true_array, predictions)), 4),
        "precision": round(float(precision_score(y_true_array, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true_array, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true_array, predictions, zero_division=0)), 4),
        "auc_roc": round(float(roc_auc_score(y_true_array, probabilities)), 4),
        "confusion_matrix": {
            "labels": ["Retain", "Churn"],
            "matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
    }
    return metrics


def train_churn_pipeline(
    df: pd.DataFrame,
    algorithm: str = "gradient_boosting",
    test_size: float = 0.2,
    random_state: int = 42,
    precision_floor: float = TARGET_PRECISION_FLOOR,
    recall_target: float = TARGET_RECALL,
) -> TrainingArtifacts:
    features, target = prepare_training_data(df)
    stratify_target = target if target.nunique() > 1 else None
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_target,
    )

    preprocessor = build_preprocessor(x_train)
    estimator = build_training_estimator(algorithm)
    pipeline = Pipeline(
        [
            ("preprocessor", preprocessor),
            ("model", estimator),
        ]
    )
    pipeline.fit(x_train, y_train)

    probabilities = pipeline.predict_proba(x_test)[:, 1]
    threshold_result = choose_decision_threshold(
        y_true=y_test,
        probabilities=probabilities,
        precision_floor=precision_floor,
        recall_target=recall_target,
    )
    metrics = summarize_metrics(y_test, probabilities, threshold_result["threshold"])
    metrics["decision_threshold"] = threshold_result["threshold"]
    metrics["threshold_strategy"] = threshold_result["strategy"]
    metrics["target_precision_floor"] = precision_floor
    metrics["target_recall"] = recall_target
    metrics["met_precision_floor"] = threshold_result["met_precision_floor"]
    metrics["met_recall_target"] = threshold_result["met_recall_target"]
    metrics["met_full_target"] = threshold_result["met_full_target"]

    transformed_feature_names = list(pipeline.named_steps["preprocessor"].get_feature_names_out())
    feature_defaults = extract_default_values(features)
    metadata = {
        "algorithm": algorithm,
        "raw_feature_names": RAW_FEATURE_COLUMNS,
        "engineered_feature_names": [column for column in features.columns if column not in RAW_FEATURE_COLUMNS],
        "transformed_feature_names": transformed_feature_names,
        "decision_threshold": threshold_result["threshold"],
        "decision_strategy": threshold_result["strategy"],
        "target_precision_floor": precision_floor,
        "target_recall": recall_target,
        "met_precision_floor": threshold_result["met_precision_floor"],
        "met_recall_target": threshold_result["met_recall_target"],
        "met_full_target": threshold_result["met_full_target"],
        "feature_defaults": feature_defaults,
        "raw_feature_count": len(RAW_FEATURE_COLUMNS),
        "engineered_feature_count": len(features.columns) - len(RAW_FEATURE_COLUMNS),
        "transformed_feature_count": len(transformed_feature_names),
    }

    metrics_frame = x_test.copy()
    metrics_frame["Actual"] = y_test.to_numpy()
    metrics_frame["Predicted"] = (probabilities >= threshold_result["threshold"]).astype(int)
    metrics_frame["Risk_Probability"] = np.round(probabilities, 6)

    return TrainingArtifacts(
        pipeline=pipeline,
        feature_names=transformed_feature_names,
        metadata=metadata,
        metrics=metrics,
        metrics_frame=metrics_frame,
    )


def save_training_artifacts(
    artifacts: TrainingArtifacts,
    models_dir: str | Path,
    metrics_path: str | Path,
    model_filename: str = "churn_model.pkl",
) -> None:
    models_dir = Path(models_dir)
    metrics_path = Path(metrics_path)
    models_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(artifacts.pipeline, models_dir / model_filename)
    joblib.dump(artifacts.feature_names, models_dir / "feature_names.pkl")
    joblib.dump(artifacts.metadata, models_dir / "model_metadata.pkl")
    artifacts.metrics_frame.to_csv(metrics_path, index=False)
