import pytest
import pandas as pd
from models.shootout_train import compute_rolling_shootout_stats

def test_compute_rolling_shootout_stats():
    shootouts = pd.DataFrame({
        'date': pd.to_datetime([
            '2024-01-01',  # 1. France vs England, Winner: France
            '2024-02-01',  # 2. France vs Germany, Winner: Germany
            '2024-03-01',  # 3. France vs England, Winner: England
        ]),
        'home_team': ['France', 'France', 'France'],
        'away_team': ['England', 'Germany', 'England'],
        'winner': ['France', 'Germany', 'England']
    })
    
    df_feat = compute_rolling_shootout_stats(shootouts)
    
    # Match 1: No history
    assert df_feat.iloc[0]['home_so_played'] == 0
    assert df_feat.iloc[0]['home_so_win_rate'] == 0.5
    assert df_feat.iloc[0]['h2h_so_home_wins'] == 0
    
    # Match 2: France played 1, won 1
    assert df_feat.iloc[1]['home_so_played'] == 1
    assert df_feat.iloc[1]['home_so_win_rate'] == 1.0
    
    # Match 3: France played 2, won 1, lost 1. England played 1, lost 1.
    assert df_feat.iloc[2]['home_so_played'] == 2
    assert df_feat.iloc[2]['home_so_win_rate'] == 0.5
    assert df_feat.iloc[2]['away_so_played'] == 1
    assert df_feat.iloc[2]['away_so_win_rate'] == 0.0
    # H2H France vs England (French home wins = 1, England wins = 0)
    assert df_feat.iloc[2]['h2h_so_home_wins'] == 1
    assert df_feat.iloc[2]['h2h_so_away_wins'] == 0
