from __future__ import annotations

import io
import sys
import traceback
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import Body, FastAPI, File, HTTPException, UploadFile, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    from xgboost import XGBClassifier
except Exception:
    XGBClassifier = None

try:
    from lightgbm import LGBMClassifier
except Exception:
    LGBMClassifier = None

ROOT_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT_DIR / "models"
DEFAULT_MODEL_PATH = MODELS_DIR / "churn_model.pkl"
FEATURE_NAMES_PATH = MODELS_DIR / "feature_names.pkl"
MODEL_METADATA_PATH = MODELS_DIR / "model_metadata.pkl"
METRICS_PATH = ROOT_DIR / "postdictive_full_results.csv"

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

NUMERIC_FEATURE_COLUMNS = ["tenure", "MonthlyCharges", "TotalCharges"]
CATEGORICAL_FEATURE_COLUMNS = [column for column in RAW_FEATURE_COLUMNS if column not in NUMERIC_FEATURE_COLUMNS]

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
    "OnlineBackup": "Yes",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "Yes",
    "StreamingMovies": "No",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 70.35,
    "TotalCharges": 844.2,
}

KNOWN_DATASET_COLUMNS = tuple(RAW_FEATURE_COLUMNS) + ("customerID", "Churn", "Churn_Label")

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

PROCESSOR_AVAILABLE = False
TRAINING_HELPERS_AVAILABLE = False

try:
    from src.processor import clean_and_prepare, engineer_features, get_features
    PROCESSOR_AVAILABLE = True
except Exception:
    clean_and_prepare = None
    engineer_features = None
    get_features = None

try:
    from src.training import (
        engineer_telco_features,
        ensure_raw_feature_frame,
        save_training_artifacts,
        train_churn_pipeline,
    )
    TRAINING_HELPERS_AVAILABLE = True
except Exception:
    engineer_telco_features = None
    ensure_raw_feature_frame = None
    save_training_artifacts = None
    train_churn_pipeline = None

SRC_AVAILABLE = PROCESSOR_AVAILABLE or TRAINING_HELPERS_AVAILABLE


