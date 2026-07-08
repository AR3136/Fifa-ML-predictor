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

def load_dataset(file_path: str, parse_dates: list = None) -> pd.DataFrame:
    """Loads a preprocessed CSV dataset."""
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"Missing dataset: {file_path}")
    df = pd.read_csv(file_path)
    if parse_dates:
        for col in parse_dates:
            df[col] = pd.to_datetime(df[col])
    return df

def align_fifa_ranking_dates(fifa_df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs an explicit datetime release date for FIFA rankings based on year and semester.
    If 'ranking_date' or an explicit date string is already present in the dataset (monthly format),
    it parses it directly for maximum granularity and historical accuracy.
    """
    fifa_df = fifa_df.copy()
    
    # 1. If we have a full date string column (for example, standard 'rank_date' or 'date' containing YYYY-MM-DD)
    if 'date' in fifa_df.columns:
        sample = fifa_df['date'].dropna().iloc[0] if not fifa_df['date'].dropna().empty else None
        if isinstance(sample, str) and '-' in sample:
            fifa_df['ranking_date'] = pd.to_datetime(fifa_df['date'])
            return fifa_df
            
    # 2. Check if a dedicated 'ranking_date' is already present
    if 'ranking_date' in fifa_df.columns:
        fifa_df['ranking_date'] = pd.to_datetime(fifa_df['ranking_date'])
        return fifa_df

    # 3. Fallback to bi-annual semester mapping
    def get_date_str(row):
        year = str(row['ranking_year'])
        if '-' in year:
            return year
        sem = int(row['semester']) if 'semester' in row else 1
        if sem == 1:
            return f"{year}-06-30"
        else:
            return f"{year}-12-31"
            
    fifa_df['ranking_date'] = pd.to_datetime(fifa_df.apply(get_date_str, axis=1))
    return fifa_df


def merge_elo_ratings(results_df: pd.DataFrame, elo_df: pd.DataFrame, default_elo: float = 1500.0) -> pd.DataFrame:
    """
    Merges ELO ratings for home and away teams.
    Guarantees no leakage by matching with the latest ELO record strictly before the match date.
    """
    results_df = results_df.dropna(subset=['date']).copy().sort_values('date')
    elo_df = elo_df.dropna(subset=['date']).copy().sort_values('date')
    
    # 1. Merge for Home Team
    elo_home = elo_df.rename(columns={'team': 'home_team', 'rating': 'home_elo'})
    # Select columns we want to join
    elo_home = elo_home[['date', 'home_team', 'home_elo']]
    
    merged = pd.merge_asof(
        results_df,
        elo_home,
        on='date',
        by='home_team',
        direction='backward',
        allow_exact_matches=False
    )
    
    # 2. Merge for Away Team
    elo_away = elo_df.rename(columns={'team': 'away_team', 'rating': 'away_elo'})
    elo_away = elo_away[['date', 'away_team', 'away_elo']]
    
    merged = pd.merge_asof(
        merged,
        elo_away,
        on='date',
        by='away_team',
        direction='backward',
        allow_exact_matches=False
    )
    
    # Fill missing Elo values with default
    merged['home_elo'] = merged['home_elo'].fillna(default_elo)
    merged['away_elo'] = merged['away_elo'].fillna(default_elo)
    
    return merged

def merge_fifa_rankings(results_df: pd.DataFrame, fifa_df: pd.DataFrame, default_rank: float = 200.0, default_points: float = 0.0) -> pd.DataFrame:
    """
    Merges FIFA rankings for home and away teams.
    Guarantees no leakage by matching with the latest rank record strictly before the match date.
    """
    results_df = results_df.dropna(subset=['date']).copy().sort_values('date')
    
    # Drop rows where date/semester are missing
    fifa_df = fifa_df.dropna(subset=['date', 'semester'])
    
    # Rename 'date' column in FIFA to 'ranking_year' to prevent duplicate 'date' column conflict
    fifa_df = fifa_df.rename(columns={'date': 'ranking_year'})
    fifa_df = align_fifa_ranking_dates(fifa_df)
    fifa_df = fifa_df.dropna(subset=['ranking_date']).sort_values('ranking_date')

    
    # 1. Merge for Home Team
    fifa_home = fifa_df.rename(columns={
        'team': 'home_team',
        'rank': 'home_fifa_rank',
        'total.points': 'home_fifa_points',
        'ranking_date': 'date'  # Must match the on key
    })
    fifa_home = fifa_home[['date', 'home_team', 'home_fifa_rank', 'home_fifa_points']]
    
    merged = pd.merge_asof(
        results_df,
        fifa_home,
        on='date',
        by='home_team',
        direction='backward',
        allow_exact_matches=False
    )
    
    # 2. Merge for Away Team
    fifa_away = fifa_df.rename(columns={
        'team': 'away_team',
        'rank': 'away_fifa_rank',
        'total.points': 'away_fifa_points',
        'ranking_date': 'date'  # Must match the on key
    })
    fifa_away = fifa_away[['date', 'away_team', 'away_fifa_rank', 'away_fifa_points']]
    
    merged = pd.merge_asof(
        merged,
        fifa_away,
        on='date',
        by='away_team',
        direction='backward',
        allow_exact_matches=False
    )

    
    # Impute missing values
    merged['home_fifa_rank'] = merged['home_fifa_rank'].fillna(default_rank).astype('int')
    merged['away_fifa_rank'] = merged['away_fifa_rank'].fillna(default_rank).astype('int')
    merged['home_fifa_points'] = merged['home_fifa_points'].fillna(default_points).astype('float')
    merged['away_fifa_points'] = merged['away_fifa_points'].fillna(default_points).astype('float')
    
    return merged

def validate_merged_data(df: pd.DataFrame):
    """Runs integrity checks on the merged dataset."""
    logger.info("Validating master dataset...")
    
    # 1. Check for basic columns
    required_cols = ['date', 'home_team', 'away_team', 'home_score', 'away_score', 
                     'home_elo', 'away_elo', 'home_fifa_rank', 'away_fifa_rank']
    for col in required_cols:
        assert col in df.columns, f"Missing required column: {col}"
        
    # 2. Assert no nulls in target variables or merged rankings
    assert df['home_score'].isna().sum() == 0, "NaN scores detected"
    assert df['away_score'].isna().sum() == 0, "NaN scores detected"
    
    # 3. Warn about baseline fill rates
    total_rows = len(df)
    default_elo_home_rate = (df['home_elo'] == 1500.0).sum() / total_rows
    default_rank_home_rate = (df['home_fifa_rank'] == 200).sum() / total_rows
    
    logger.info(f"Total merged rows: {total_rows}")
    logger.info(f"Home Elo default fill rate: {default_elo_home_rate:.2%}")
    logger.info(f"Home FIFA rank default fill rate: {default_rank_home_rate:.2%}")
    logger.info("Validation completed successfully.")

def build_master_dataset(processed_dir: str):
    """Main workflow to merge all datasets and save the output master dataset."""
    logger.info("Starting dataset integration...")
    
    results_df = load_dataset(os.path.join(processed_dir, 'results.csv'), parse_dates=['date'])
    elo_df = load_dataset(os.path.join(processed_dir, 'eloratings.csv'), parse_dates=['date'])
    fifa_df = load_dataset(os.path.join(processed_dir, 'fifa_mens_rank.csv'))
    
    # Step 1: Merge ELO Ratings
    merged_df = merge_elo_ratings(results_df, elo_df)
    logger.info(f"After ELO merge, dataset shape: {merged_df.shape}")
    
    # Step 2: Merge FIFA Rankings
    merged_df = merge_fifa_rankings(merged_df, fifa_df)
    logger.info(f"After FIFA merge, dataset shape: {merged_df.shape}")
    
    # Step 3: Validate
    validate_merged_data(merged_df)
    
    # Step 4: Save
    output_path = os.path.join(processed_dir, 'master_dataset.csv')
    merged_df.to_csv(output_path, index=False)
    logger.info(f"Saved master dataset: {output_path}")

if __name__ == '__main__':
    build_master_dataset('C:/Users/Admin/Desktop/Fifa prediction/datasets/processed')
