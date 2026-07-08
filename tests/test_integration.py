import pytest
import pandas as pd
from preprocessing.integration import merge_elo_ratings, merge_fifa_rankings

def test_merge_elo_ratings_no_leakage():
    # Mock Results
    results_df = pd.DataFrame({
        'date': pd.to_datetime(['2024-03-15', '2024-07-15']),
        'home_team': ['France', 'France'],
        'away_team': ['England', 'England'],
        'home_score': [1, 2],
        'away_score': [0, 1]
    })
    
    # Mock Elo
    elo_df = pd.DataFrame({
        'date': pd.to_datetime([
            '2024-01-01', 
            '2024-03-14', 
            '2024-03-15', # Exact day (should be ignored to prevent leakage)
            '2024-07-10'
        ]),
        'team': ['France', 'France', 'France', 'France'],
        'rating': [1600, 1620, 1650, 1680]
    })
    
    # Run merge
    merged = merge_elo_ratings(results_df, elo_df)
    
    # Assert Match 1 (2024-03-15) uses rating 1620 (from 2024-03-14)
    assert merged.iloc[0]['home_elo'] == 1620
    # Assert Match 2 (2024-07-15) uses rating 1680 (from 2024-07-10)
    assert merged.iloc[1]['home_elo'] == 1680

def test_merge_fifa_rankings_no_leakage():
    # Mock Results
    results_df = pd.DataFrame({
        'date': pd.to_datetime(['2024-03-15', '2024-07-15']),
        'home_team': ['France', 'France'],
        'away_team': ['England', 'England'],
        'home_score': [1, 2],
        'away_score': [0, 1]
    })
    
    # Mock FIFA
    # Semester 1 release date: 2024-06-30
    # Semester 2 release date: 2023-12-31
    fifa_df = pd.DataFrame({
        'date': [2023, 2024],
        'semester': [2, 1],
        'team': ['France', 'France'],
        'rank': [2, 1],
        'total.points': [1840.0, 1860.0]
    })
    
    # Run merge
    merged = merge_fifa_rankings(results_df, fifa_df)
    
    # Assert Match 1 (2024-03-15) matches Semester 2, 2023 (Rank 2)
    assert merged.iloc[0]['home_fifa_rank'] == 2
    # Assert Match 2 (2024-07-15) matches Semester 1, 2024 (Rank 1)
    assert merged.iloc[1]['home_fifa_rank'] == 1
