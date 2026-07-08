from fastapi import APIRouter
from app.api.v1.endpoints.predict import prediction_service

router = APIRouter()

@router.get("/health")
def health_check():
    model_loaded = prediction_service.model is not None and prediction_service.so_model is not None
    return {
        "status": "healthy",
        "model_loaded": model_loaded,
        "version": "1.0.0"
    }

