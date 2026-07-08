import pytest
import pandas as pd
import numpy as np
from preprocessing.clean import (
    clean_duplicates,
    convert_dates,
    standardize_team_names,
    handle_missing_values,
    validate_datatypes
)

def test_clean_duplicates():
    df = pd.DataFrame({'a': [1, 1, 2], 'b': [2, 2, 3]})
    df_clean = clean_duplicates(df, 'test')
    assert len(df_clean) == 2
    assert df_clean.iloc[0]['a'] == 1
    assert df_clean.iloc[1]['a'] == 2

def test_convert_dates():
    df = pd.DataFrame({'date': ['1872-11-30', 'InvalidDate']})
    df_conv = convert_dates(df, ['date'])
    assert pd.api.types.is_datetime64_any_dtype(df_conv['date'])
    assert df_conv['date'].isna()[1]

def test_convert_dates_year():
    df = pd.DataFrame({'year': ['2024', 'invalid']})
    df_conv = convert_dates(df, ['year'], is_year_only=True)
    assert df_conv['year'].iloc[0] == 2024
    assert df_conv['year'].isna()[1]

def test_standardize_team_names_datetime():
    former_names_df = pd.DataFrame({
        'current': ['Benin', 'Burkina Faso'],
        'former': ['Dahomey', 'Upper Volta'],
        'start_date': ['1959-11-08', '1960-04-14'],
        'end_date': ['1975-11-30', '1984-08-04']
    })
    
    # Matching case
    df = pd.DataFrame({
        'home_team': ['Dahomey', 'Dahomey'],
        'date': ['1970-01-01', '1980-01-01'] # 1970 is in range, 1980 is out of range
    })
    df['date'] = pd.to_datetime(df['date'])
    
    df_std = standardize_team_names(df, ['home_team'], 'date', former_names_df)
    assert df_std['home_team'].iloc[0] == 'Benin'
    assert df_std['home_team'].iloc[1] == 'Dahomey'

def test_standardize_team_names_year():
    former_names_df = pd.DataFrame({
        'current': ['Benin'],
        'former': ['Dahomey'],
        'start_date': ['1959-11-08'],
        'end_date': ['1975-11-30']
    })
    
    df = pd.DataFrame({
        'team': ['Dahomey', 'Dahomey'],
        'date': [1970, 1980] # year integers
    })
    
    df_std = standardize_team_names(df, ['team'], 'date', former_names_df)
    assert df_std['team'].iloc[0] == 'Benin'
    assert df_std['team'].iloc[1] == 'Dahomey'

def test_handle_missing_values():
    df = pd.DataFrame({
        'scorer': ['Messi', np.nan, 'Ronaldo'],
        'minute': [10, np.nan, 90]
    })
    fill_rules = {'scorer': 'Unknown', 'minute': 'drop'}
    df_clean = handle_missing_values(df, fill_rules)
    assert len(df_clean) == 2
    assert df_clean['scorer'].iloc[1] == 'Ronaldo'
    # Row with NaN in minute should be dropped
    assert 1 not in df_clean.index

def test_validate_datatypes():
    df = pd.DataFrame({
        'goals': ['2.1', '3', 'invalid'],
        'neutral': ['TRUE', 'FALSE', 'invalid']
    })
    schema = {'goals': 'int', 'neutral': 'bool'}
    df_val = validate_datatypes(df, schema)
    assert df_val['goals'].iloc[0] == 2
    assert df_val['goals'].iloc[1] == 3
    assert df_val['goals'].isna()[2]
    assert df_val['neutral'].iloc[0] == True
    assert df_val['neutral'].iloc[1] == False
    assert df_val['neutral'].iloc[2] == False # Fallback to False

