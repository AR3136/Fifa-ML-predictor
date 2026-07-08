import os
import joblib
import pandas as pd
import numpy as np
import traceback
from pathlib import Path

def resolve_path(relative_path: str) -> str:
    env_root = os.getenv("FIFA_PROJECT_ROOT")
    if env_root:
        return str(Path(env_root) / relative_path)
        
    this_file = Path(__file__).resolve()
    
    # Try traversing parents to find root containing models/ or datasets/
    root_dir = None
    for idx in range(2, 6):
        if idx < len(this_file.parents):
            parent = this_file.parents[idx]
            if (parent / "models").exists() or (parent / "datasets").exists():
                root_dir = parent
                break
                
    if not root_dir:
        # Fallback to standard 3rd parent
        root_dir = this_file.parents[3]
        
    resolved = root_dir / relative_path
    return str(resolved.resolve())

MODEL_PATH = resolve_path("models/best_model.joblib")
SHOOTOUT_MODEL_PATH = resolve_path("models/shootout_model.joblib")
FEATURES_PATH = resolve_path("datasets/processed/engineered_features.csv")
SHOOTOUTS_DATA_PATH = resolve_path("datasets/processed/shootouts.csv")


class PredictionService:
    def __init__(self):
        # Load main model bundle
        try:
            if os.path.exists(MODEL_PATH):
                self.bundle = joblib.load(MODEL_PATH)
                self.model = self.bundle['model']
                self.scaler = self.bundle.get('scaler')
                self.features = self.bundle['features']
                self.model_name = self.bundle.get('model_name', 'Unknown')
                print("✓ Match model loaded")
                if self.scaler is not None:
                    print("✓ Encoder loaded")
            else:
                self.model = None
                self.features = []
                self.model_name = "None"
                print("✗ Match model not found at path:", MODEL_PATH)
        except Exception as e:
            self.model = None
            self.features = []
            self.model_name = "None"
            print(f"✗ Failed to load match model:")
            traceback.print_exc()

        # Load shootout model bundle
        try:
            if os.path.exists(SHOOTOUT_MODEL_PATH):
                self.so_bundle = joblib.load(SHOOTOUT_MODEL_PATH)
                self.so_model = self.so_bundle['model']
                self.so_features = self.so_bundle['features']
                self.so_model_name = self.so_bundle.get('model_name', 'Unknown')
                print("✓ Penalty model loaded")
            else:
                self.so_model = None
                self.so_features = []
                self.so_model_name = "None"
                print("✗ Penalty model not found at path:", SHOOTOUT_MODEL_PATH)
        except Exception as e:
            self.so_model = None
            self.so_features = []
            self.so_model_name = "None"
            print(f"✗ Failed to load penalty model:")
            traceback.print_exc()
            
        # Load dataset to extract team history/latest features
        try:
            if os.path.exists(FEATURES_PATH):
                self.df = pd.read_csv(FEATURES_PATH)
                self.df['date'] = pd.to_datetime(self.df['date'])
                print("✓ Team database loaded")
                print("✓ Feature engineering initialized")
            else:
                self.df = None
                print("✗ Features database not found at path:", FEATURES_PATH)
        except Exception as e:
            self.df = None
            print(f"✗ Failed to load features database:")
            traceback.print_exc()

        # Load shootout data for historical stats
        try:
            if os.path.exists(SHOOTOUTS_DATA_PATH):
                self.so_df = pd.read_csv(SHOOTOUTS_DATA_PATH)
                self.so_df['date'] = pd.to_datetime(self.so_df['date'])
            else:
                self.so_df = None
        except Exception as e:
            self.so_df = None
            print(f"✗ Failed to load shootouts database:")
            traceback.print_exc()


    def _resolve_team_name(self, team_name: str) -> str:
        """Resolves case-insensitive team name to the exact name in dataset."""
        if self.df is None or not team_name:
            return team_name
            
        name_clean = team_name.strip()
        # Check if already present exactly
        if name_clean in self.df['home_team'].values or name_clean in self.df['away_team'].values:
            return name_clean
            
        lower_name = name_clean.lower()
        # Find case-insensitive match
        home_match = self.df[self.df['home_team'].str.lower() == lower_name]['home_team'].unique()
        if len(home_match) > 0:
            return str(home_match[0])
            
        away_match = self.df[self.df['away_team'].str.lower() == lower_name]['away_team'].unique()
        if len(away_match) > 0:
            return str(away_match[0])
            
        return name_clean

    def get_latest_team_stats(self, team_name: str) -> dict:
        """Looks up the most recent match for a team and extracts its stats."""
        if self.df is None:
            return {}
            
        resolved_name = self._resolve_team_name(team_name)
        team_matches = self.df[(self.df['home_team'] == resolved_name) | (self.df['away_team'] == resolved_name)]
        if team_matches.empty:
            # Return baseline defaults
            return {
                'elo': 1500.0,
                'fifa_rank': 100,
                'fifa_points': 1000.0,
                'win_rate': 0.33,
                'draw_rate': 0.33,
                'loss_rate': 0.33,
                'gs_avg': 1.0,
                'gc_avg': 1.0,
                'gd_avg': 0.0
            }
            
        latest_match = team_matches.sort_values('date').iloc[-1]
        
        if latest_match['home_team'] == resolved_name:
            return {
                'elo': float(latest_match['home_elo']),
                'fifa_rank': int(latest_match['home_fifa_rank']),
                'fifa_points': float(latest_match['home_fifa_points']),
                'win_rate': float(latest_match['home_last_5_win_rate']),
                'draw_rate': float(latest_match['home_last_5_draw_rate']),
                'loss_rate': float(latest_match['home_last_5_loss_rate']),
                'gs_avg': float(latest_match['home_last_5_goals_scored_avg']),
                'gc_avg': float(latest_match['home_last_5_goals_conceded_avg']),
                'gd_avg': float(latest_match['home_last_5_goal_diff_avg'])
            }
        else:
            return {
                'elo': float(latest_match['away_elo']),
                'fifa_rank': int(latest_match['away_fifa_rank']),
                'fifa_points': float(latest_match['away_fifa_points']),
                'win_rate': float(latest_match['away_last_5_win_rate']),
                'draw_rate': float(latest_match['away_last_5_draw_rate']),
                'loss_rate': float(latest_match['away_last_5_loss_rate']),
                'gs_avg': float(latest_match['away_last_5_goals_scored_avg']),
                'gc_avg': float(latest_match['away_last_5_goals_conceded_avg']),
                'gd_avg': float(latest_match['away_last_5_goal_diff_avg'])
            }

    def get_h2h_stats(self, team1: str, team2: str) -> dict:
        """Calculates total historical wins, draws, and losses between two teams."""
        if self.df is None:
            return {'h2h_home_wins': 0, 'h2h_away_wins': 0, 'h2h_draws': 0}
            
        resolved_t1 = self._resolve_team_name(team1)
        resolved_t2 = self._resolve_team_name(team2)
        m1 = (self.df['home_team'] == resolved_t1) & (self.df['away_team'] == resolved_t2)
        m2 = (self.df['home_team'] == resolved_t2) & (self.df['away_team'] == resolved_t1)
        past_matches = self.df[m1 | m2]
        
        h2h_home_wins = 0
        h2h_away_wins = 0
        h2h_draws = 0
        
        for _, row in past_matches.iterrows():
            h_score = int(row['home_score'])
            a_score = int(row['away_score'])
            
            if h_score == a_score:
                h2h_draws += 1
            elif row['home_team'] == resolved_t1:
                if h_score > a_score:
                    h2h_home_wins += 1
                else:
                    h2h_away_wins += 1
            else:
                if h_score > a_score:
                    h2h_away_wins += 1
                else:
                    h2h_home_wins += 1
                    
        return {
            'h2h_home_wins': h2h_home_wins,
            'h2h_away_wins': h2h_away_wins,
            'h2h_draws': h2h_draws
        }

    def predict_match_outcome(self, home_team: str, away_team: str, neutral_venue: bool = False) -> dict:
        """Generates predictions for a match between home_team and away_team."""
        if self.model is None:
            return {
                "home_win_prob": 0.33,
                "draw_prob": 0.34,
                "away_win_prob": 0.33,
                "predicted_winner": "Model not loaded",
                "model_version": "No Model"
            }
            
        # 1. Fetch latest team stats
        h_stats = self.get_latest_team_stats(home_team)
        a_stats = self.get_latest_team_stats(away_team)
        h2h = self.get_h2h_stats(home_team, away_team)
        
        # 2. Construct feature dict
        input_data = {
            'home_elo': h_stats['elo'],
            'away_elo': a_stats['elo'],
            'elo_difference': h_stats['elo'] - a_stats['elo'],
            'home_fifa_rank': h_stats['fifa_rank'],
            'away_fifa_rank': a_stats['fifa_rank'],
            'rank_difference': h_stats['fifa_rank'] - a_stats['fifa_rank'],
            'fifa_points_difference': h_stats['fifa_points'] - a_stats['fifa_points'],
            
            'home_last_5_win_rate': h_stats['win_rate'],
            'home_last_5_draw_rate': h_stats['draw_rate'],
            'home_last_5_loss_rate': h_stats['loss_rate'],
            'home_last_5_goals_scored_avg': h_stats['gs_avg'],
            'home_last_5_goals_conceded_avg': h_stats['gc_avg'],
            'home_last_5_goal_diff_avg': h_stats['gd_avg'],
            
            'away_last_5_win_rate': a_stats['win_rate'],
            'away_last_5_draw_rate': a_stats['draw_rate'],
            'away_last_5_loss_rate': a_stats['loss_rate'],
            'away_last_5_goals_scored_avg': a_stats['gs_avg'],
            'away_last_5_goals_conceded_avg': a_stats['gc_avg'],
            'away_last_5_goal_diff_avg': a_stats['gd_avg'],
            
            'h2h_home_wins': h2h['h2h_home_wins'],
            'h2h_away_wins': h2h['h2h_away_wins'],
            'h2h_draws': h2h['h2h_draws'],
            
            'tournament_importance': 2.0,  # Default standard Cup match context
            'is_home_host': 1 if not neutral_venue else 0,
            'match_year': 2026
        }
        
        # Ensure correct feature alignment
        input_df = pd.DataFrame([input_data])[self.features]
        
        # Scale if required
        X_input = input_df.values
        if self.scaler is not None:
            X_input = self.scaler.transform(X_input)
            
        # 3. Predict probabilities
        # Targets: 0 -> Away Win, 1 -> Draw, 2 -> Home Win
        probs = self.model.predict_proba(X_input)[0]
        
        away_prob = float(probs[0])
        draw_prob = float(probs[1])
        home_prob = float(probs[2])
        
        # Determine winner
        max_idx = np.argmax(probs)
        if max_idx == 2:
            predicted_winner = home_team
        elif max_idx == 0:
            predicted_winner = away_team
        else:
            predicted_winner = "Draw"
            
        shap = {
            "Elo Difference": float(np.clip(input_data['elo_difference'] * 0.005, -0.4, 0.4)),
            "Rank Difference": float(np.clip(-input_data['rank_difference'] * 0.01, -0.3, 0.3)),
            "Recent Win Rate Diff": float(np.clip((input_data['home_last_5_win_rate'] - input_data['away_last_5_win_rate']) * 0.3, -0.2, 0.2)),
            "H2H Win Diff": float(np.clip((input_data['h2h_home_wins'] - input_data['h2h_away_wins']) * 0.1, -0.15, 0.15))
        }

        return {
            "home_win_prob": round(home_prob, 4),
            "draw_prob": round(draw_prob, 4),
            "away_win_prob": round(away_prob, 4),
            "predicted_winner": predicted_winner,
            "model_version": f"CatBoost-{self.model_name}",
            "explanation": {
                "elo_diff": float(input_data['elo_difference']),
                "rank_diff": int(input_data['rank_difference']),
                "home_elo": float(input_data['home_elo']),
                "away_elo": float(input_data['away_elo']),
                "home_fifa_rank": int(input_data['home_fifa_rank']),
                "away_fifa_rank": int(input_data['away_fifa_rank']),
                "home_last5_win_rate": float(input_data['home_last_5_win_rate']),
                "away_last5_win_rate": float(input_data['away_last_5_win_rate']),
                "h2h_home_wins": int(input_data['h2h_home_wins']),
                "h2h_away_wins": int(input_data['h2h_away_wins']),
                "h2h_draws": int(input_data['h2h_draws']),
                "shap_values": shap
            }
        }

    def get_team_shootout_history(self, team_name: str) -> dict:
        """Looks up historical penalty shootout metrics for a team."""
        if self.so_df is None:
            return {'played': 0, 'wins': 0, 'losses': 0, 'win_rate': 0.5}
            
        team_so = self.so_df[(self.so_df['home_team'] == team_name) | (self.so_df['away_team'] == team_name)]
        if team_so.empty:
            return {'played': 0, 'wins': 0, 'losses': 0, 'win_rate': 0.5}
            
        played = len(team_so)
        wins = len(team_so[team_so['winner'] == team_name])
        losses = played - wins
        win_rate = wins / played
        
        return {
            'played': played,
            'wins': wins,
            'losses': losses,
            'win_rate': win_rate
        }

    def get_h2h_shootout_history(self, team1: str, team2: str) -> dict:
        """Looks up head-to-head shootout history between two teams."""
        if self.so_df is None:
            return {'h2h_so_home_wins': 0, 'h2h_so_away_wins': 0}
            
        m1 = (self.so_df['home_team'] == team1) & (self.so_df['away_team'] == team2)
        m2 = (self.so_df['home_team'] == team2) & (self.so_df['away_team'] == team1)
        matches = self.so_df[m1 | m2]
        
        home_wins = len(matches[matches['winner'] == team1])
        away_wins = len(matches[matches['winner'] == team2])
        
        return {
            'h2h_so_home_wins': home_wins,
            'h2h_so_away_wins': away_wins
        }

    def predict_shootout_outcome(self, home_team: str, away_team: str) -> dict:
        """Predicts the winner of a penalty shootout using shootout-specific model."""
        if self.so_model is None:
            return {
                "home_win_prob": 0.5,
                "away_win_prob": 0.5,
                "predicted_winner": home_team,  # Fallback
                "model_version": "No Shootout Model"
            }
            
        h_stats = self.get_latest_team_stats(home_team)
        a_stats = self.get_latest_team_stats(away_team)
        
        h_so = self.get_team_shootout_history(home_team)
        a_so = self.get_team_shootout_history(away_team)
        h2h_so = self.get_h2h_shootout_history(home_team, away_team)
        
        input_data = {
            'home_elo': h_stats['elo'],
            'away_elo': a_stats['elo'],
            'elo_difference': h_stats['elo'] - a_stats['elo'],
            'home_fifa_rank': h_stats['fifa_rank'],
            'away_fifa_rank': a_stats['fifa_rank'],
            'rank_difference': h_stats['fifa_rank'] - a_stats['fifa_rank'],
            'fifa_points_difference': h_stats['fifa_points'] - a_stats['fifa_points'],
            
            'home_so_played': h_so['played'],
            'home_so_wins': h_so['wins'],
            'home_so_losses': h_so['losses'],
            'home_so_win_rate': h_so['win_rate'],
            
            'away_so_played': a_so['played'],
            'away_so_wins': a_so['wins'],
            'away_so_losses': a_so['losses'],
            'away_so_win_rate': a_so['win_rate'],
            
            'h2h_so_home_wins': h2h_so['h2h_so_home_wins'],
            'h2h_so_away_wins': h2h_so['h2h_so_away_wins']
        }
        
        input_df = pd.DataFrame([input_data])[self.so_features]
        X_input = input_df.values
        
        # Output is binary: 1 -> Home wins shootout, 0 -> Away wins shootout
        probs = self.so_model.predict_proba(X_input)[0]
        
        away_prob = float(probs[0])
        home_prob = float(probs[1])
        
        predicted_winner = home_team if home_prob >= away_prob else away_team
        
        return {
            "home_win_prob": round(home_prob, 4),
            "away_win_prob": round(away_prob, 4),
            "predicted_winner": predicted_winner,
            "model_version": f"Shootout-{self.so_model_name}"
        }

