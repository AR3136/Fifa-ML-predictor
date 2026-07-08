from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.api.v1.endpoints import health, predict, analytics, fixtures
from app.services.analytics_service import AnalyticsService

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Custom Override Endpoints (Declared first for FastAPI routing precedence)
analytics_service = AnalyticsService()

@app.get("/api/v1/teams")
def get_teams():
    return {
        "teams": analytics_service.get_all_teams()
    }

@app.get("/api/v1/health")
def health_check_override():
    from app.api.v1.endpoints.predict import prediction_service
    from app.services.prediction_service import MODEL_PATH
    import os
    return {
        "status": "healthy",
        "model_loaded": prediction_service.model is not None,
        "model_version": f"CatBoost-{prediction_service.model_name}",
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH),
        "penalty_model_loaded": prediction_service.so_model is not None,
        "team_count": len(analytics_service.get_all_teams()),
        "version": "1.0.0"
    }

# Gzip compression for production performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Set CORS origins
origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
origins.extend([
    "https://fifa-ml-predictor.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(predict.router, prefix=settings.API_V1_STR, tags=["predict"])
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["analytics"])
app.include_router(fixtures.router, prefix=f"{settings.API_V1_STR}/fixtures", tags=["fixtures"])


@app.get("/")
def read_root():
    return "Football Analytics API Running"