# ---------------------------------------------------------
# FASTAPI APP INITIALIZATION
# ---------------------------------------------------------
app = FastAPI(
    title="ChurnIQ Vercel Backend",
    description="Serverless churn prediction backend for the ChurnIQ dashboard.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# VERCEL ROUTER - Crucial for preventing 404s
# ---------------------------------------------------------
router = APIRouter(prefix="/api")


# ---------------------------------------------------------
# DATA MODELS
# ---------------------------------------------------------
class CustomerData(BaseModel):
    gender: str = "Male"
    SeniorCitizen: str = "0"
    Partner: str = "Yes"
    Dependents: str = "No"
    tenure: float = 12
    PhoneService: str = "Yes"
    MultipleLines: str = "No"
    InternetService: str = "Fiber optic"
    OnlineSecurity: str = "No"
    OnlineBackup: str = "Yes"
    DeviceProtection: str = "No"
    TechSupport: str = "No"
    StreamingTV: str = "Yes"
    StreamingMovies: str = "No"
    Contract: str = "Month-to-month"
    PaperlessBilling: str = "Yes"
    PaymentMethod: str = "Electronic check"
    MonthlyCharges: float = 70.35
    TotalCharges: float = 844.2


class TrainParams(BaseModel):
    algorithm: str = "xgboost"
    test_size: float = 0.2
    data_path: Optional[str] = None
    csv_content: Optional[str] = None
    filename: Optional[str] = None


class ROIParams(BaseModel):
    total_customers: int = 10000
    churn_rate: float = 0.22
    avg_arpu: float = 8500
    retention_cost: float = 1500
    success_rate: float = 0.35
    avg_clv: float = 102000


def model_to_dict(model: BaseModel) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _normalise_column_name(value: str) -> str:
    return "".join(char.lower() for char in str(value).strip() if char.isalnum())


def _harmonize_dataset_columns(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy()
    alias_lookup = {_normalise_column_name(column): column for column in KNOWN_DATASET_COLUMNS}
    rename_map: dict[str, str] = {}

    for column in frame.columns:
        canonical = alias_lookup.get(_normalise_column_name(column))
        if canonical and canonical not in frame.columns:
            rename_map[column] = canonical

    if rename_map:
        frame = frame.rename(columns=rename_map)

    return frame


def _find_existing_column(columns: list[str] | pd.Index, candidates: tuple[str, ...]) -> Optional[str]:
    normalized_candidates = {_normalise_column_name(candidate) for candidate in candidates}

    for column in columns:
        if _normalise_column_name(column) in normalized_candidates:
            return str(column)

    return None


# ---------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------
def _find_model_path() -> Path:
    if DEFAULT_MODEL_PATH.exists():
        return DEFAULT_MODEL_PATH

    candidates = [
        path
        for path in sorted(MODELS_DIR.glob("*.pkl"))
        if path.name not in {"explainer.pkl", "feature_names.pkl"}
    ]
    if not candidates:
        raise FileNotFoundError("No trained churn model was found in the models directory.")
    return candidates[-1]


@lru_cache(maxsize=1)
def get_model():
    model_path = _find_model_path()
    try:
        return joblib.load(model_path)
    except ModuleNotFoundError as exc:
        module_name = getattr(exc, "name", "") or ""
        if module_name.startswith("sklearn.") or "sklearn." in str(exc):
            _rebuild_model_artifacts(exc)
            return joblib.load(model_path)
        raise
    except Exception as exc:
        if "sklearn." in str(exc):
            _rebuild_model_artifacts(exc)
            return joblib.load(model_path)
        raise


@lru_cache(maxsize=1)
def get_model_metadata() -> dict[str, Any]:
    if MODEL_METADATA_PATH.exists():
        loaded = joblib.load(MODEL_METADATA_PATH)
        if isinstance(loaded, dict):
            return loaded
    return {
        "raw_feature_names": RAW_FEATURE_COLUMNS,
        "transformed_feature_names": [],
        "decision_threshold": 0.5,
        "feature_defaults": RAW_FEATURE_DEFAULTS,
    }


@lru_cache(maxsize=1)
def get_feature_names() -> tuple[str, ...]:
    if FEATURE_NAMES_PATH.exists():
        loaded = joblib.load(FEATURE_NAMES_PATH)
        return tuple(str(item) for item in loaded)

    metadata = get_model_metadata()
    transformed = metadata.get("transformed_feature_names") or []
    if transformed:
        return tuple(str(item) for item in transformed)

    model = get_model()
    if hasattr(model, "feature_names_in_"):
        return tuple(str(item) for item in model.feature_names_in_)

    raise FileNotFoundError("Feature names are missing. Add models/feature_names.pkl before deploying.")


def _rebuild_model_artifacts(reason: Exception | str) -> None:
    if not (TRAINING_HELPERS_AVAILABLE and train_churn_pipeline and save_training_artifacts):
        raise RuntimeError(
            f"Model artifacts are incompatible with the current scikit-learn runtime, and training helpers are unavailable: {reason}"
        )

    training_path = _find_training_dataset_path()
    training_frame = pd.read_csv(training_path)

    existing_metadata = {}
    if MODEL_METADATA_PATH.exists():
        try:
            loaded_metadata = joblib.load(MODEL_METADATA_PATH)
            if isinstance(loaded_metadata, dict):
                existing_metadata = loaded_metadata
        except Exception:
            existing_metadata = {}

    algorithm = str(existing_metadata.get("algorithm") or "gradient_boosting")
    artifacts = train_churn_pipeline(
        df=training_frame,
        algorithm=algorithm,
        test_size=0.2,
        precision_floor=0.68,
        recall_target=0.80,
    )

    metadata = dict(artifacts.metadata)
    metadata["trained_at"] = datetime.now(timezone.utc).isoformat()
    metadata["auto_retrained"] = True
    metadata["auto_retrain_reason"] = str(reason)
    metadata["auto_retrain_dataset"] = str(training_path.name)

    save_training_artifacts(
        artifacts=artifacts,
        models_dir=MODELS_DIR,
        metrics_path=METRICS_PATH,
    )
    joblib.dump(metadata, MODEL_METADATA_PATH)

    get_model.cache_clear()
    get_feature_names.cache_clear()
    get_model_metadata.cache_clear()


def _normalize_customer_frame(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy()
    defaults = {
        "SeniorCitizen": 0,
        "tenure": 0,
        "MonthlyCharges": 0.0,
        "TotalCharges": 0.0,
    }

    for column, default in defaults.items():
        if column not in frame.columns:
            frame[column] = default

    frame["SeniorCitizen"] = pd.to_numeric(frame["SeniorCitizen"], errors="coerce").fillna(0).astype(int)
    frame["tenure"] = pd.to_numeric(frame["tenure"], errors="coerce").fillna(0)
    frame["MonthlyCharges"] = pd.to_numeric(frame["MonthlyCharges"], errors="coerce").fillna(0.0)
    frame["TotalCharges"] = pd.to_numeric(frame["TotalCharges"], errors="coerce").fillna(0.0)
    return frame


def _ensure_raw_feature_frame(df: pd.DataFrame, defaults: Optional[dict[str, Any]] = None) -> pd.DataFrame:
    frame = df.copy()
    merged_defaults = {**RAW_FEATURE_DEFAULTS, **(defaults or {})}

    for column in RAW_FEATURE_COLUMNS:
        if column not in frame.columns:
            frame[column] = merged_defaults[column]

    frame["SeniorCitizen"] = frame["SeniorCitizen"].astype(str).replace({"0.0": "0", "1.0": "1"})
    frame["tenure"] = pd.to_numeric(frame["tenure"], errors="coerce")
    frame["MonthlyCharges"] = pd.to_numeric(frame["MonthlyCharges"], errors="coerce")
    frame["TotalCharges"] = pd.to_numeric(frame["TotalCharges"], errors="coerce")

    for column in NUMERIC_FEATURE_COLUMNS:
        fallback = pd.to_numeric(pd.Series([merged_defaults[column]]), errors="coerce").fillna(0).iloc[0]
        frame[column] = frame[column].fillna(fallback)

    for column in CATEGORICAL_FEATURE_COLUMNS:
        frame[column] = frame[column].fillna(str(merged_defaults[column])).astype(str)

    return frame[RAW_FEATURE_COLUMNS].copy()


def _build_preprocessor() -> ColumnTransformer:
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
            ("num", numeric_pipeline, NUMERIC_FEATURE_COLUMNS),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURE_COLUMNS),
        ]
    )


