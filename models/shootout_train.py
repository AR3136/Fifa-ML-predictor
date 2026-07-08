import os
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from xgboost import XGBClassifier

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def compute_rolling_shootout_stats(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes rolling shootout win rate, total shootouts, and H2H shootout histories chronologically.
    Guarantees no leakage.
    """
    df = df.copy().sort_values('date').reset_index(drop=True)
    
    home_so_played, home_so_wins, home_so_losses, home_so_win_rate = [], [], [], []
    away_so_played, away_so_wins, away_so_losses, away_so_win_rate = [], [], [], []
    h2h_so_home_wins, h2h_so_away_wins = [], []
    
    team_history = {}  # team -> {'played': 0, 'wins': 0, 'losses': 0}
    h2h_history = {}   # tuple(sorted_teams) -> list of winners
    
    for i, row in df.iterrows():
        h_team = row['home_team']
        a_team = row['away_team']
        winner = row['winner']
        
        # --- Home team stats prior to shootout ---
        h_stats = team_history.get(h_team, {'played': 0, 'wins': 0, 'losses': 0})
        home_so_played.append(h_stats['played'])
        home_so_wins.append(h_stats['wins'])
        home_so_losses.append(h_stats['losses'])
        h_wr = h_stats['wins'] / h_stats['played'] if h_stats['played'] > 0 else 0.5
        home_so_win_rate.append(h_wr)
        
        # --- Away team stats prior to shootout ---
        a_stats = team_history.get(a_team, {'played': 0, 'wins': 0, 'losses': 0})
        away_so_played.append(a_stats['played'])
        away_so_wins.append(a_stats['wins'])
        away_so_losses.append(a_stats['losses'])
        a_wr = a_stats['wins'] / a_stats['played'] if a_stats['played'] > 0 else 0.5
        away_so_win_rate.append(a_wr)
        
        # --- H2H stats prior to shootout ---
        h2h_key = tuple(sorted([h_team, a_team]))
        past_winners = h2h_history.get(h2h_key, [])
        h2h_home_wins_count = sum(1 for w in past_winners if w == h_team)
        h2h_away_wins_count = sum(1 for w in past_winners if w == a_team)
        h2h_so_home_wins.append(h2h_home_wins_count)
        h2h_so_away_wins.append(h2h_away_wins_count)
        
        # --- Update running stats ---
        h_won = 1 if winner == h_team else 0
        a_won = 1 if winner == a_team else 0
        
        # Home update
        if h_team not in team_history:
            team_history[h_team] = {'played': 0, 'wins': 0, 'losses': 0}
        team_history[h_team]['played'] += 1
        team_history[h_team]['wins'] += h_won
        team_history[h_team]['losses'] += (1 - h_won)
        
        # Away update
        if a_team not in team_history:
            team_history[a_team] = {'played': 0, 'wins': 0, 'losses': 0}
        team_history[a_team]['played'] += 1
        team_history[a_team]['wins'] += a_won
        team_history[a_team]['losses'] += (1 - a_won)
        
        # H2H update
        if h2h_key not in h2h_history:
            h2h_history[h2h_key] = []
        h2h_history[h2h_key].append(winner)
        
    df['home_so_played'] = home_so_played
    df['home_so_wins'] = home_so_wins
    df['home_so_losses'] = home_so_losses
    df['home_so_win_rate'] = home_so_win_rate
    
    df['away_so_played'] = away_so_played
    df['away_so_wins'] = away_so_wins
    df['away_so_losses'] = away_so_losses
    df['away_so_win_rate'] = away_so_win_rate
    
    df['h2h_so_home_wins'] = h2h_so_home_wins
    df['h2h_so_away_wins'] = h2h_so_away_wins
    
    return df

def run_shootout_training():
    processed_dir = 'C:/Users/Admin/Desktop/Fifa prediction/datasets/processed'
    shootouts_path = os.path.join(processed_dir, 'shootouts.csv')
    master_path = os.path.join(processed_dir, 'master_dataset.csv')
    
    if not os.path.exists(shootouts_path) or not os.path.exists(master_path):
        logger.error("Missing shootouts or master dataset. Run preprocessing/integration first.")
        return
        
    so_df = pd.read_csv(shootouts_path)
    master_df = pd.read_csv(master_path)
    
    so_df['date'] = pd.to_datetime(so_df['date'])
    master_df['date'] = pd.to_datetime(master_df['date'])
    
    # 1. Merge ELO and FIFA rankings from master_df
    # We select key rating columns from master dataset
    ratings_sub = master_df[[
        'date', 'home_team', 'away_team', 
        'home_elo', 'away_elo', 
        'home_fifa_rank', 'away_fifa_rank', 
        'home_fifa_points', 'away_fifa_points'
    ]]
    
    merged = pd.merge(
        so_df, 
        ratings_sub, 
        on=['date', 'home_team', 'away_team'], 
        how='left'
    )
    
    # Fill any missing Elo/Rank with standard baseline defaults
    merged['home_elo'] = merged['home_elo'].fillna(1500.0)
    merged['away_elo'] = merged['away_elo'].fillna(1500.0)
    merged['home_fifa_rank'] = merged['home_fifa_rank'].fillna(200).astype('int')
    merged['away_fifa_rank'] = merged['away_fifa_rank'].fillna(200).astype('int')
    merged['home_fifa_points'] = merged['home_fifa_points'].fillna(0.0)
    merged['away_fifa_points'] = merged['away_fifa_points'].fillna(0.0)
    
    # Compute rating differences
    merged['elo_difference'] = merged['home_elo'] - merged['away_elo']
    merged['rank_difference'] = merged['home_fifa_rank'] - merged['away_fifa_rank']
    merged['fifa_points_difference'] = merged['home_fifa_points'] - merged['away_fifa_points']
    
    # 2. Chronological Rolling Shootout Features
    merged = compute_rolling_shootout_stats(merged)
    
    # Define Target: 1 if home wins, 0 if away wins
    merged['target'] = (merged['winner'] == merged['home_team']).astype(int)
    
    # Define Feature columns
    features = [
        'home_elo', 'away_elo', 'elo_difference',
        'home_fifa_rank', 'away_fifa_rank', 'rank_difference', 'fifa_points_difference',
        'home_so_played', 'home_so_wins', 'home_so_losses', 'home_so_win_rate',
        'away_so_played', 'away_so_wins', 'away_so_losses', 'away_so_win_rate',
        'h2h_so_home_wins', 'h2h_so_away_wins'
    ]
    
    X = merged[features]
    y = merged['target']
    
    # Chronological Split (Train on pre-2022, test on 2022-2026 shootouts)
    train_mask = merged['date'] < '2022-01-01'
    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[~train_mask], y[~train_mask]
    
    logger.info(f"Shootout training set size: {len(X_train)}, test set size: {len(X_test)}")
    
    # 3. Model Tuning & Comparison
    models = {
        'Logistic Regression': {
            'model': LogisticRegression(random_state=42),
            'params': {'C': [0.01, 0.1, 1.0, 10.0]}
        },
        'Random Forest': {
            'model': RandomForestClassifier(random_state=42),
            'params': {
                'n_estimators': [20, 50, 100],
                'max_depth': [3, 5, None]
            }
        },
        'XGBoost': {
            'model': XGBClassifier(random_state=42, eval_metric='logloss'),
            'params': {
                'n_estimators': [20, 50, 100],
                'max_depth': [2, 3, 5],
                'learning_rate': [0.05, 0.1, 0.2]
            }
        }
    }
    
    best_f1 = 0
    winner_name = ""
    winner_model = None
    
    for name, config in models.items():
        logger.info(f"Tuning {name} for shootout prediction...")
        gs = GridSearchCV(
            config['model'], 
            config['params'], 
            cv=3, 
            scoring='accuracy', 
            n_jobs=-1
        )
        gs.fit(X_train, y_train)
        best_clf = gs.best_estimator_
        
        # Evaluate
        y_pred = best_clf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average='macro')
        
        logger.info(f"{name} -> Accuracy: {acc:.4f}, F1: {f1:.4f}")
        
        if f1 > best_f1:
            best_f1 = f1
            winner_name = name
            winner_model = best_clf
            
    logger.info(f"Best Shootout Model: {winner_name} (F1: {best_f1:.4f})")
    
    # 4. Save
    save_payload = {
        'model': winner_model,
        'features': features,
        'model_name': winner_name
    }
    
    save_path = 'C:/Users/Admin/Desktop/Fifa prediction/models/shootout_model.joblib'
    joblib.dump(save_payload, save_path)
    logger.info(f"Saved shootout model to {save_path}")

if __name__ == '__main__':
    run_shootout_training()
