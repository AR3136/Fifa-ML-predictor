# System Architecture

## Platform Overview
This platform is designed to ingest historical international football datasets, perform feature engineering (including ELO tracking, FIFA ranks, home/away strengths, and head-to-head records), train prediction models, and serve those predictions through a FastAPI backend to a React single-page application.

## Machine Learning Pipeline
1. **Data Ingestion**: Raw data placed in `/datasets/raw/`.
2. **Preprocessing**: Handled by `preprocessing/clean.py` (resolving former country names, schema unification).
3. **Feature Engineering**: Handled by `feature_engineering/build_features.py` (calculating historical features, ELO progression, target variable generation).
4. **Model Training**: Handled by `models/train.py` (Cross-validation, hyperparameter tuning, model checkpoint saving).

## Backend (FastAPI)
The API layer exposes prediction queries, historical analytics charts endpoints, and health monitoring endpoints.

## Frontend (React + Vite + Tailwind + TypeScript)
The visual dashboard allowing users to:
1. View overall tournament datasets and analytics metrics.
2. Select two teams to run a match outcome prediction.
3. Simulate a complete tournament play-out.