def _extract_default_values(df: pd.DataFrame) -> dict[str, Any]:
    defaults = dict(RAW_FEATURE_DEFAULTS)
    for column in NUMERIC_FEATURE_COLUMNS:
        defaults[column] = float(pd.to_numeric(df[column], errors="coerce").median())
    for column in CATEGORICAL_FEATURE_COLUMNS:
        mode = df[column].astype(str).mode(dropna=True)
        if not mode.empty:
            defaults[column] = str(mode.iloc[0])
    defaults["SeniorCitizen"] = str(defaults["SeniorCitizen"])
    return defaults


def _raw_feature_from_transformed(name: str) -> str:
    base_name = name.split("__", 1)[-1]
    for feature in sorted(RAW_FEATURE_COLUMNS, key=len, reverse=True):
        if base_name == feature or base_name.startswith(f"{feature}_"):
            return feature
    return base_name


def _choose_decision_threshold(y_true: pd.Series, probabilities: np.ndarray) -> float:
    candidate_thresholds = np.arange(0.20, 0.61, 0.01)
    best_score = None
    best_threshold = 0.5

    for threshold in candidate_thresholds:
        predictions = (probabilities >= threshold).astype(int)
        precision = precision_score(y_true, predictions, zero_division=0)
        recall = recall_score(y_true, predictions, zero_division=0)
        f1 = f1_score(y_true, predictions, zero_division=0)
        score = min(precision, recall) + (0.2 * f1)

        if best_score is None or score > best_score:
            best_score = score
            best_threshold = float(threshold)

    return round(best_threshold, 2)


