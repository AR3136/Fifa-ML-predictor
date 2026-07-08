from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from app.services.prediction_service import PredictionService
from app.services.fixtures_service import FixturesService

router = APIRouter()
prediction_service = PredictionService()
fixtures_service = FixturesService()

class ShootoutAnalysis(BaseModel):
    predicted_winner: str = Field(description="Predicted shootout winner team")
    home_win_prob: float = Field(description="Home team shootout win probability")
    away_win_prob: float = Field(description="Away team shootout win probability")
    home_so_wins: int = Field(default=0, description="Home team historical shootout wins")
    home_so_losses: int = Field(default=0, description="Home team historical shootout losses")
    home_so_win_rate: float = Field(default=0.5, description="Home team historical shootout win rate")
    away_so_wins: int = Field(default=0, description="Away team historical shootout wins")
    away_so_losses: int = Field(default=0, description="Away team historical shootout losses")
    away_so_win_rate: float = Field(default=0.5, description="Away team historical shootout win rate")
    model_version: str = Field(description="Model used for shootout prediction")


class Explanation(BaseModel):
    elo_diff: float
    rank_diff: int
    home_elo: float
    away_elo: float
    home_fifa_rank: int
    away_fifa_rank: int
    home_last5_win_rate: float
    away_last5_win_rate: float
    h2h_home_wins: int
    h2h_away_wins: int
    h2h_draws: int
    shap_values: Dict[str, float]

class PredictionRequest(BaseModel):
    home_team: str = Field(description="Name of the home team", json_schema_extra={"example": "France"})
    away_team: str = Field(description="Name of the away team", json_schema_extra={"example": "Brazil"})
    tournament: str = Field(default="FIFA World Cup", description="Name of the tournament", json_schema_extra={"example": "FIFA World Cup"})
    neutral_ground: bool = Field(default=False, description="Whether match is played on neutral ground")
    knockout: bool = Field(default=False, description="Whether this is a knockout stage tie-breaking match")

class PredictionResponse(BaseModel):
    home_win_prob: float = Field(description="Home win probability")
    draw_prob: float = Field(description="Draw probability")
    away_win_prob: float = Field(description="Away win probability")
    predicted_winner: str = Field(description="Predicted regular time outcome (Home, Away, or Draw)")
    shootout_analysis: Optional[ShootoutAnalysis] = Field(default=None, description="Detailed shootout prediction if knockout is True")
    explanation: Optional[Explanation] = Field(default=None, description="Explanation model metadata and SHAP contributions")
    model_version: str = Field(description="Model used for match prediction")

