import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const predictMatch = async (homeTeam: string, awayTeam: string, neutralVenue = false) => {
  const response = await api.post('/predict', {
    home_team: homeTeam,
    away_team: awayTeam,
    neutral_venue: neutralVenue,
  });
  return response.data;
};

export const getTeamStats = async (teamName: string) => {
  const response = await api.get(`/team/${teamName}/stats`);
  return response.data;
};

export const getHeadToHead = async (team1: string, team2: string) => {
  const response = await api.get('/head-to-head', {
    params: { team1, team2 },
  });
  return response.data;
};
