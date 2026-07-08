import os
import logging
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_tournament_importance(tournament: str) -> float:
    """Assigns importance weight to different types of tournaments."""
    t_lower = str(tournament).lower()
    if 'friendly' in t_lower:
        return 1.0
    elif 'fifa world cup' in t_lower and 'qualification' not in t_lower:
        return 4.0
    elif 'qualification' in t_lower or 'qualifying' in t_lower:
        return 2.5
    elif any(cup in t_lower for cup in ['copa américa', 'uefa euro', 'african cup of nations', 'asian cup', 'gold cup', 'nations league']):
        return 3.0
    else:
        return 2.0

def compute_rolling_and_h2h_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes rolling form (last 5 matches) and historical head-to-head (H2H) features chronologically.
    Guarantees no data leakage by computing features using only past matches.
    """
    df = df.copy().sort_values('date').reset_index(drop=True)
    
    # Pre-allocate feature lists
    home_win_rate, home_draw_rate, home_loss_rate = [], [], []
    home_gs_avg, home_gc_avg, home_gd_avg = [], [], []
    
    away_win_rate, away_draw_rate, away_loss_rate = [], [], []
    away_gs_avg, away_gc_avg, away_gd_avg = [], [], []
    
    h2h_home_wins_list, h2h_away_wins_list, h2h_draws_list = [], [], []
    
    # State tracking dictionaries
    # team -> list of tuples (goals_scored, goals_conceded, outcome: 'W'/'D'/'L')
    team_history = {}
    # tuple(sorted_teams) -> list of tuples (winner_team_name_or_'Draw')
    h2h_history = {}
    
    for i, row in df.iterrows():
        h_team = row['home_team']
        a_team = row['away_team']
        h_score = int(row['home_score'])
        a_score = int(row['away_score'])
        
        # --- Compute Home Team Form (prior to match) ---
        h_hist = team_history.get(h_team, [])
        if h_hist:
            last_5 = h_hist[-5:]
            n = len(last_5)
            wins = sum(1 for m in last_5 if m[2] == 'W')
            draws = sum(1 for m in last_5 if m[2] == 'D')
            losses = sum(1 for m in last_5 if m[2] == 'L')
            gs = sum(m[0] for m in last_5)
            gc = sum(m[1] for m in last_5)
            
            home_win_rate.append(wins / n)
            home_draw_rate.append(draws / n)
            home_loss_rate.append(losses / n)
            home_gs_avg.append(gs / n)
            home_gc_avg.append(gc / n)
            home_gd_avg.append((gs - gc) / n)
        else:
            home_win_rate.append(0.0)
            home_draw_rate.append(0.0)
            home_loss_rate.append(0.0)
            home_gs_avg.append(0.0)
            home_gc_avg.append(0.0)
            home_gd_avg.append(0.0)
            
        # --- Compute Away Team Form (prior to match) ---
        a_hist = team_history.get(a_team, [])
        if a_hist:
            last_5 = a_hist[-5:]
            n = len(last_5)
            wins = sum(1 for m in last_5 if m[2] == 'W')
            draws = sum(1 for m in last_5 if m[2] == 'D')
            losses = sum(1 for m in last_5 if m[2] == 'L')
            gs = sum(m[0] for m in last_5)
            gc = sum(m[1] for m in last_5)
            
            away_win_rate.append(wins / n)
            away_draw_rate.append(draws / n)
            away_loss_rate.append(losses / n)
            away_gs_avg.append(gs / n)
            away_gc_avg.append(gc / n)
            away_gd_avg.append((gs - gc) / n)
        else:
            away_win_rate.append(0.0)
            away_draw_rate.append(0.0)
            away_loss_rate.append(0.0)
            away_gs_avg.append(0.0)
            away_gc_avg.append(0.0)
            away_gd_avg.append(0.0)
            
        # --- Compute H2H Features (prior to match) ---
        h2h_key = tuple(sorted([h_team, a_team]))
        h_hists = h2h_history.get(h2h_key, [])
        if h_hists:
            h_wins = sum(1 for w in h_hists if w == h_team)
            a_wins = sum(1 for w in h_hists if w == a_team)
            h_draws = sum(1 for w in h_hists if w == 'Draw')
            
            h2h_home_wins_list.append(h_wins)
            h2h_away_wins_list.append(a_wins)
            h2h_draws_list.append(h_draws)
        else:
            h2h_home_wins_list.append(0)
            h2h_away_wins_list.append(0)
            h2h_draws_list.append(0)
            
        # --- Update State Trackers with Current Match Outcome ---
        h_outcome = 'W' if h_score > a_score else 'L' if h_score < a_score else 'D'
        a_outcome = 'W' if a_score > h_score else 'L' if a_score < h_score else 'D'
        
        if h_team not in team_history:
            team_history[h_team] = []
        team_history[h_team].append((h_score, a_score, h_outcome))
        
        if a_team not in team_history:
            team_history[a_team] = []
        team_history[a_team].append((a_score, h_score, a_outcome))
        
        # Update H2H history
        winner = h_team if h_score > a_score else a_team if a_score > h_score else 'Draw'
        if h2h_key not in h2h_history:
            h2h_history[h2h_key] = []
        h2h_history[h2h_key].append(winner)

    # Add to DataFrame
    df['home_last_5_win_rate'] = home_win_rate
    df['home_last_5_draw_rate'] = home_draw_rate
    df['home_last_5_loss_rate'] = home_loss_rate
    df['home_last_5_goals_scored_avg'] = home_gs_avg
    df['home_last_5_goals_conceded_avg'] = home_gc_avg
    df['home_last_5_goal_diff_avg'] = home_gd_avg
    
    df['away_last_5_win_rate'] = away_win_rate
    df['away_last_5_draw_rate'] = away_draw_rate
    df['away_last_5_loss_rate'] = away_loss_rate
    df['away_last_5_goals_scored_avg'] = away_gs_avg
    df['away_last_5_goals_conceded_avg'] = away_gc_avg
    df['away_last_5_goal_diff_avg'] = away_gd_avg
    
    df['h2h_home_wins'] = h2h_home_wins_list
    df['h2h_away_wins'] = h2h_away_wins_list
    df['h2h_draws'] = h2h_draws_list
    
    return df

def generate_features(master_path: str, output_path: str):
    """Main feature engineering entry point."""
    logger.info(f"Loading master dataset from {master_path}...")
    df = pd.read_csv(master_path)
    df['date'] = pd.to_datetime(df['date'])
    
    # 1. Team Strength Differences
    logger.info("Computing Elo and FIFA rank difference features...")
    df['elo_difference'] = df['home_elo'] - df['away_elo']
    df['rank_difference'] = df['home_fifa_rank'] - df['away_fifa_rank']
    df['fifa_points_difference'] = df['home_fifa_points'] - df['away_fifa_points']
    
    # 2. Context Features
    logger.info("Computing context features...")
    df['tournament_importance'] = df['tournament'].apply(get_tournament_importance)
    df['is_home_host'] = (df['home_team'] == df['country']).astype(int)
    df['match_year'] = df['date'].dt.year
    
    # 3. Rolling Form and H2H Features
    logger.info("Computing chronological rolling form and H2H features...")
    df = compute_rolling_and_h2h_features(df)
    
    # Save
    df.to_csv(output_path, index=False)
    logger.info(f"Saved engineered features dataset: {output_path} (Shape: {df.shape})")

if __name__ == '__main__':
    generate_features(
        master_path='C:/Users/Admin/Desktop/Fifa prediction/datasets/processed/master_dataset.csv',
        output_path='C:/Users/Admin/Desktop/Fifa prediction/datasets/processed/engineered_features.csv'
    )
