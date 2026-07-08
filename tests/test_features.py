import pytest
import pandas as pd
from feature_engineering.build_features import get_tournament_importance, compute_rolling_and_h2h_features

def test_get_tournament_importance():
    assert get_tournament_importance("Friendly") == 1.0
    assert get_tournament_importance("FIFA World Cup") == 4.0
    assert get_tournament_importance("FIFA World Cup qualification") == 2.5
    assert get_tournament_importance("UEFA Euro") == 3.0
    assert get_tournament_importance("Copa América") == 3.0
    assert get_tournament_importance("Random Tournament") == 2.0

def test_compute_rolling_and_h2h_features():
    # Construct a chronological sequence of matches for France
    matches = pd.DataFrame({
        'date': pd.to_datetime([
            '2024-01-01',  # 1. France vs England (2-0)
            '2024-02-01',  # 2. France vs Brazil (3-0)
            '2024-03-01',  # 3. France vs England (1-1)
            '2024-04-01',  # 4. France vs Germany (0-1)
            '2024-05-01',  # 5. France vs Italy (1-1)
            '2024-06-01',  # 6. France vs Spain (2-1)
        ]),
        'home_team': ['France', 'France', 'France', 'France', 'France', 'France'],
        'away_team': ['England', 'Brazil', 'England', 'Germany', 'Italy', 'Spain'],
        'home_score': [2, 3, 1, 0, 1, 2],
        'away_score': [0, 0, 1, 1, 1, 1]
    })
    
    df_feat = compute_rolling_and_h2h_features(matches)
    
    # Match 1: No previous history
    assert df_feat.iloc[0]['home_last_5_win_rate'] == 0.0
    assert df_feat.iloc[0]['h2h_home_wins'] == 0
    
    # Match 2: France form is W (2-0)
    assert df_feat.iloc[1]['home_last_5_win_rate'] == 1.0
    assert df_feat.iloc[1]['home_last_5_goals_scored_avg'] == 2.0
    assert df_feat.iloc[1]['home_last_5_goals_conceded_avg'] == 0.0
    
    # Match 3: H2H vs England should reflect Match 1 result (1 France Win)
    assert df_feat.iloc[2]['h2h_home_wins'] == 1
    assert df_feat.iloc[2]['h2h_draws'] == 0
    
    # Match 6: France form is based on matches 1 to 5
    # Matches 1 to 5 goals scored by France: 2, 3, 1, 0, 1 = 7. Avg = 1.4
    # Conceded: 0, 0, 1, 1, 1 = 3. Avg = 0.6
    # Outcomes: W, W, D, L, D. Win rate = 0.4, Draw rate = 0.4, Loss rate = 0.2
    assert df_feat.iloc[5]['home_last_5_win_rate'] == 0.4
    assert df_feat.iloc[5]['home_last_5_draw_rate'] == 0.4
    assert df_feat.iloc[5]['home_last_5_loss_rate'] == 0.2
    assert pytest.approx(df_feat.iloc[5]['home_last_5_goals_scored_avg']) == 1.4
    assert pytest.approx(df_feat.iloc[5]['home_last_5_goals_conceded_avg']) == 0.6
    assert pytest.approx(df_feat.iloc[5]['home_last_5_goal_diff_avg']) == 0.8
