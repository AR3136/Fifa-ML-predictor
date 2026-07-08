import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == "Football Analytics API Running"

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_loaded" in data
    assert "version" in data

def test_predict():
    payload = {
        "home_team": "France",
        "away_team": "Brazil",
        "tournament": "FIFA World Cup",
        "neutral_ground": True,
        "knockout": False
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "home_win_prob" in data
    assert "draw_prob" in data
    assert "away_win_prob" in data
    assert "predicted_winner" in data
    assert data["shootout_analysis"] is None

def test_predict_knockout():
    payload = {
        "home_team": "France",
        "away_team": "Brazil",
        "tournament": "FIFA World Cup",
        "neutral_ground": True,
        "knockout": True
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "home_win_prob" in data
    assert data["shootout_analysis"] is not None
    assert "predicted_winner" in data["shootout_analysis"]
    assert "home_win_prob" in data["shootout_analysis"]

def test_predict_fixture_group():
    # Fixture 1001 is GROUP_STAGE (no shootout analysis)
    response = client.post("/api/v1/predict/fixture/1001")
    assert response.status_code == 200
    data = response.json()
    assert "home_win_prob" in data
    assert data["shootout_analysis"] is None

def test_predict_fixture_knockout():
    # Fixture 2001 is LAST_16 (knockout -> should have shootout analysis)
    response = client.post("/api/v1/predict/fixture/2001")
    assert response.status_code == 200
    data = response.json()
    assert "home_win_prob" in data
    assert data["shootout_analysis"] is not None
    assert "predicted_winner" in data["shootout_analysis"]

def test_simulate_tournament():
    payload = ["Argentina", "France", "Brazil", "Germany"]
    response = client.post("/api/v1/simulate-tournament", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "winner" in data
    assert "rounds" in data
    assert len(data["rounds"]) == 2

def test_get_all_fixtures():
    response = client.get("/api/v1/fixtures/")
    assert response.status_code == 200
    data = response.json()
    assert "matches" in data
    assert "groups" in data

def test_sync_fixtures():
    response = client.get("/api/v1/fixtures/sync")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "matches_count" in data

def test_get_groups():
    response = client.get("/api/v1/fixtures/groups")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)

def test_get_matches():
    response = client.get("/api/v1/fixtures/matches")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_teams():
    response = client.get("/api/v1/teams")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "France" in data




