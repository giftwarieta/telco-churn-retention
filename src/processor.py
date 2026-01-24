import pandas as pd
import numpy as np

def clean_and_prepare(df):
    df = df.copy()
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce').fillna(0)
    if 'Churn' in df.columns:
        df['Churn_Label'] = df['Churn'].apply(lambda x: 1 if x == 'Yes' else 0)
    return df

def engineer_features(df):
    df = df.copy()
    services = ['OnlineSecurity', 'OnlineBackup', 'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies']
    for col in services:
        if col not in df.columns: df[col] = 'No'
    df['Num_Services'] = (df[services] == 'Yes').sum(axis=1)
    df['Cost_Per_Service'] = df['MonthlyCharges'] / (df['Num_Services'] + 1)
    df['Tenure_to_Charge_Ratio'] = df['tenure'] / (df['MonthlyCharges'] + 1)
    return df

def get_features(df):
    df = engineer_features(df)
    cols_to_drop = ['customerID', 'Churn', 'Churn_Label']
    X = df.drop(columns=[c for c in cols_to_drop if c in df.columns])
    return pd.get_dummies(X, drop_first=True)