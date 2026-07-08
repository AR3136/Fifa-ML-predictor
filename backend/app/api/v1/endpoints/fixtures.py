from fastapi import APIRouter, Query
from app.services.fixtures_service import FixturesService

router = APIRouter()
fixtures_service = FixturesService()

@router.get("/", summary="Get all current World Cup fixtures and groups")
def get_all_fixtures():
    """Returns the full cached fixtures including all matches, groups, and sync metadata."""
    return fixtures_service.get_fixtures()

@router.get("/sync", summary="Sync live World Cup fixtures from external API")
def sync_fixtures(force: bool = Query(False, description="Force sync bypassing cache expiration")):
    data = fixtures_service.get_fixtures(force_sync=force)
    return {
        "status": "success",
        "synced_at": data.get("synced_at"),
        "provider": data.get("provider"),
        "matches_count": len(data.get("matches", [])),
        "groups_count": len(data.get("groups", {}))
    }

@router.get("/groups", summary="Get World Cup groups listing")
def get_groups():
    data = fixtures_service.get_fixtures()
    return data.get("groups", {})

@router.get("/matches", summary="Get World Cup matches list with stage filters")
def get_matches(stage: str = Query(None, description="Filter matches by tournament stage (e.g. GROUP_STAGE, LAST_16)")):
    data = fixtures_service.get_fixtures()
    matches = data.get("matches", [])
    if stage:
        stage_lower = stage.lower()
        matches = [m for m in matches if m.get('stage', '').lower() == stage_lower]
    return matches
