import joblib
import shap
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

def get_model_instance(model_type):
    if model_type == "Gradient Boosting":
        return GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
    elif model_type == "Random Forest":
        return RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    return LogisticRegression(max_iter=1000)

def train_custom_model(X_train, X_test, y_train, y_test, model_type):
    model = get_model_instance(model_type)
    model.fit(X_train, y_train)
    
    # Generate Metrics
    preds = model.predict(X_test)
    metrics = {
        "Accuracy": accuracy_score(y_test, preds),
        "Precision": precision_score(y_test, preds),
        "Recall": recall_score(y_test, preds),
        "F1-Score": f1_score(y_test, preds)
    }
    
    # SHAP (Only for tree-based models)
    explainer = None
    if model_type in ["Gradient Boosting", "Random Forest"]:
        explainer = shap.TreeExplainer(model)
        
    return model, explainer, metrics