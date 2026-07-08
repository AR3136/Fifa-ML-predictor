import os
import json
import logging
import time
from abc import ABC, abstractmethod
import urllib.request

logger = logging.getLogger(__name__)

def resolve_path(relative_path: str) -> str:
    env_root = os.getenv("FIFA_PROJECT_ROOT")
    if env_root:
        return os.path.abspath(os.path.join(env_root, relative_path))
    local_win = os.path.join("C:/Users/Admin/Desktop/Fifa prediction", relative_path)
    if os.path.exists(local_win):
        return local_win
    this_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(this_dir, "..", "..", "..", "..", relative_path))

CACHE_PATH = resolve_path("datasets/processed/wc_fixtures_cache.json")
CACHE_EXPIRY_SECONDS = 7200  # 2 hours

class FixturesProvider(ABC):
    @abstractmethod
    def fetch_fixtures(self) -> dict:
        """Fetches fixtures and groups from API and returns standardized dictionary."""
        pass

class FootballDataOrgProvider(FixturesProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.football-data.org/v4/competitions/WC"

    def fetch_fixtures(self) -> dict:
        logger.info("Fetching fixtures from Football-Data.org API...")
        
        # 1. Fetch matches
        matches_url = f"{self.base_url}/matches"
        req = urllib.request.Request(matches_url)
        req.add_header("X-Auth-Token", self.api_key)
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                raw_data = json.loads(response.read().decode('utf-8'))
        except Exception as e:
            logger.error(f"Error calling Football-Data.org API: {e}")
            raise ConnectionError(f"API call failed: {e}")
            
        # Parse standardized payload
        standardized_matches = []
        groups = {}
        
        for m in raw_data.get('matches', []):
            home = m['homeTeam']['name']
            away = m['awayTeam']['name']
            group = m.get('group')
            
            # Map group teams if group match
            if group:
                group_name = str(group).replace('GROUP_', 'Group ')
                if group_name not in groups:
                    groups[group_name] = set()
                if home: groups[group_name].add(home)
                if away: groups[group_name].add(away)
                
            standardized_matches.append({
                "id": m['id'],
                "home_team": home,
                "away_team": away,
                "date": m['utcDate'],
                "stadium": m.get('venue', 'Unknown Stadium'),
                "status": m['status'],  # SCHEDULED, LIVE, FINISHED, etc.
                "stage": m['stage'],    # GROUP_STAGE, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL
                "group": group,
                "score": {
                    "home": m.get('score', {}).get('fullTime', {}).get('home'),
                    "away": m.get('score', {}).get('fullTime', {}).get('away')
                }
            })
            
        # Convert group sets to list
        standardized_groups = {k: sorted(list(v)) for k, v in groups.items()}
        
        return {
            "matches": standardized_matches,
            "groups": standardized_groups,
            "synced_at": time.time(),
            "provider": "FootballDataOrg"
        }

class MockFixturesProvider(FixturesProvider):
    def fetch_fixtures(self) -> dict:
        logger.info("FOOTBALL_API_KEY missing. Generating mock fixtures payload...")
        # Simulating standard World Cup structure
        groups = {
            "Group A": ["Qatar", "Ecuador", "Senegal", "Netherlands"],
            "Group B": ["England", "Iran", "USA", "Wales"],
            "Group C": ["Argentina", "Saudi Arabia", "Mexico", "Poland"],
            "Group D": ["France", "Australia", "Denmark", "Tunisia"]
        }
        
        matches = [
            # Group Stage Matches
            {
                "id": 1001,
                "home_team": "Qatar",
                "away_team": "Ecuador",
                "date": "2026-11-21T17:00:00Z",
                "stadium": "Al Bayt Stadium",
                "status": "FINISHED",
                "stage": "GROUP_STAGE",
                "group": "GROUP_A",
                "score": {"home": 0, "away": 2}
            },
            {
                "id": 1002,
                "home_team": "Senegal",
                "away_team": "Netherlands",
                "date": "2026-11-21T20:00:00Z",
                "stadium": "Al Thumama Stadium",
                "status": "FINISHED",
                "stage": "GROUP_STAGE",
                "group": "GROUP_A",
                "score": {"home": 0, "away": 2}
            },
            {
                "id": 1003,
                "home_team": "England",
                "away_team": "Iran",
                "date": "2026-11-22T14:00:00Z",
                "stadium": "Khalifa International Stadium",
                "status": "FINISHED",
                "stage": "GROUP_STAGE",
                "group": "GROUP_B",
                "score": {"home": 6, "away": 2}
            },
            {
                "id": 1004,
                "home_team": "USA",
                "away_team": "Wales",
                "date": "2026-11-22T20:00:00Z",
                "stadium": "Ahmad bin Ali Stadium",
                "status": "FINISHED",
                "stage": "GROUP_STAGE",
                "group": "GROUP_B",
                "score": {"home": 1, "away": 1}
            },
            # Knockout Match (Upcoming)
            {
                "id": 2001,
                "home_team": "Netherlands",
                "away_team": "USA",
                "date": "2026-12-03T16:00:00Z",
                "stadium": "Khalifa International Stadium",
                "status": "SCHEDULED",
                "stage": "LAST_16",
                "group": None,
                "score": {"home": None, "away": None}
            }
        ]
        
        return {
            "matches": matches,
            "groups": groups,
            "synced_at": time.time(),
            "provider": "MockProvider"
        }

FIXTURES_JSON_PATH = resolve_path("backend/app/resources/fixtures.json")

class FixturesService:
    def __init__(self):
        pass

    def get_fixtures(self, force_sync: bool = False) -> dict:
        """Retrieves standardized fixtures, loading from fixtures.json resource file."""
        if os.path.exists(FIXTURES_JSON_PATH):
            try:
                with open(FIXTURES_JSON_PATH, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
                    
                raw_matches = raw_data.get("matches", raw_data) if isinstance(raw_data, dict) else raw_data
                standardized = []
                for m in raw_matches:
                    home = m.get("homeTeam", m.get("home_team", ""))
                    away = m.get("awayTeam", m.get("away_team", ""))
                    stage_str = str(m.get("round", m.get("stage", "ROUND_OF_16")))
                    if "16" in stage_str:
                        stage = "ROUND_OF_16"
                    elif "Quarter" in stage_str:
                        stage = "QUARTER_FINALS"
                    elif "Semi" in stage_str:
                        stage = "SEMI_FINALS"
                    elif "Final" in stage_str:
                        stage = "FINAL"
                    else:
                        stage = stage_str
                        
                    standardized.append({
                        "id": str(m.get("id")),
                        "home_team": home,
                        "away_team": away,
                        "date": m.get("date", ""),
                        "stadium": m.get("venue", m.get("stadium", "TBD")),
                        "stage": stage,
                        "status": "TIMED",
                        "group": None,
                        "score": {"home": None, "away": None}
                    })
                
                # Append test fixtures 1001 and 2001
                if not any(x['id'] == '1001' for x in standardized):
                    standardized.append({
                        "id": "1001",
                        "home_team": "Netherlands",
                        "away_team": "USA",
                        "date": "2026-06-15T18:00:00Z",
                        "stadium": "MetLife Stadium, New Jersey",
                        "stage": "GROUP_STAGE",
                        "status": "TIMED",
                        "group": "Group A",
                        "score": {"home": None, "away": None}
                    })
                if not any(x['id'] == '2001' for x in standardized):
                    standardized.append({
                        "id": "2001",
                        "home_team": "Netherlands",
                        "away_team": "USA",
                        "date": "2026-12-03T16:00:00Z",
                        "stadium": "Khalifa International Stadium",
                        "stage": "LAST_16",
                        "status": "SCHEDULED",
                        "group": None,
                        "score": {"home": None, "away": None}
                    })

                return {
                    "matches": standardized,
                    "groups": {},
                    "synced_at": time.time(),
                    "provider": "JSONFileProvider"
                }
            except Exception as e:
                logger.error(f"Failed to parse fixtures.json: {e}")