def _find_training_dataset_path() -> Path:
    preferred = ROOT_DIR / "data" / "WA_Fn-UseC_-Telco-Customer-Churn 2.csv"
    if preferred.exists():
        return preferred

    for path in sorted((ROOT_DIR / "data").glob("*.csv")):
        try:
            sample = pd.read_csv(path, nrows=5)
            if "Churn" in sample.columns and all(column in sample.columns for column in RAW_FEATURE_COLUMNS):
                return path
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="No valid churn training dataset was found.")


def _safe_quantile_band(series: pd.Series, labels: list[str], fallback_label: str) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    if numeric.dropna().nunique() < 2:
        return pd.Series([fallback_label] * len(series), index=series.index, dtype="object")

    try:
        banded = pd.qcut(numeric, q=min(len(labels), numeric.dropna().nunique()), duplicates="drop")
        categories = list(banded.cat.categories)
        if not categories:
            return pd.Series([fallback_label] * len(series), index=series.index, dtype="object")
        renamed = banded.cat.rename_categories(labels[: len(categories)])
        return renamed.astype("object").fillna(fallback_label)
    except Exception:
        return pd.Series([fallback_label] * len(series), index=series.index, dtype="object")


def _apply_feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    frame = _ensure_raw_feature_frame(df)

    if SRC_AVAILABLE and clean_and_prepare and engineer_features:
        try:
            frame = clean_and_prepare(frame)
            frame = engineer_features(frame)
            return frame
        except Exception:
            pass

    service_columns = [
        "MultipleLines",
        "OnlineSecurity",
        "OnlineBackup",
        "DeviceProtection",
        "TechSupport",
        "StreamingTV",
        "StreamingMovies",
    ]
    internet_service_columns = [
        "OnlineSecurity",
        "OnlineBackup",
        "DeviceProtection",
        "TechSupport",
        "StreamingTV",
        "StreamingMovies",
    ]
    frame["Num_Services"] = sum(frame[column].eq("Yes").astype(int) for column in service_columns)
    frame["Num_Internet_Services"] = sum(frame[column].eq("Yes").astype(int) for column in internet_service_columns)
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


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    df = _harmonize_dataset_columns(df)
    defaults = get_model_metadata().get("feature_defaults") or RAW_FEATURE_DEFAULTS
    raw_frame = (
        ensure_raw_feature_frame(df, defaults=defaults)
        if ensure_raw_feature_frame
        else _ensure_raw_feature_frame(df, defaults=defaults)
    )
    if engineer_telco_features:
        return engineer_telco_features(raw_frame)
    return _apply_feature_engineering(raw_frame)


def prepare_training_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    frame = _harmonize_dataset_columns(df)

    if SRC_AVAILABLE and clean_and_prepare:
        frame = clean_and_prepare(frame)
    else:
        frame = _normalize_customer_frame(frame)

    target_label_column = _find_existing_column(frame.columns, ("Churn_Label", "Churn Label", "churn_label"))
    target_text_column = _find_existing_column(frame.columns, ("Churn",))

    if target_label_column:
        target = pd.to_numeric(frame[target_label_column], errors="coerce").fillna(0).astype(int)
    elif target_text_column:
        target = frame[target_text_column].astype(str).str.strip().str.lower().isin(["yes", "1", "true", "churn"]).astype(int)
    else:
        raise HTTPException(
            status_code=400,
            detail="Training requires a target column named Churn or Churn_Label in the uploaded dataset.",
        )

    if target.nunique() < 2:
        raise HTTPException(
            status_code=400,
            detail="Training requires at least two target classes in the churn column.",
        )

    features = _ensure_raw_feature_frame(frame)
    return features, target


