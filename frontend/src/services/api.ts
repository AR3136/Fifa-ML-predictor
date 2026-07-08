import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_URL = rawApiUrl.endsWith('/api/v1') ? rawApiUrl.substring(0, rawApiUrl.length - 7) : rawApiUrl;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const response = await api.get('api/v1/health');
  return response.data;
};

export const predictMatch = async (homeTeam: string, awayTeam: string, neutralVenue = false) => {
  const response = await api.post('api/v1/predict', {
    home_team: homeTeam,
    away_team: awayTeam,
    neutral_venue: neutralVenue,
  });
  return response.data;
};

export const getTeamStats = async (teamName: string) => {
  const response = await api.get(`api/v1/team/${teamName}/stats`);
  return response.data;
};

export const getHeadToHead = async (team1: string, team2: string) => {
  const response = await api.get('api/v1/head-to-head', {
    params: { team1, team2 },
  });
  return response.data;
};
