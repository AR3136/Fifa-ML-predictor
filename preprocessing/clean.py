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

def load_csv(file_path: str) -> pd.DataFrame:
    """Loads a CSV file and logs shape."""
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"Missing dataset: {file_path}")
    df = pd.read_csv(file_path)
    logger.info(f"Loaded {os.path.basename(file_path)} with shape {df.shape}")
    return df

def clean_duplicates(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Removes duplicate rows and logs count of removed rows."""
    initial_shape = df.shape
    df_clean = df.drop_duplicates()
    diff = initial_shape[0] - df_clean.shape[0]
    if diff > 0:
        logger.info(f"Removed {diff} duplicate rows from {name}")
    return df_clean

def convert_dates(df: pd.DataFrame, date_cols: list[str], is_year_only: bool = False) -> pd.DataFrame:
    """Converts specified columns to datetime or integer year."""
    df = df.copy()
    for col in date_cols:
        if col not in df.columns:
            continue
        if is_year_only:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
        else:
            df[col] = pd.to_datetime(df[col], errors='coerce', format='mixed')
    return df

def standardize_team_names(
    df: pd.DataFrame, 
    team_cols: list[str], 
    date_col: str, 
    former_names_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Maps former team names to their current names based on the date range.
    Matches are case-sensitive.
    """
    df = df.copy()
    if former_names_df is None or former_names_df.empty:
        return df

    # Prepare former names rules
    fn = former_names_df.copy()
    fn['start'] = pd.to_datetime(fn['start_date'])
    fn['end'] = pd.to_datetime(fn['end_date'])

    is_year = df[date_col].dtype in [np.int64, np.int32, 'Int64']

    if is_year:
        fn['start_year'] = fn['start'].dt.year
        fn['end_year'] = fn['end'].dt.year

    for col in team_cols:
        if col not in df.columns:
            continue
        
        # Fill NA temporarily to avoid float matching errors
        series_filled = df[col].fillna('')
        
        for _, rule in fn.iterrows():
            former = rule['former']
            current = rule['current']
            
            if is_year:
                # Compare by year integers
                mask = (series_filled == former) & (df[date_col] >= rule['start_year']) & (df[date_col] <= rule['end_year'])
            else:
                # Compare by full datetimes
                mask = (series_filled == former) & (df[date_col] >= rule['start']) & (df[date_col] <= rule['end'])
            
            match_count = mask.sum()
            if match_count > 0:
                logger.info(f"Standardized {match_count} occurrences of '{former}' to '{current}' in column '{col}'")
                df.loc[mask, col] = current
                
    return df

def handle_missing_values(df: pd.DataFrame, fill_rules: dict) -> pd.DataFrame:
    """Handles missing values based on column-specific rules (drop or fill)."""
    df = df.copy()
    for col, action in fill_rules.items():
        if col not in df.columns:
            continue
        missing_count = df[col].isna().sum()
        if missing_count == 0:
            continue
        
        if action == 'drop':
            df = df.dropna(subset=[col])
            logger.info(f"Dropped {missing_count} rows due to missing values in '{col}'")
        else:
            df[col] = df[col].fillna(action)
            logger.info(f"Filled {missing_count} missing values in '{col}' with '{action}'")
    return df

def validate_datatypes(df: pd.DataFrame, schema: dict) -> pd.DataFrame:
    """Validates and casts columns to the correct schema datatypes."""
    df = df.copy()
    for col, dtype in schema.items():
        if col not in df.columns:
            continue
        try:
            if dtype == 'int':
                df[col] = pd.to_numeric(df[col], errors='coerce').round().astype('Int64')
            elif dtype == 'float':
                df[col] = pd.to_numeric(df[col], errors='coerce').astype('float64')
            elif dtype == 'bool':
                # Convert string representations to actual boolean
                if df[col].dtype == object:
                    df[col] = df[col].astype(str).str.upper().map({'TRUE': True, 'FALSE': False})
                df[col] = df[col].fillna(False).astype('bool')
            elif dtype == 'str':
                df[col] = df[col].astype(str)
        except Exception as e:
            logger.warning(f"Error casting column '{col}' to {dtype}: {e}")
    return df

def preprocess_all(raw_dir: str, processed_dir: str):
    """Executes the complete preprocessing pipeline for all datasets."""
    os.makedirs(processed_dir, exist_ok=True)
    logger.info("Starting preprocessing pipeline...")

    # Load former names first as it is used for mapping
    former_names_path = os.path.join(raw_dir, 'former_names.csv')
    try:
        former_names_df = load_csv(former_names_path)
        former_names_df = clean_duplicates(former_names_df, 'former_names')
        former_names_df = convert_dates(former_names_df, ['start_date', 'end_date'])
        former_names_df.to_csv(os.path.join(processed_dir, 'former_names.csv'), index=False)
        logger.info("Saved cleaned former_names.csv")
    except FileNotFoundError:
        logger.warning("former_names.csv not found. Continuing without team name standardization.")
        former_names_df = None

    # Define schemas, date columns, team columns, and missing value rules for each dataset
    datasets_config = {
        'results.csv': {
            'date_cols': ['date'],
            'is_year_only': False,
            'team_cols': ['home_team', 'away_team', 'country'],
            'fill_rules': {'home_score': 'drop', 'away_score': 'drop', 'home_team': 'drop', 'away_team': 'drop'},
            'schema': {'home_score': 'int', 'away_score': 'int', 'neutral': 'bool', 'home_team': 'str', 'away_team': 'str'}
        },
        'eloratings.csv': {
            'date_cols': ['date'],
            'is_year_only': False,
            'team_cols': ['team'],
            'fill_rules': {'rating': 'drop', 'team': 'drop'},
            'schema': {'rating': 'int', 'change': 'int', 'team': 'str'}
        },
        'fifa_mens_rank.csv': {
            'date_cols': ['date'],
            'is_year_only': True, # 'date' contains year integer
            'team_cols': ['team'],
            'fill_rules': {'rank': 'drop', 'team': 'drop'},
            'schema': {'date': 'int', 'semester': 'int', 'rank': 'int', 'total.points': 'float', 'previous.points': 'float', 'diff.points': 'float', 'team': 'str'}
        },
        'goalscorers.csv': {
            'date_cols': ['date'],
            'is_year_only': False,
            'team_cols': ['home_team', 'away_team', 'team'],
            'fill_rules': {'scorer': 'Unknown', 'minute': -1, 'own_goal': False, 'penalty': False},
            'schema': {'minute': 'int', 'own_goal': 'bool', 'penalty': 'bool', 'scorer': 'str'}
        },
        'shootouts.csv': {
            'date_cols': ['date'],
            'is_year_only': False,
            'team_cols': ['home_team', 'away_team', 'winner'],
            'fill_rules': {'first_shooter': 'Unknown'},
            'schema': {'first_shooter': 'str', 'home_team': 'str', 'away_team': 'str', 'winner': 'str'}
        }
    }

    for filename, config in datasets_config.items():
        file_path = os.path.join(raw_dir, filename)
        if not os.path.exists(file_path):
            logger.warning(f"File {filename} not found in {raw_dir}, skipping.")
            continue
        
        # 1. Load
        df = load_csv(file_path)
        
        # 2. Convert Dates
        df = convert_dates(df, config['date_cols'], config['is_year_only'])
        
        # 3. Handle Missing Values
        df = handle_missing_values(df, config['fill_rules'])
        
        # 4. Standardize Team Names
        df = standardize_team_names(df, config['team_cols'], config['date_cols'][0], former_names_df)
        
        # 5. Clean Duplicates
        df = clean_duplicates(df, filename)
        
        # 6. Validate Datatypes
        df = validate_datatypes(df, config['schema'])
        
        # 7. Save
        output_path = os.path.join(processed_dir, filename)
        df.to_csv(output_path, index=False)
        logger.info(f"Saved preprocessed dataset: {output_path} (Shape: {df.shape})")

if __name__ == '__main__':
    preprocess_all(
        raw_dir='C:/Users/Admin/Desktop/Fifa prediction/datasets/raw',
        processed_dir='C:/Users/Admin/Desktop/Fifa prediction/datasets/processed'
    )
