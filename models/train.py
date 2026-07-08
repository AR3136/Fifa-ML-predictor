import os
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import PredefinedSplit, RandomizedSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def define_target(row):
    """Helper to map score outcomes to targets."""
    if row['home_score'] > row['away_score']:
        return 2  # Home Win
    elif row['home_score'] == row['away_score']:
        return 1  # Draw
    else:
        return 0  # Away Win

def load_data(filepath: str):
    """Loads engineered features and sets target variable."""
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['date'])
    df['target'] = df.apply(define_target, axis=1)
    
    # We only train on matches from 2000 onwards (FIFA ranks and ratings are more robust)
    df_filtered = df[df['date'].dt.year >= 2000].copy()
    logger.info(f"Filtered dataset from 2000 onwards: {df_filtered.shape}")
    return df_filtered

def split_chronological(df: pd.DataFrame, split_date: str = '2023-01-01'):
    """Performs chronological split to prevent leakage (Train before 2023, Test from 2023)."""
    train_df = df[df['date'] < split_date].copy()
    test_df = df[df['date'] >= split_date].copy()
    logger.info(f"Chronological split: {len(train_df)} train rows, {len(test_df)} test rows")
    return train_df, test_df

def evaluate_model(model, X_test, y_test, name: str) -> dict:
    """Computes comprehensive performance metrics for a model."""
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='macro')
    recall = recall_score(y_test, y_pred, average='macro')
    f1 = f1_score(y_test, y_pred, average='macro')
    cm = confusion_matrix(y_test, y_pred)
    
    # ROC AUC for multi-class classification
    try:
        roc_auc = roc_auc_score(y_test, y_proba, multi_class='ovr', average='macro')
    except Exception as e:
        logger.warning(f"Could not compute ROC AUC for {name}: {e}")
        roc_auc = 0.0
        
    logger.info(f"--- {name} Results ---")
    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info(f"Precision (macro): {precision:.4f}")
    logger.info(f"Recall (macro): {recall:.4f}")
    logger.info(f"F1 Score (macro): {f1:.4f}")
    logger.info(f"ROC AUC (macro): {roc_auc:.4f}")
    logger.info(f"Confusion Matrix:\n{cm}")
    
    return {
        'name': name,
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'roc_auc': roc_auc,
        'model_object': model
    }

def train_and_tune_all(X_train, y_train, X_test, y_test):
    """Trains 5 different models, performs quick hyperparameter tuning, and selects the best."""
    # Scale data for models that require it (like Logistic Regression)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Define models and their search space for RandomizedSearchCV
    # To keep execution fast, we do 3 folds with predefined train/val split and fewer iterations
    # Predefined split: use 80% train, 20% validation inside training set
    split_idx = np.full(X_train.shape[0], -1)
    val_size = int(0.2 * len(split_idx))
    split_idx[:val_size] = 0
    ps = PredefinedSplit(test_fold=split_idx)
    
    models_config = {
        'Logistic Regression': {
            'model': LogisticRegression(max_iter=500, random_state=42),
            'params': {'C': [0.01, 0.1, 1.0, 10.0]},
            'scaled': True,
            'n_iter': 4
        },
        'Random Forest': {
            'model': RandomForestClassifier(random_state=42),
            'params': {
                'n_estimators': [50, 100, 200],
                'max_depth': [5, 10, 15, None]
            },
            'scaled': False,
            'n_iter': 4
        },
        'XGBoost': {
            'model': XGBClassifier(random_state=42, eval_metric='mlogloss'),
            'params': {
                'n_estimators': [50, 100, 150],
                'learning_rate': [0.01, 0.05, 0.1, 0.2],
                'max_depth': [3, 5, 7]
            },
            'scaled': False,
            'n_iter': 4
        },
        'LightGBM': {
            'model': LGBMClassifier(random_state=42, verbose=-1),
            'params': {
                'n_estimators': [50, 100, 150],
                'learning_rate': [0.01, 0.05, 0.1],
                'num_leaves': [15, 31, 63]
            },
            'scaled': False,
            'n_iter': 4
        },
        'CatBoost': {
            'model': CatBoostClassifier(random_seed=42, verbose=0),
            'params': {
                'iterations': [100, 200],
                'learning_rate': [0.03, 0.1],
                'depth': [4, 6]
            },
            'scaled': False,
            'n_iter': 3
        }
    }
    
    results = []
    
    for name, config in models_config.items():
        logger.info(f"Tuning {name}...")
        X_tr = X_train_scaled if config['scaled'] else X_train
        X_te = X_test_scaled if config['scaled'] else X_test
        
        rs = RandomizedSearchCV(
            estimator=config['model'],
            param_distributions=config['params'],
            n_iter=config['n_iter'],
            cv=ps,
            scoring='accuracy',
            random_state=42,
            n_jobs=-1
        )
        
        rs.fit(X_tr, y_train)
        best_model = rs.best_estimator_
        logger.info(f"Best params for {name}: {rs.best_params_}")
        
        eval_metrics = evaluate_model(best_model, X_te, y_test, name)
        eval_metrics['scaled'] = config['scaled']
        results.append(eval_metrics)
        
    # Select best model based on F1 Score
    best_eval = max(results, key=lambda x: x['f1'])
    logger.info(f"Winner model: {best_eval['name']} with F1 Score {best_eval['f1']:.4f}")
    
    return best_eval, scaler

def run_pipeline():
    filepath = 'C:/Users/Admin/Desktop/Fifa prediction/datasets/processed/engineered_features.csv'
    df = load_data(filepath)
    
    features = [
        'home_elo', 'away_elo', 'elo_difference',
        'home_fifa_rank', 'away_fifa_rank', 'rank_difference', 'fifa_points_difference',
        'home_last_5_win_rate', 'home_last_5_draw_rate', 'home_last_5_loss_rate',
        'home_last_5_goals_scored_avg', 'home_last_5_goals_conceded_avg', 'home_last_5_goal_diff_avg',
        'away_last_5_win_rate', 'away_last_5_draw_rate', 'away_last_5_loss_rate',
        'away_last_5_goals_scored_avg', 'away_last_5_goals_conceded_avg', 'away_last_5_goal_diff_avg',
        'h2h_home_wins', 'h2h_away_wins', 'h2h_draws',
        'tournament_importance', 'is_home_host', 'match_year'
    ]
    
    train_df, test_df = split_chronological(df)
    
    X_train = train_df[features]
    y_train = train_df['target']
    
    X_test = test_df[features]
    y_test = test_df['target']
    
    # Run training and select best
    best_eval, scaler = train_and_tune_all(X_train, y_train, X_test, y_test)
    
    # Save the best model, scaler, and features list
    save_payload = {
        'model': best_eval['model_object'],
        'scaler': scaler if best_eval['scaled'] else None,
        'features': features,
        'model_name': best_eval['name']
    }
    
    model_dir = 'C:/Users/Admin/Desktop/Fifa prediction/models'
    os.makedirs(model_dir, exist_ok=True)
    save_path = os.path.join(model_dir, 'best_model.joblib')
    joblib.dump(save_payload, save_path)
    logger.info(f"Saved best model bundle to {save_path}")

if __name__ == '__main__':
    run_pipeline()