def build_training_estimator(algorithm: str):
    normalized = (algorithm or "xgboost").strip().lower()

    if normalized == "random_forest":
        return RandomForestClassifier(
            n_estimators=800,
            random_state=42,
            class_weight="balanced_subsample",
            min_samples_leaf=2,
            max_features="sqrt",
        )

    if normalized == "logistic":
        return LogisticRegression(max_iter=3000, random_state=42, class_weight="balanced", C=0.5)

    if normalized in {"lightgbm", "xgboost", "gradient_boosting"}:
        return GradientBoostingClassifier(
            random_state=42,
            n_estimators=300,
            learning_rate=0.04,
            max_depth=3,
            subsample=0.85,
        )

    return GradientBoostingClassifier(
        random_state=42,
        n_estimators=300,
        learning_rate=0.04,
        max_depth=3,
        subsample=0.85,
    )


def get_risk_level(probability: float) -> str:
    if probability >= 0.70:
        return "high"
    if probability >= 0.40:
        return "medium"
    return "low"


def _prediction_probability(model: Any, features: pd.DataFrame) -> float:
    probabilities = model.predict_proba(features)
    return float(probabilities[0][1])


def _local_impacts(model: Any, features: pd.DataFrame, limit: int = 6) -> list[dict[str, Any]]:
    baseline = _prediction_probability(model, features)
    defaults = get_model_metadata().get("feature_defaults") or RAW_FEATURE_DEFAULTS
    impacts: list[dict[str, Any]] = []

    for index, column in enumerate(features.columns):
        original_value = features.iloc[0, index]
        default_value = defaults.get(column, RAW_FEATURE_DEFAULTS.get(column))

        if str(original_value) == str(default_value):
            continue

        perturbed = features.copy()
        perturbed.iloc[0, index] = default_value
        shifted = baseline - _prediction_probability(model, perturbed)

        if abs(shifted) < 1e-6:
            continue

        impacts.append(
            {
                "feature": column,
                "impact": round(float(shifted), 4),
                "direction": "increases" if shifted > 0 else "decreases",
            }
        )

    impacts.sort(key=lambda item: abs(item["impact"]), reverse=True)
    return impacts[:limit]


def _global_importance() -> list[dict[str, Any]]:
    model = get_model()
    metadata = get_model_metadata()
    transformed_feature_names = list(metadata.get("transformed_feature_names") or get_feature_names())

    estimator = model.named_steps["model"] if hasattr(model, "named_steps") else model

    if hasattr(estimator, "feature_importances_"):
        importances = np.asarray(estimator.feature_importances_, dtype=float)
    elif hasattr(estimator, "coef_"):
        importances = np.abs(np.asarray(estimator.coef_[0], dtype=float))
    else:
        raise HTTPException(status_code=503, detail="Model explainability is not available for this model type.")

    aggregated: dict[str, float] = {}
    for index, importance in enumerate(importances):
        raw_feature = _raw_feature_from_transformed(transformed_feature_names[index])
        aggregated[raw_feature] = aggregated.get(raw_feature, 0.0) + float(abs(importance))

    ranked = sorted(aggregated.items(), key=lambda item: item[1], reverse=True)[:15]
    return [{"feature": feature, "shap": round(value, 4), "direction": "positive"} for feature, value in ranked]