@router.post("/predict", response_model=PredictionResponse, summary="Head-to-Head match outcome prediction")
def predict_match(request: PredictionRequest):
    """
    Predicts the match outcome (Home Win, Draw, Away Win) for a given pair of teams.
    If knockout is True, also evaluates penalty shootout outcome.
    """
    if request.home_team.strip().lower() == request.away_team.strip().lower():
        raise HTTPException(status_code=400, detail="Home and Away teams must be different!")
        
    try:
        # Run main prediction
        res = prediction_service.predict_match_outcome(
            home_team=request.home_team,
            away_team=request.away_team,
            neutral_venue=request.neutral_ground
        )
        
        shootout_res = None
        if request.knockout:
            so_pred = prediction_service.predict_shootout_outcome(request.home_team, request.away_team)
            h_so = prediction_service.get_team_shootout_history(request.home_team)
            a_so = prediction_service.get_team_shootout_history(request.away_team)
            shootout_res = ShootoutAnalysis(
                predicted_winner=so_pred['predicted_winner'],
                home_win_prob=so_pred['home_win_prob'],
                away_win_prob=so_pred['away_win_prob'],
                home_so_wins=h_so['wins'],
                home_so_losses=h_so['losses'],
                home_so_win_rate=h_so['win_rate'],
                away_so_wins=a_so['wins'],
                away_so_losses=a_so['losses'],
                away_so_win_rate=a_so['win_rate'],
                model_version=so_pred['model_version']
            )
            
        return PredictionResponse(
            home_win_prob=res['home_win_prob'],
            draw_prob=res['draw_prob'],
            away_win_prob=res['away_win_prob'],
            predicted_winner=res['predicted_winner'],
            shootout_analysis=shootout_res,
            explanation=res.get('explanation'),
            model_version=res['model_version']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

@router.post("/predict/fixture/{fixture_id}", response_model=PredictionResponse, summary="Predict match outcome by World Cup Fixture ID")
def predict_fixture(fixture_id: str = Path(..., description="The unique ID of the cached World Cup fixture")):
    """
    Looks up a cached World Cup fixture by ID and automatically predicts its outcome.
    If the fixture is part of the knockout stage (e.g. LAST_16, SEMI_FINALS), also runs shootout analysis.
    """
    # 1. Fetch fixtures
    data = fixtures_service.get_fixtures()
    matches = data.get("matches", [])
    
    fixture = None
    for m in matches:
        if str(m['id']) == str(fixture_id):
            fixture = m
            break
            
    if not fixture:
        raise HTTPException(status_code=404, detail=f"World Cup fixture with ID {fixture_id} not found.")
        
    home_team = fixture['home_team']
    away_team = fixture['away_team']
    stage = fixture.get('stage', 'GROUP_STAGE')
    is_knockout = stage != 'GROUP_STAGE'
    
    try:
        # Run main prediction (World Cup matches are played on neutral ground)
        res = prediction_service.predict_match_outcome(
            home_team=home_team,
            away_team=away_team,
            neutral_venue=True
        )
        
        shootout_res = None
        if is_knockout:
            so_pred = prediction_service.predict_shootout_outcome(home_team, away_team)
            h_so = prediction_service.get_team_shootout_history(home_team)
            a_so = prediction_service.get_team_shootout_history(away_team)
            shootout_res = ShootoutAnalysis(
                predicted_winner=so_pred['predicted_winner'],
                home_win_prob=so_pred['home_win_prob'],
                away_win_prob=so_pred['away_win_prob'],
                home_so_wins=h_so['wins'],
                home_so_losses=h_so['losses'],
                home_so_win_rate=h_so['win_rate'],
                away_so_wins=a_so['wins'],
                away_so_losses=a_so['losses'],
                away_so_win_rate=a_so['win_rate'],
                model_version=so_pred['model_version']
            )
            
        return PredictionResponse(
            home_win_prob=res['home_win_prob'],
            draw_prob=res['draw_prob'],
            away_win_prob=res['away_win_prob'],
            predicted_winner=res['predicted_winner'],
            shootout_analysis=shootout_res,
            explanation=res.get('explanation'),
            model_version=res['model_version']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error for fixture: {e}")

@router.post("/simulate-tournament")
def simulate_tournament(teams: list[str]):
    # Maintain existing knockout tournament simulation helper
    if not teams:
        raise HTTPException(status_code=400, detail="No teams provided")
    
    current_round = teams.copy()
    rounds_log = []
    
    while len(current_round) > 1:
        next_round = []
        matches_in_round = []
        for i in range(0, len(current_round), 2):
            if i + 1 < len(current_round):
                t1 = current_round[i]
                t2 = current_round[i+1]
                pred = prediction_service.predict_match_outcome(t1, t2, neutral_venue=True)
                winner = pred['predicted_winner']
                shootout_details = None
                
                if winner == 'Draw':
                    so_pred = prediction_service.predict_shootout_outcome(t1, t2)
                    winner = so_pred['predicted_winner']
                    shootout_details = {
                        "winner": winner,
                        "home_so_prob": so_pred['home_win_prob'],
                        "away_so_prob": so_pred['away_win_prob'],
                        "model": so_pred['model_version']
                    }
                    
                next_round.append(winner)
                matches_in_round.append({
                    "home": t1,
                    "away": t2,
                    "probabilities": {
                        "home_win": pred['home_win_prob'],
                        "draw": pred['draw_prob'],
                        "away_win": pred['away_win_prob']
                    },
                    "winner": winner,
                    "shootout": shootout_details
                })
            else:
                next_round.append(current_round[i])
        rounds_log.append(matches_in_round)
        current_round = next_round
        
    return {
        "simulation_id": "sim_tournament_123",
        "winner": current_round[0],
        "rounds": rounds_log
    }

@router.post("/simulate-monte-carlo")
def simulate_monte_carlo_endpoint(payload: dict):
    """Runs Monte Carlo simulation of the tournament 1000 times using predictions model."""
    matches = payload.get("matches", [])
    shuffle = payload.get("shuffle", True)
    start_at_qf = payload.get("start_at_qf", False)
    qf_matches = payload.get("qf_matches", [])
    
    if len(matches) != 8:
        raise HTTPException(status_code=400, detail="Must provide exactly 8 matches for Round of 16")
    
    import random
    prediction_cache = {}
    
    def predict_pair(t1: str, t2: str):
        key = tuple(sorted([t1, t2]))
        if key in prediction_cache:
            return prediction_cache[key]
            
        res = prediction_service.predict_match_outcome(t1, t2, neutral_venue=True)
        so_res = prediction_service.predict_shootout_outcome(t1, t2)
        
        prediction_cache[key] = {
            "t1": t1,
            "t2": t2,
            "home": res['home_win_prob'],
            "draw": res['draw_prob'],
            "away": res['away_win_prob'],
            "so_home": so_res['home_win_prob'],
            "so_away": so_res['away_win_prob']
        }
        return prediction_cache[key]

    all_teams = []
    for m in matches:
        all_teams.append(m["homeTeam"])
        all_teams.append(m["awayTeam"])

    teams_stats = {}
    for team in all_teams:
        teams_stats[team] = {"qf": 0, "sf": 0, "runner_up": 0, "champion": 0}
        
    num_simulations = 1000
    for _ in range(num_simulations):
        if start_at_qf:
            # R16 is skipped/fixed. The QF teams are predetermined.
            # Mark the 8 QF teams as reached QF
            for m in qf_matches:
                teams_stats[m["homeTeam"]]["qf"] += 1
                teams_stats[m["awayTeam"]]["qf"] += 1
            
            qf_teams = []
            for m in qf_matches:
                t1 = m["homeTeam"]
                t2 = m["awayTeam"]
                pred = predict_pair(t1, t2)
                r = random.random()
                if r < pred["home"]:
                    winner = t1
                elif r < pred["home"] + pred["draw"]:
                    winner = t1 if random.random() < pred["so_home"] else t2
                else:
                    winner = t2
                qf_teams.append(winner)
                teams_stats[winner]["sf"] += 1
                
            # Simulate from SF
            sf_teams = qf_teams
        else:
            if shuffle:
                # Shuffle 16 teams for this individual simulation run
                sim_teams = all_teams.copy()
                random.shuffle(sim_teams)
                
                sim_matches = []
                for i in range(0, len(sim_teams), 2):
                    sim_matches.append({
                        "homeTeam": sim_teams[i],
                        "awayTeam": sim_teams[i+1]
                    })
            else:
                sim_matches = matches
                
            # 1. Round of 16
            qf_teams = []
            for m in sim_matches:
                t1 = m["homeTeam"]
                t2 = m["awayTeam"]
                pred = predict_pair(t1, t2)
                
                r = random.random()
                if r < pred["home"]:
                    winner = t1
                elif r < pred["home"] + pred["draw"]:
                    winner = t1 if random.random() < pred["so_home"] else t2
                else:
                    winner = t2
                qf_teams.append(winner)
                teams_stats[winner]["qf"] += 1
                
            # 2. Quarter Finals
            sf_teams = []
            for i in range(0, len(qf_teams), 2):
                t1 = qf_teams[i]
                t2 = qf_teams[i+1]
                pred = predict_pair(t1, t2)
                
                r = random.random()
                if r < pred["home"]:
                    winner = t1
                elif r < pred["home"] + pred["draw"]:
                    winner = t1 if random.random() < pred["so_home"] else t2
                else:
                    winner = t2
                sf_teams.append(winner)
                teams_stats[winner]["sf"] += 1
            
        # 3. Semi Finals
        final_teams = []
        for i in range(0, len(sf_teams), 2):
            t1 = sf_teams[i]
            t2 = sf_teams[i+1]
            pred = predict_pair(t1, t2)
            
            r = random.random()
            if r < pred["home"]:
                winner = t1
            elif r < pred["home"] + pred["draw"]:
                winner = t1 if random.random() < pred["so_home"] else t2
            else:
                winner = t2
            final_teams.append(winner)
            
        # 4. Final
        t1 = final_teams[0]
        t2 = final_teams[1]
        pred = predict_pair(t1, t2)
        
        r = random.random()
        if r < pred["home"]:
            winner = t1
            runner_up = t2
        elif r < pred["home"] + pred["draw"]:
            if random.random() < pred["so_home"]:
                winner = t1
                runner_up = t2
            else:
                winner = t2
                runner_up = t1
        else:
            winner = t2
            runner_up = t1
            
        teams_stats[runner_up]["runner_up"] += 1
        teams_stats[winner]["champion"] += 1

    results = []
    for team, stats in teams_stats.items():
        results.append({
            "team": team,
            "qf": round((stats["qf"] / num_simulations) * 100, 1),
            "sf": round((stats["sf"] / num_simulations) * 100, 1),
            "runner_up": round(((stats["runner_up"] + stats["champion"]) / num_simulations) * 100, 1),
            "champion": round((stats["champion"] / num_simulations) * 100, 1)
        })
        
    results = sorted(results, key=lambda x: x["champion"], reverse=True)
    return {"results": results}

@router.get("/teams", summary="Get sorted list of all unique team names")
def get_teams():
    """Returns a sorted list of unique team names available in the dataset."""
    return prediction_service.get_all_teams()
