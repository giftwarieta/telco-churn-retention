import pandas as pd
from src.processor import clean_and_prepare, get_features
from src.model import train_and_save_assets

def run_pipeline():
    # Load
    print("Loading Data...")
    df = pd.read_csv('data/WA_Fn-UseC_-Telco-Customer-Churn 2.csv')
    
    # Clean & Engineer
    print("Cleaning and Feature Engineering...")
    df_clean = clean_and_prepare(df)
    X = get_features(df_clean)
    y = df_clean['Churn_Label']
    
    # Train & Export
    print("Training Model...")
    train_and_save_assets(X, y)
    
    print("\n--- Pipeline Execution Complete ---")

if __name__ == "__main__":
    run_pipeline()