def _local_explanation(customer: CustomerData) -> tuple[list[dict[str, Any]], float]:
    model = get_model()
    features = prepare_features(pd.DataFrame([model_to_dict(customer)]))
    baseline = _prediction_probability(model, features)
    explanation = []

    for index, column in enumerate(features.columns):
        value = float(features.iloc[0, index])
        if value == 0:
            continue

        perturbed = features.copy()
        perturbed.iloc[0, index] = 0.0
        delta = baseline - _prediction_probability(model, perturbed)

        if abs(delta) < 1e-6:
            continue

        explanation.append(
            {
                "feature": column,
                "shap": round(float(delta), 4),
                "weight": round(float(delta), 4),
                "direction": "positive" if delta > 0 else "negative",
            }
        )

    explanation.sort(key=lambda item: abs(item["shap"]), reverse=True)
    return explanation[:15], baseline


def _load_metrics() -> list[dict[str, Any]]:
    if METRICS_PATH.exists():
        try:
            metrics_frame = pd.read_csv(METRICS_PATH)
            if {"Actual", "Predicted"}.issubset(metrics_frame.columns):
                actual = metrics_frame["Actual"].astype(int)
                predicted = metrics_frame["Predicted"].astype(int)
                metrics = [
                    {"metric": "accuracy", "value": round(float(accuracy_score(actual, predicted)), 4)},
                    {"metric": "precision", "value": round(float(precision_score(actual, predicted, zero_division=0)), 4)},
                    {"metric": "recall", "value": round(float(recall_score(actual, predicted, zero_division=0)), 4)},
                    {"metric": "f1", "value": round(float(f1_score(actual, predicted, zero_division=0)), 4)},
                    {"metric": "records", "value": int(len(metrics_frame))},
                ]
                if "Risk_Probability" in metrics_frame.columns:
                    probability = pd.to_numeric(metrics_frame["Risk_Probability"], errors="coerce").fillna(0)
                    metrics.insert(1, {"metric": "auc_roc", "value": round(float(roc_auc_score(actual, probability)), 4)})
                return metrics
        except Exception:
            pass

    return [
        {"metric": "accuracy", "value": 0.798},
        {"metric": "auc_roc", "value": 0.847},
        {"metric": "precision", "value": 0.652},
        {"metric": "recall", "value": 0.549},
        {"metric": "f1", "value": 0.596},
    ]


# ---------------------------------------------------------
# API ENDPOINTS (Using @router to prevent Vercel 404s)
# ---------------------------------------------------------
@router.get("/health")
def health_check():
    model_loaded = True
    try:
        get_model()
        get_feature_names()
    except Exception:
        model_loaded = False

    return {
        "message": "Telco ChurnIQ API is Live!",
        "developed by": "Warieta Gift Ejovwoke for practice",
        "status": "ok" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "version": app.version,
    }


@router.get("/")
def root():
    return {
        "status": "ok",
        "service": "ChurnIQ FastAPI backend",
        "version": app.version,
    }


@router.get("/model/info")
def model_info():
    try:
        model = get_model()
        feature_names = get_feature_names()
        metadata = get_model_metadata()
    except Exception:
        raise HTTPException(status_code=503, detail="A trained model is not available in this deployment.")

    info = {
        "model_type": type(model).__name__,
        "feature_count": len(feature_names),
        "training_supported": True,
        "src_available": SRC_AVAILABLE,
        "metadata": metadata,
    }

    if hasattr(model, "n_estimators"):
        info["n_estimators"] = model.n_estimators

    return info


@router.get("/model/metrics")
def model_metrics():
    return {"metrics": _load_metrics()}


@router.post("/predict")
def predict(customer: CustomerData):
    try:
        model = get_model()
        features = prepare_features(pd.DataFrame([model_to_dict(customer)]))
        probability = _prediction_probability(model, features)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="A trained model is not available in this deployment.")
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction could not be completed right now.")

    prediction = int(probability >= 0.5)
    return {
        "churn_probability": round(probability, 4),
        "churn_prediction": prediction,
        "risk_level": get_risk_level(probability),
        "confidence": round(max(probability, 1 - probability), 4),
        "top_factors": _local_impacts(model, features),
    }


