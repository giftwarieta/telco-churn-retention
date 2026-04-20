import pandas as pd

from src.training import clean_telco_dataframe, engineer_telco_features


def clean_and_prepare(df: pd.DataFrame) -> pd.DataFrame:
    return clean_telco_dataframe(df)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    return engineer_telco_features(df)


def get_features(df: pd.DataFrame) -> pd.DataFrame:
    frame = engineer_telco_features(df)
    cols_to_drop = ["customerID", "Churn", "Churn_Label"]
    feature_frame = frame.drop(columns=[column for column in cols_to_drop if column in frame.columns], errors="ignore")
    return pd.get_dummies(feature_frame, drop_first=True)
