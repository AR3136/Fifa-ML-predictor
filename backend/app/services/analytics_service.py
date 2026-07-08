import os
import pandas as pd
import numpy as np
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

FEATURES_PATH = resolve_path("datasets/processed/engineered_features.csv")
SHOOTOUTS_PATH = resolve_path("datasets/processed/shootouts.csv")


class AnalyticsService:
    def __init__(self):
        if os.path.exists(FEATURES_PATH):
            self.df = pd.read_csv(FEATURES_PATH)
            self.df['date'] = pd.to_datetime(self.df['date'])
        else:
            self.df = None

        if os.path.exists(SHOOTOUTS_PATH):
            self.so_df = pd.read_csv(SHOOTOUTS_PATH)
            self.so_df['date'] = pd.to_datetime(self.so_df['date'])
        else:
            self.so_df = None

    def get_all_teams(self) -> list:
        """Returns a sorted list of all unique teams present in the dataset."""
        if self.df is None:
            return []
        teams = set(self.df['home_team'].dropna().unique()).union(set(self.df['away_team'].dropna().unique()))
        return sorted(list(teams))

    def get_team_historical_stats(self, team_name: str) -> dict:
        """Computes comprehensive, dynamic historical metrics and trends for a team."""
        if self.df is None:
            return {}

        # Filter matches played by this team
        team_matches = self.df[(self.df['home_team'] == team_name) | (self.df['away_team'] == team_name)].sort_values('date')
        if team_matches.empty:
            return {
                "team": team_name,
                "historical_matches": 0,
                "win_rate": 0.0,
                "draw_rate": 0.0,
                "loss_rate": 0.0,
                "goals_scored": 0,
                "goals_conceded": 0,
                "goals_scored_avg": 0.0,
                "goals_conceded_avg": 0.0,
                "goal_difference": 0,
                "current_elo": 1500.0,
                "fifa_rank": 200,
                "fifa_points": 0.0,
                "recent_form": [],
                "shootout_record": {"played": 0, "wins": 0, "losses": 0, "win_rate": 0.5},
                "elo_history": [],
                "fifa_rank_history": [],
                "goal_distribution": [],
                "tournament_stats": []
            }

        total_matches = len(team_matches)
        wins = 0
        draws = 0
        losses = 0
        goals_scored = 0
        goals_conceded = 0
        recent_form = []

        elo_history = []
        fifa_rank_history = []
        goal_counts = {0: 0, 1: 0, 2: 0, 3: 0, "4+": 0}
        tournament_groups = {}

        # Sort matches chronologically to extract stats
        for _, row in team_matches.iterrows():
            h_score = int(row['home_score'])
            a_score = int(row['away_score'])
            is_home = row['home_team'] == team_name
            
            # Goals Scored / Conceded
            if is_home:
                goals_scored += h_score
                goals_conceded += a_score
                score = h_score
                # Outcome
                if h_score > a_score:
                    wins += 1
                    outcome = 'W'
                elif h_score == a_score:
                    draws += 1
                    outcome = 'D'
                else:
                    losses += 1
                    outcome = 'L'
            else:
                goals_scored += a_score
                goals_conceded += h_score
                score = a_score
                # Outcome
                if a_score > h_score:
                    wins += 1
                    outcome = 'W'
                elif a_score == h_score:
                    draws += 1
                    outcome = 'D'
                else:
                    losses += 1
                    outcome = 'L'
            
            recent_form.append(outcome)

            # ELO and Rank History (from 2010 onwards for lightweight payload)
            if row['date'].year >= 2010:
                date_str = row['date'].strftime('%Y-%m-%d')
                if is_home:
                    elo_history.append({"date": date_str, "elo": float(row['home_elo'])})
                    fifa_rank_history.append({"date": date_str, "rank": int(row['home_fifa_rank'])})
                else:
                    elo_history.append({"date": date_str, "elo": float(row['away_elo'])})
                    fifa_rank_history.append({"date": date_str, "rank": int(row['away_fifa_rank'])})

            # Goals Distribution
            if score >= 4:
                goal_counts["4+"] += 1
            else:
                goal_counts[score] += 1

            # Tournament grouped stats
            tourn = row['tournament']
            if tourn not in tournament_groups:
                tournament_groups[tourn] = {"matches": 0, "wins": 0}
            tournament_groups[tourn]["matches"] += 1
            if outcome == 'W':
                tournament_groups[tourn]["wins"] += 1

        # Format goals distribution histogram
        goal_dist_list = [{"goals": str(k), "count": v} for k, v in goal_counts.items()]

        # Format tournament stats list (min 3 matches to filter clutter)
        tourn_stats_list = []
        for t_name, stats in tournament_groups.items():
            if stats["matches"] >= 3:
                tourn_stats_list.append({
                    "tournament": t_name,
                    "matches": stats["matches"],
                    "win_rate": round(stats["wins"] / stats["matches"], 4)
                })
        tourn_stats_list = sorted(tourn_stats_list, key=lambda x: x["matches"], reverse=True)[:5]

        # Get latest ELO, FIFA rank and FIFA points from final match
        latest_match = team_matches.iloc[-1]
        if latest_match['home_team'] == team_name:
            current_elo = float(latest_match['home_elo'])
            fifa_rank = int(latest_match['home_fifa_rank'])
            fifa_points = float(latest_match['home_fifa_points'])
        else:
            current_elo = float(latest_match['away_elo'])
            fifa_rank = int(latest_match['away_fifa_rank'])
            fifa_points = float(latest_match['away_fifa_points'])

        # Calculate shootout record
        so_record = {"played": 0, "wins": 0, "losses": 0, "win_rate": 0.5}
        if self.so_df is not None:
            team_so = self.so_df[(self.so_df['home_team'] == team_name) | (self.so_df['away_team'] == team_name)]
            if not team_so.empty:
                so_played = len(team_so)
                so_wins = len(team_so[team_so['winner'] == team_name])
                so_losses = so_played - so_wins
                so_record = {
                    "played": so_played,
                    "wins": so_wins,
                    "losses": so_losses,
                    "win_rate": round(so_wins / so_played, 4)
                }

        return {
            "team": team_name,
            "historical_matches": total_matches,
            "win_rate": round(wins / total_matches, 4),
            "draw_rate": round(draws / total_matches, 4),
            "loss_rate": round(losses / total_matches, 4),
            "goals_scored": goals_scored,
            "goals_conceded": goals_conceded,
            "goals_scored_avg": round(goals_scored / total_matches, 2),
            "goals_conceded_avg": round(goals_conceded / total_matches, 2),
            "goal_difference": goals_scored - goals_conceded,
            "current_elo": round(current_elo, 1),
            "fifa_rank": fifa_rank,
            "fifa_points": round(fifa_points, 1),
            "recent_form": recent_form[-5:],  # Last 5 matches
            "shootout_record": so_record,
            "elo_history": elo_history,
            "fifa_rank_history": fifa_rank_history,
            "goal_distribution": goal_dist_list,
            "tournament_stats": tourn_stats_list
        }

    def get_h2h_stats(self, team1: str, team2: str) -> dict:
        """Calculates dynamic Head-to-Head history stats between two teams."""
        if self.df is None:
            return {}

        h2h_matches = self.df[
            ((self.df['home_team'] == team1) & (self.df['away_team'] == team2)) |
            ((self.df['home_team'] == team2) & (self.df['away_team'] == team1))
        ]

        if h2h_matches.empty:
            return {
                "team1": team1,
                "team2": team2,
                "total_matches": 0,
                "team1_wins": 0,
                "team2_wins": 0,
                "draws": 0,
                "goals_scored": {team1: 0, team2: 0}
            }

        total_matches = len(h2h_matches)
        t1_wins = 0
        t2_wins = 0
        draws = 0
        t1_goals = 0
        t2_goals = 0

        for _, row in h2h_matches.iterrows():
            h_team = row['home_team']
            h_score = int(row['home_score'])
            a_score = int(row['away_score'])

            if h_team == team1:
                t1_goals += h_score
                t2_goals += a_score
                if h_score > a_score:
                    t1_wins += 1
                elif h_score == a_score:
                    draws += 1
                else:
                    t2_wins += 1
            else:
                t2_goals += h_score
                t1_goals += a_score
                if h_score > a_score:
                    t2_wins += 1
                elif h_score == a_score:
                    draws += 1
                else:
                    t1_wins += 1

        return {
            "team1": team1,
            "team2": team2,
            "total_matches": total_matches,
            "team1_wins": t1_wins,
            "team2_wins": t2_wins,
            "draws": draws,
            "goals_scored": {
                team1: t1_goals,
                team2: t2_goals
            }
        }