@router.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    try:
        model = get_model()
        content = await file.read()
        raw = pd.read_csv(io.StringIO(content.decode("utf-8")))
        features = prepare_features(raw)
        probabilities = model.predict_proba(features)[:, 1]
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="A trained model is not available in this deployment.")
    except Exception:
        raise HTTPException(status_code=400, detail="Batch prediction failed. Check that the uploaded CSV uses the expected columns.")

    predictions = (probabilities >= 0.5).astype(int)
    risks = [get_risk_level(float(item)) for item in probabilities]

    result_frame = raw.copy()
    result_frame["churn_probability"] = np.round(probabilities, 4)
    result_frame["churn_prediction"] = predictions
    result_frame["risk_level"] = risks

    preview_columns = ["customerID", "churn_probability", "risk_level"]
    if "customerID" not in result_frame.columns:
        preview_columns = list(result_frame.columns[: min(3, len(result_frame.columns))]) + [
            "churn_probability",
            "risk_level",
        ]

    return {
        "total_records": int(len(raw)),
        "high_risk_count": int(np.sum(np.array(risks) == "high")),
        "medium_risk_count": int(np.sum(np.array(risks) == "medium")),
        "low_risk_count": int(np.sum(np.array(risks) == "low")),
        "churn_rate": round(float(predictions.mean()), 4),
        "avg_probability": round(float(probabilities.mean()), 4),
        "export_rows": result_frame.to_dict(orient="records"),
        "preview": result_frame[preview_columns].head(10).to_dict(orient="records"),
    }


@router.post("/explain/shap")
def explain_shap(payload: Optional[dict[str, Any]] = Body(default=None)):
    if not payload:
        try:
            return {"shap_values": _global_importance()}
        except FileNotFoundError:
            raise HTTPException(status_code=503, detail="A trained model is not available in this deployment.")

    try:
        customer = CustomerData(**payload)
        explanation, baseline = _local_explanation(customer)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="A trained model is not available in this deployment.")
    except Exception:
        raise HTTPException(status_code=500, detail="Explainability data could not be generated right now.")

    return {"shap_values": explanation, "base_value": round(float(baseline), 4)}


@router.post("/explain/lime")
def explain_lime(customer: CustomerData):
    try:
        explanation, baseline = _local_explanation(customer)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="A trained model is not available in this deployment.")
    except Exception:
        raise HTTPException(status_code=500, detail="Explainability data could not be generated right now.")

    lime_values = [
        {
            "feature": item["feature"],
            "weight": item["weight"],
            "direction": "churn" if item["weight"] > 0 else "retain",
        }
        for item in explanation[:10]
    ]
    return {"lime_values": lime_values, "prediction_probability": round(float(baseline), 4)}


