# Football Analytics & FIFA World Cup Prediction Platform

A production-ready full-stack platform for predicting international football match outcomes and simulating FIFA World Cup tournaments.

## Project Structure

```text
├── backend/                 # FastAPI service
│   ├── app/                 # Application codebase
│   │   ├── api/             # API Router, endpoints (v1)
│   │   ├── core/            # Config, security, database connections
│   │   ├── models/          # SQLAlchemy Database Models
│   │   ├── schemas/         # Pydantic Schemas
│   │   └── services/        # Prediction logic, analytics calculations
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                # React + Vite + TypeScript (SPA)
│   ├── src/
│   │   ├── components/      # UI components, Layouts, Charts, Forms
│   │   ├── pages/           # Dashboard, Analytics, Simulation, History
│   │   ├── services/        # Axios API clients
│   │   ├── types/           # TS Interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── datasets/                # Data storage
│   ├── raw/                 # Original CSV datasets (results, eloratings, ranks, etc.)
│   └── processed/           # Cleaned and engineered features
│
├── preprocessing/           # Data cleaning scripts
├── feature_engineering/     # Feature extraction pipelines
├── models/                  # ML training script, evaluation & saved model weights
├── notebooks/               # Jupyter Notebooks for experimentation
├── reports/                 # Analysis figures, evaluation metrics plots
├── tests/                   # Pytest & Vitest configurations and test cases
└── docs/                    # Architecture design and system documentation
```

## Quick Start (Local Run)

### Backend
1. Create a virtual environment and activate:
   ```bash
   cd backend
   python -m venv venv
   source venv/Scripts/activate # On Windows: .\venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run dev server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run Vite dev server:
   ```bash
   npm run dev
   ```
