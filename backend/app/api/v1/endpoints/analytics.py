from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.analytics_service import AnalyticsService

router = APIRouter()
analytics_service = AnalyticsService()

@router.get("/team/{team_name}/stats")
def get_team_stats(team_name: str):
    stats = analytics_service.get_team_historical_stats(team_name)
    if not stats:
        raise HTTPException(status_code=404, detail=f"No stats found for team {team_name}")
    return stats


@router.get("/head-to-head")
def get_head_to_head(team1: str, team2: str):
    h2h = analytics_service.get_h2h_stats(team1, team2)
    if not h2h:
        raise HTTPException(status_code=404, detail="No head-to-head stats available")
    return h2h


@router.get("/teams", response_model=List[str])
def get_all_teams():
    return analytics_service.get_all_teams()