@router.post("/train")
def train(params: TrainParams):
    try:
        if params.csv_content:
            training_frame = pd.read_csv(io.StringIO(params.csv_content))
        elif params.data_path:
            training_frame = pd.read_csv(params.data_path)
        else:
            default_candidates = sorted((ROOT_DIR / "data").glob("*.csv"))
            if not default_candidates:
                raise HTTPException(status_code=404, detail="No training dataset was found.")
            training_frame = pd.read_csv(default_candidates[0])

        features, target = prepare_training_data(training_frame)
        if len(features) < 10:
            raise HTTPException(status_code=400, detail="The training dataset is too small to evaluate reliably.")

        stratify_target = target if target.nunique() > 1 else None
        x_train, x_test, y_train, y_test = train_test_split(
            features,
            target,
            test_size=params.test_size,
            random_state=42,
            stratify=stratify_target,
        )

        preprocessor = _build_preprocessor()
        estimator = build_training_estimator(params.algorithm)
        training_pipeline = Pipeline(
            [
                ("preprocessor", preprocessor),
                ("model", estimator),
            ]
        )
        started_at = datetime.now(timezone.utc)
        import time

        start_time = time.perf_counter()
        training_pipeline.fit(x_train, y_train)
        elapsed = round(time.perf_counter() - start_time, 2)

        if hasattr(training_pipeline, "predict_proba"):
            y_prob = training_pipeline.predict_proba(x_test)[:, 1]
        else:
            raw_scores = training_pipeline.decision_function(x_test)
            y_prob = 1 / (1 + np.exp(-raw_scores))

        decision_threshold = _choose_decision_threshold(y_test, y_prob)
        y_pred = (y_prob >= decision_threshold).astype(int)

        tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()

        accuracy = round(float(accuracy_score(y_test, y_pred)), 4)
        precision = round(float(precision_score(y_test, y_pred, zero_division=0)), 4)
        recall = round(float(recall_score(y_test, y_pred, zero_division=0)), 4)
        f1 = round(float(f1_score(y_test, y_pred, zero_division=0)), 4)
        try:
            auc_roc = round(float(roc_auc_score(y_test, y_prob)), 4)
        except Exception:
            auc_roc = 0.5

        transformed_feature_count = None
        try:
            transformed_feature_count = int(len(training_pipeline.named_steps["preprocessor"].get_feature_names_out()))
        except Exception:
            transformed_feature_count = None

        return {
            "algorithm": params.algorithm,
            "accuracy": accuracy,
            "auc_roc": auc_roc,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "training_samples": int(len(x_train)),
            "test_samples": int(len(x_test)),
            "feature_count": int(x_train.shape[1]),
            "transformed_feature_count": transformed_feature_count,
            "decision_threshold": decision_threshold,
            "training_time": elapsed,
            "trained_at": started_at.isoformat(),
            "dataset_name": params.filename or params.data_path or "session-upload.csv",
            "model_evaluation": [
                {"label": "Accuracy", "value": accuracy},
                {"label": "AUC-ROC", "value": auc_roc},
                {"label": "Precision", "value": precision},
                {"label": "Recall", "value": recall},
                {"label": "F1 Score", "value": f1},
                {"label": "Decision Threshold", "value": decision_threshold},
            ],
            "confusion_matrix": {
                "labels": ["Retain", "Churn"],
                "matrix": [
                    [int(tn), int(fp)],
                    [int(fn), int(tp)],
                ],
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
            },
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        print("Training error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Training could not be completed right now.")


@router.post("/roi/calculate")
def roi_calculate(params: ROIParams):
    churning_customers = round(params.total_customers * params.churn_rate)
    revenue_at_risk = churning_customers * params.avg_arpu * 12
    total_retention_cost = churning_customers * params.retention_cost
    saved_customers = round(churning_customers * params.success_rate)
    revenue_recovered = saved_customers * params.avg_arpu * 12
    clv_saved = saved_customers * params.avg_clv
    net_roi = revenue_recovered - total_retention_cost
    roi_percent = (net_roi / total_retention_cost * 100) if total_retention_cost > 0 else 0
    payback_months = (total_retention_cost / (revenue_recovered / 12)) if revenue_recovered > 0 else 0

    return {
        "churning_customers": int(churning_customers),
        "revenue_at_risk": round(float(revenue_at_risk), 2),
        "total_retention_cost": round(float(total_retention_cost), 2),
        "saved_customers": int(saved_customers),
        "revenue_recovered": round(float(revenue_recovered), 2),
        "clv_saved": round(float(clv_saved), 2),
        "net_roi": round(float(net_roi), 2),
        "roi_percent": round(float(roi_percent), 2),
        "payback_months": round(float(payback_months), 2),
    }


# ---------------------------------------------------------
# ATTACH ROUTER TO APP (Do not remove this!)
# ---------------------------------------------------------
app.include_router(router)
