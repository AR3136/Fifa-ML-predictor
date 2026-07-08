import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Settings as SettingsIcon, 
  ShieldAlert, 
  Home as HomeIcon,
  Users, 
  Activity, 
  Globe2, 
  RefreshCw, 
  Sliders, 
  Cpu, 
  TrendingUp,
  CheckCircle,
  Trophy,
  Play,
  Sparkles,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { getHealth, getTeamStats, api } from './services/api';


const TEAMS_LIST = [
  "Argentina", "France", "Spain", "England", "Brazil", "Portugal", "Netherlands", "Belgium", 
  "Italy", "Germany", "Uruguay", "Colombia", "Croatia", "Morocco", "Japan", "USA", "Senegal", 
  "Ecuador", "Switzerland", "Denmark", "Qatar", "Saudi Arabia", "Mexico", "Poland", "Australia", 
  "Tunisia", "Wales", "Iran"
];

const getFlagEmoji = (country: string) => {
  const codeMap: Record<string, string> = {
    "Argentina": "🇦🇷", "France": "🇫🇷", "Spain": "🇪🇸", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Brazil": "🇧🇷",
    "Portugal": "🇵🇹", "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "Italy": "🇮🇹", "Germany": "🇩🇪",
    "Uruguay": "🇺🇾", "Colombia": "🇨🇴", "Croatia": "🇭🇷", "Morocco": "🇲🇦", "Japan": "🇯🇵",
    "USA": "🇺🇸", "Egypt": "🇪🇬", "Nigeria": "🇳🇬", "South Korea": "🇰🇷"
  };
  return codeMap[country] || "🏳️";
};

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'h2h' | 'simulator' | 'wc2026' | 'team' | 'model' | 'settings'>('home');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [healthStatus, setHealthStatus] = useState<string>("Checking...");
  const [isModelLoaded, setIsModelLoaded] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const [teamsList, setTeamsList] = useState<string[]>(TEAMS_LIST);
  
  // H2H Form state
  const [homeTeam, setHomeTeam] = useState("France");
  const [awayTeam, setAwayTeam] = useState("Brazil");
  const [tournament, setTournament] = useState("FIFA World Cup");
  const [neutralGround, setNeutralGround] = useState(true);
  const [knockout, setKnockout] = useState(false);
  const [h2hResult, setH2hResult] = useState<any>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  const [predictingFixtureId, setPredictingFixtureId] = useState<string | null>(null);

  // Knockout Simulator state
  const [simMatches, setSimMatches] = useState<Record<string, any>>(() => {
    const cached = localStorage.getItem("simMatches");
    return cached ? JSON.parse(cached) : {};
  });
  
  const [bracket, setBracket] = useState<any>(() => {
    const cached = localStorage.getItem("simBracket");
    if (cached) return JSON.parse(cached);
    return {
      r16: [
        { id: "1", homeTeam: "Canada", awayTeam: "Morocco", nextMatchId: "qf1", slot: "home", date: "2026-07-04", venue: "MetLife Stadium", stage: "ROUND_OF_16" },
        { id: "2", homeTeam: "Paraguay", awayTeam: "France", nextMatchId: "qf1", slot: "away", date: "2026-07-04", venue: "Hard Rock Stadium", stage: "ROUND_OF_16" },
        { id: "3", homeTeam: "Portugal", awayTeam: "Spain", nextMatchId: "qf2", slot: "home", date: "2026-07-05", venue: "Gillette Stadium", stage: "ROUND_OF_16" },
        { id: "4", homeTeam: "USA", awayTeam: "Belgium", nextMatchId: "qf2", slot: "away", date: "2026-07-05", venue: "Mercedes-Benz Stadium", stage: "ROUND_OF_16" },
        { id: "5", homeTeam: "Brazil", awayTeam: "Norway", nextMatchId: "qf3", slot: "home", date: "2026-07-06", venue: "Arrowhead Stadium", stage: "ROUND_OF_16" },
        { id: "6", homeTeam: "Mexico", awayTeam: "England", nextMatchId: "qf3", slot: "away", date: "2026-07-06", venue: "SoFi Stadium", stage: "ROUND_OF_16" },
        { id: "7", homeTeam: "Argentina", awayTeam: "Egypt", nextMatchId: "qf4", slot: "home", date: "2026-07-07", venue: "Levi's Stadium", stage: "ROUND_OF_16" },
        { id: "8", homeTeam: "Switzerland", awayTeam: "Colombia", nextMatchId: "qf4", slot: "away", date: "2026-07-07", venue: "NRG Stadium", stage: "ROUND_OF_16" }
      ],
      qf: [
        { id: "qf1", homeTeam: "Winner R16 (1)", awayTeam: "Winner R16 (2)", nextMatchId: "sf1", slot: "home", date: "2026-07-10", venue: "Gillette Stadium, Boston", stage: "QUARTER_FINALS" },
        { id: "qf2", homeTeam: "Winner R16 (3)", awayTeam: "Winner R16 (4)", nextMatchId: "sf1", slot: "away", date: "2026-07-10", venue: "Hard Rock Stadium, Miami", stage: "QUARTER_FINALS" },
        { id: "qf3", homeTeam: "Winner R16 (5)", awayTeam: "Winner R16 (6)", nextMatchId: "sf2", slot: "home", date: "2026-07-11", venue: "Arrowhead Stadium, Kansas City", stage: "QUARTER_FINALS" },
        { id: "qf4", homeTeam: "Winner R16 (7)", awayTeam: "Winner R16 (8)", nextMatchId: "sf2", slot: "away", date: "2026-07-11", venue: "AT&T Stadium, Dallas", stage: "QUARTER_FINALS" }
      ],
      sf: [
        { id: "sf1", homeTeam: "Winner QF (1)", awayTeam: "Winner QF (2)", nextMatchId: "f1", slot: "home", date: "2026-07-14", venue: "AT&T Stadium, Dallas", stage: "SEMI_FINALS" },
        { id: "sf2", homeTeam: "Winner QF (3)", awayTeam: "Winner QF (4)", nextMatchId: "f1", slot: "away", date: "2026-07-15", venue: "Mercedes-Benz Stadium, Atlanta", stage: "SEMI_FINALS" }
      ],
      f1: [
        { id: "f1", homeTeam: "Winner SF (1)", awayTeam: "Winner SF (2)", nextMatchId: "champ", slot: "champ", date: "2026-07-19", venue: "MetLife Stadium, New York", stage: "FINAL" }
      ]
    };
  });
  
  // Dedicated 2026 World Cup Bracket state
  const [wcSimMatches, setWcSimMatches] = useState<Record<string, any>>(() => {
    const cached = localStorage.getItem("wcSimMatches");
    if (cached) return JSON.parse(cached);
    return {
      "1": { winner: "Morocco", homeTeam: "Canada", awayTeam: "Morocco", home_win_prob: 0.42, away_win_prob: 0.58, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.58, model_version: "1.0.0" },
      "2": { winner: "France", homeTeam: "Paraguay", awayTeam: "France", home_win_prob: 0.38, away_win_prob: 0.62, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.62, model_version: "1.0.0" },
      "3": { winner: "Spain", homeTeam: "Portugal", awayTeam: "Spain", home_win_prob: 0.47, away_win_prob: 0.53, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.53, model_version: "1.0.0" },
      "4": { winner: "Belgium", homeTeam: "USA", awayTeam: "Belgium", home_win_prob: 0.45, away_win_prob: 0.55, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.55, model_version: "1.0.0" },
      "5": { winner: "Norway", homeTeam: "Brazil", awayTeam: "Norway", home_win_prob: 0.44, away_win_prob: 0.56, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.56, model_version: "1.0.0" },
      "6": { winner: "England", homeTeam: "Mexico", awayTeam: "England", home_win_prob: 0.39, away_win_prob: 0.61, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.61, model_version: "1.0.0" },
      "7": { winner: "Argentina", homeTeam: "Argentina", awayTeam: "Egypt", home_win_prob: 0.68, away_win_prob: 0.32, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.68, model_version: "1.0.0" },
      "8": { winner: "Switzerland", homeTeam: "Switzerland", awayTeam: "Colombia", home_win_prob: 0.54, away_win_prob: 0.46, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.54, model_version: "1.0.0" }
    };
  });
  
  const [wcBracket, setWcBracket] = useState<any>(() => {
    const cached = localStorage.getItem("wcBracket");
    if (cached) return JSON.parse(cached);
    return {
      r16: [
        { id: "1", homeTeam: "Canada", awayTeam: "Morocco", nextMatchId: "qf1", slot: "home", date: "2026-07-04", venue: "MetLife Stadium", stage: "ROUND_OF_16" },
        { id: "2", homeTeam: "Paraguay", awayTeam: "France", nextMatchId: "qf1", slot: "away", date: "2026-07-04", venue: "Hard Rock Stadium", stage: "ROUND_OF_16" },
        { id: "3", homeTeam: "Portugal", awayTeam: "Spain", nextMatchId: "qf2", slot: "home", date: "2026-07-05", venue: "Gillette Stadium", stage: "ROUND_OF_16" },
        { id: "4", homeTeam: "USA", awayTeam: "Belgium", nextMatchId: "qf2", slot: "away", date: "2026-07-05", venue: "Mercedes-Benz Stadium", stage: "ROUND_OF_16" },
        { id: "5", homeTeam: "Brazil", awayTeam: "Norway", nextMatchId: "qf3", slot: "home", date: "2026-07-06", venue: "Arrowhead Stadium", stage: "ROUND_OF_16" },
        { id: "6", homeTeam: "Mexico", awayTeam: "England", nextMatchId: "qf3", slot: "away", date: "2026-07-06", venue: "SoFi Stadium", stage: "ROUND_OF_16" },
        { id: "7", homeTeam: "Argentina", awayTeam: "Egypt", nextMatchId: "qf4", slot: "home", date: "2026-07-07", venue: "Levi's Stadium", stage: "ROUND_OF_16" },
        { id: "8", homeTeam: "Switzerland", awayTeam: "Colombia", nextMatchId: "qf4", slot: "away", date: "2026-07-07", venue: "NRG Stadium", stage: "ROUND_OF_16" }
      ],
      qf: [
        { id: "qf1", homeTeam: "Morocco", awayTeam: "France", nextMatchId: "sf1", slot: "home", date: "2026-07-10", venue: "Gillette Stadium, Boston", stage: "QUARTER_FINALS" },
        { id: "qf2", homeTeam: "Spain", awayTeam: "Belgium", nextMatchId: "sf1", slot: "away", date: "2026-07-10", venue: "Hard Rock Stadium, Miami", stage: "QUARTER_FINALS" },
        { id: "qf3", homeTeam: "Norway", awayTeam: "England", nextMatchId: "sf2", slot: "home", date: "2026-07-11", venue: "Arrowhead Stadium, Kansas City", stage: "QUARTER_FINALS" },
        { id: "qf4", homeTeam: "Argentina", awayTeam: "Switzerland", nextMatchId: "sf2", slot: "away", date: "2026-07-11", venue: "AT&T Stadium, Dallas", stage: "QUARTER_FINALS" }
      ],
      sf: [
        { id: "sf1", homeTeam: "Winner QF (1)", awayTeam: "Winner QF (2)", nextMatchId: "f1", slot: "home", date: "2026-07-14", venue: "AT&T Stadium, Dallas", stage: "SEMI_FINALS" },
        { id: "sf2", homeTeam: "Winner QF (3)", awayTeam: "Winner QF (4)", nextMatchId: "f1", slot: "away", date: "2026-07-15", venue: "Mercedes-Benz Stadium, Atlanta", stage: "SEMI_FINALS" }
      ],
      f1: [
        { id: "f1", homeTeam: "Winner SF (1)", awayTeam: "Winner SF (2)", nextMatchId: "champ", slot: "champ", date: "2026-07-19", venue: "MetLife Stadium, New York", stage: "FINAL" }
      ]
    };
  });
  
  const [activeModalMatch, setActiveModalMatch] = useState<any>(null);
  const [monteCarloResults, setMonteCarloResults] = useState<any>(null);
  const [wcMonteCarloResults, setWcMonteCarloResults] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [monteCarloLoading, setMonteCarloLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("simMatches", JSON.stringify(simMatches));
  }, [simMatches]);

  useEffect(() => {
    localStorage.setItem("simBracket", JSON.stringify(bracket));
  }, [bracket]);

  useEffect(() => {
    localStorage.setItem("wcSimMatches", JSON.stringify(wcSimMatches));
  }, [wcSimMatches]);

  useEffect(() => {
    localStorage.setItem("wcBracket", JSON.stringify(wcBracket));
  }, [wcBracket]);

  // Team Analytics state
  const [selectedTeam, setSelectedTeam] = useState("France");
  const [teamStats, setTeamStats] = useState<any>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [analyticsMode, setAnalyticsMode] = useState<'single' | 'h2h_compare'>('single');
  const [compareTeam, setCompareTeam] = useState("Brazil");
  const [h2hStats, setH2hStats] = useState<any>(null);
  const [h2hStatsLoading, setH2hStatsLoading] = useState(false);
  const [historyYears, setHistoryYears] = useState<number>(5);

  // Check backend health and fetch dynamic teams list
  useEffect(() => {
    getHealth()
      .then(data => {
        if (data.status === "healthy") {
          setHealthStatus("Online");
          setIsModelLoaded(data.model_loaded === true);
        } else {
          setHealthStatus("Offline");
          setIsModelLoaded(false);
        }
      })
      .catch(() => {
        setHealthStatus("Offline (Check API)");
        setIsModelLoaded(false);
      });

    api.get('api/v1/teams')
      .then(res => {
        const teams = Array.isArray(res.data) ? res.data : (res.data && res.data.teams);
        if (teams && teams.length > 0) {
          setTeamsList(teams);
        }
      })
      .catch(err => console.error("Error loading teams list from backend:", err));
  }, []);


  // Load team stats
  useEffect(() => {
    if (activeTab === 'team') {
      setTeamLoading(true);
      getTeamStats(selectedTeam)
        .then(data => setTeamStats(data))
        .catch(e => console.error(e))
        .finally(() => setTeamLoading(false));
    }
  }, [activeTab, selectedTeam]);

  // Load H2H stats
  useEffect(() => {
    if (activeTab === 'team' && analyticsMode === 'h2h_compare') {
      setH2hStatsLoading(true);
      api.get(`api/v1/head-to-head?team1=${selectedTeam}&team2=${compareTeam}`)
        .then(res => setH2hStats(res.data))
        .catch(e => console.error(e))
        .finally(() => setH2hStatsLoading(false));
    }
  }, [activeTab, analyticsMode, selectedTeam, compareTeam]);


  // Run H2H Prediction
  const handleH2hPredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (homeTeam === awayTeam) {
      alert("Home and Away teams must be different!");
      return;
    }
    setH2hLoading(true);
    try {
      const res = await api.post('api/v1/predict', {
        home_team: homeTeam,
        away_team: awayTeam,
        tournament,
        neutral_ground: neutralGround,
        knockout
      });
      setH2hResult(res.data);
    } catch (error) {
      console.error(error);
      alert("Failed to get prediction from backend.");
    } finally {
      setH2hLoading(false);
    }
  };


  // --- SIMULATOR FUNCTIONS ---
  const handleResetSimulator = () => {
    localStorage.removeItem("simMatches");
    localStorage.removeItem("simBracket");
    setSimMatches({});
    setMonteCarloResults(null);
    setBracket({
      r16: [
        { id: "1", homeTeam: "Canada", awayTeam: "Morocco", nextMatchId: "qf1", slot: "home", date: "2026-07-04", venue: "MetLife Stadium", stage: "ROUND_OF_16" },
        { id: "2", homeTeam: "Paraguay", awayTeam: "France", nextMatchId: "qf1", slot: "away", date: "2026-07-04", venue: "Hard Rock Stadium", stage: "ROUND_OF_16" },
        { id: "3", homeTeam: "Portugal", awayTeam: "Spain", nextMatchId: "qf2", slot: "home", date: "2026-07-05", venue: "Gillette Stadium", stage: "ROUND_OF_16" },
        { id: "4", homeTeam: "USA", awayTeam: "Belgium", nextMatchId: "qf2", slot: "away", date: "2026-07-05", venue: "Mercedes-Benz Stadium", stage: "ROUND_OF_16" },
        { id: "5", homeTeam: "Brazil", awayTeam: "Norway", nextMatchId: "qf3", slot: "home", date: "2026-07-06", venue: "Arrowhead Stadium", stage: "ROUND_OF_16" },
        { id: "6", homeTeam: "Mexico", awayTeam: "England", nextMatchId: "qf3", slot: "away", date: "2026-07-06", venue: "SoFi Stadium", stage: "ROUND_OF_16" },
        { id: "7", homeTeam: "Argentina", awayTeam: "Egypt", nextMatchId: "qf4", slot: "home", date: "2026-07-07", venue: "Levi's Stadium", stage: "ROUND_OF_16" },
        { id: "8", homeTeam: "Switzerland", awayTeam: "Colombia", nextMatchId: "qf4", slot: "away", date: "2026-07-07", venue: "NRG Stadium", stage: "ROUND_OF_16" }
      ],
      qf: [
        { id: "qf1", homeTeam: "Winner R16 (1)", awayTeam: "Winner R16 (2)", nextMatchId: "sf1", slot: "home", date: "2026-07-10", venue: "Gillette Stadium, Boston", stage: "QUARTER_FINALS" },
        { id: "qf2", homeTeam: "Winner R16 (3)", awayTeam: "Winner R16 (4)", nextMatchId: "sf1", slot: "away", date: "2026-07-10", venue: "Hard Rock Stadium, Miami", stage: "QUARTER_FINALS" },
        { id: "qf3", homeTeam: "Winner R16 (5)", awayTeam: "Winner R16 (6)", nextMatchId: "sf2", slot: "home", date: "2026-07-11", venue: "Arrowhead Stadium, Kansas City", stage: "QUARTER_FINALS" },
        { id: "qf4", homeTeam: "Winner R16 (7)", awayTeam: "Winner R16 (8)", nextMatchId: "sf2", slot: "away", date: "2026-07-11", venue: "AT&T Stadium, Dallas", stage: "QUARTER_FINALS" }
      ],
      sf: [
        { id: "sf1", homeTeam: "Winner QF (1)", awayTeam: "Winner QF (2)", nextMatchId: "f1", slot: "home", date: "2026-07-14", venue: "AT&T Stadium, Dallas", stage: "SEMI_FINALS" },
        { id: "sf2", homeTeam: "Winner QF (3)", awayTeam: "Winner QF (4)", nextMatchId: "f1", slot: "away", date: "2026-07-15", venue: "Mercedes-Benz Stadium, Atlanta", stage: "SEMI_FINALS" }
      ],
      f1: [
        { id: "f1", homeTeam: "Winner SF (1)", awayTeam: "Winner SF (2)", nextMatchId: "champ", slot: "champ", date: "2026-07-19", venue: "MetLife Stadium, New York", stage: "FINAL" }
      ]
    });
  };

  const handleRandomizeFixtures = () => {
    const originalTeams = [
      "Canada", "Morocco", "Paraguay", "France", "Portugal", "Spain", "USA", "Belgium",
      "Brazil", "Norway", "Mexico", "England", "Argentina", "Egypt", "Switzerland", "Colombia"
    ];
    const shuffled = [...originalTeams].sort(() => Math.random() - 0.5);
    const newR16 = bracket.r16.map((m: any, idx: number) => ({
      ...m,
      homeTeam: shuffled[idx * 2],
      awayTeam: shuffled[idx * 2 + 1]
    }));
    setSimMatches({});
    setMonteCarloResults(null);
    const newBracket = {
      ...bracket,
      r16: newR16,
      qf: bracket.qf.map((q: any) => ({
        ...q,
        homeTeam: `Winner R16 (${q.id === 'qf1' ? '1' : q.id === 'qf2' ? '3' : q.id === 'qf3' ? '5' : '7'})`,
        awayTeam: `Winner R16 (${q.id === 'qf1' ? '2' : q.id === 'qf2' ? '4' : q.id === 'qf3' ? '6' : '8'})`
      })),
      sf: bracket.sf.map((s: any) => ({ ...s, homeTeam: `Winner QF (1)`, awayTeam: `Winner QF (2)` })),
      f1: bracket.f1.map((f: any) => ({ ...f, homeTeam: `Winner SF (1)`, awayTeam: `Winner SF (2)` }))
    };
    setBracket(newBracket);
    localStorage.setItem("simBracket", JSON.stringify(newBracket));
    localStorage.removeItem("simMatches");
  };

  const advanceWinnerInBracket = (nextMatchId: string, slot: string, winnerName: string) => {
    if (nextMatchId === "champ") return;
    setBracket((prev: any) => {
      const nextB = JSON.parse(JSON.stringify(prev));
      for (const round of ["qf", "sf", "f1"]) {
        const idx = nextB[round].findIndex((m: any) => m.id === nextMatchId);
        if (idx !== -1) {
          if (slot === "home") {
            nextB[round][idx].homeTeam = winnerName;
          } else {
            nextB[round][idx].awayTeam = winnerName;
          }
          break;
        }
      }
      return nextB;
    });
  };

  const handleSimulateMatch = async (match: any) => {
    if (match.homeTeam.includes("Winner") || match.awayTeam.includes("Winner")) {
      alert("Please resolve prior rounds first!");
      return;
    }
    setPredictingFixtureId(match.id);
    try {
      const res = await api.post('api/v1/predict', {
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        tournament: "FIFA World Cup",
        neutral_ground: true,
        knockout: true
      });
      const data = res.data;
      let winnerName = data.predicted_winner;
      let prob = 0;
      let isShootout = false;

      if (winnerName === "Draw") {
        isShootout = true;
        winnerName = data.shootout_analysis.predicted_winner;
        prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
      } else {
        prob = winnerName === match.homeTeam ? data.home_win_prob : data.away_win_prob;
      }

      setSimMatches(prev => ({
        ...prev,
        [match.id]: {
          ...data,
          winner: winnerName,
          winningProb: prob,
          isShootout,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          round: match.stage
        }
      }));

      advanceWinnerInBracket(match.nextMatchId, match.slot, winnerName);
    } catch (e) {
      console.error(e);
      alert("Failed to predict match.");
    } finally {
      setPredictingFixtureId(null);
    }
  };

  const handleAutoSimulate = async () => {
    setSimLoading(true);
    try {
      const nextB = JSON.parse(JSON.stringify(bracket));
      const tempMatches = { ...simMatches };

      const predictPair = async (h: string, a: string) => {
        const res = await api.post('api/v1/predict', {
          home_team: h,
          away_team: a,
          tournament: "FIFA World Cup",
          neutral_ground: true,
          knockout: true
        });
        return res.data;
      };

      // 1. R16
      for (const m of nextB.r16) {
        const data = await predictPair(m.homeTeam, m.awayTeam);
        let winnerName = data.predicted_winner;
        let prob = 0;
        let isShootout = false;
        if (winnerName === "Draw") {
          isShootout = true;
          winnerName = data.shootout_analysis.predicted_winner;
          prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
        } else {
          prob = winnerName === m.homeTeam ? data.home_win_prob : data.away_win_prob;
        }
        tempMatches[m.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.stage };
        
        const qfIdx = nextB.qf.findIndex((q: any) => q.id === m.nextMatchId);
        if (m.slot === "home") nextB.qf[qfIdx].homeTeam = winnerName;
        else nextB.qf[qfIdx].awayTeam = winnerName;
      }

      // 2. QF
      for (const m of nextB.qf) {
        const data = await predictPair(m.homeTeam, m.awayTeam);
        let winnerName = data.predicted_winner;
        let prob = 0;
        let isShootout = false;
        if (winnerName === "Draw") {
          isShootout = true;
          winnerName = data.shootout_analysis.predicted_winner;
          prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
        } else {
          prob = winnerName === m.homeTeam ? data.home_win_prob : data.away_win_prob;
        }
        tempMatches[m.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.stage };
        
        const sfIdx = nextB.sf.findIndex((s: any) => s.id === m.nextMatchId);
        if (m.slot === "home") nextB.sf[sfIdx].homeTeam = winnerName;
        else nextB.sf[sfIdx].awayTeam = winnerName;
      }

      // 3. SF
      for (const m of nextB.sf) {
        const data = await predictPair(m.homeTeam, m.awayTeam);
        let winnerName = data.predicted_winner;
        let prob = 0;
        let isShootout = false;
        if (winnerName === "Draw") {
          isShootout = true;
          winnerName = data.shootout_analysis.predicted_winner;
          prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
        } else {
          prob = winnerName === m.homeTeam ? data.home_win_prob : data.away_win_prob;
        }
        tempMatches[m.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.stage };
        
        const fIdx = nextB.f1.findIndex((f: any) => f.id === m.nextMatchId);
        if (m.slot === "home") nextB.f1[fIdx].homeTeam = winnerName;
        else nextB.f1[fIdx].awayTeam = winnerName;
      }

      // 4. Final
      const f1Match = nextB.f1[0];
      const data = await predictPair(f1Match.homeTeam, f1Match.awayTeam);
      let winnerName = data.predicted_winner;
      let prob = 0;
      let isShootout = false;
      if (winnerName === "Draw") {
        isShootout = true;
        winnerName = data.shootout_analysis.predicted_winner;
        prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
      } else {
        prob = winnerName === f1Match.homeTeam ? data.home_win_prob : data.away_win_prob;
      }
      tempMatches[f1Match.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: f1Match.homeTeam, awayTeam: f1Match.awayTeam, round: f1Match.stage };

      // Set champion metadata
      tempMatches['champ'] = {
        winner: winnerName,
        runnerUp: winnerName === f1Match.homeTeam ? f1Match.awayTeam : f1Match.homeTeam,
        winningProb: prob
      };

      setBracket(nextB);
      setSimMatches(tempMatches);
    } catch (e) {
      console.error(e);
      alert("Auto simulation failed.");
    } finally {
      setSimLoading(false);
    }
  };

  const handleMonteCarloSimulate = async () => {
    setMonteCarloLoading(true);
    try {
      const res = await api.post('api/v1/simulate-monte-carlo', {
        matches: bracket.r16.map((m: any) => ({
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam
        }))
      });
      setMonteCarloResults(res.data.results);
    } catch (e) {
      console.error(e);
      alert("Monte Carlo simulation failed.");
    } finally {
      setMonteCarloLoading(false);
    }
  };

  // --- 2026 DEDICATED FIXED TAB HANDLERS ---
  const handleWcResetSimulator = () => {
    localStorage.removeItem("wcSimMatches");
    localStorage.removeItem("wcBracket");
    setWcSimMatches({
      "1": { winner: "Morocco", homeTeam: "Canada", awayTeam: "Morocco", home_win_prob: 0.42, away_win_prob: 0.58, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.58, model_version: "1.0.0" },
      "2": { winner: "France", homeTeam: "Paraguay", awayTeam: "France", home_win_prob: 0.38, away_win_prob: 0.62, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.62, model_version: "1.0.0" },
      "3": { winner: "Spain", homeTeam: "Portugal", awayTeam: "Spain", home_win_prob: 0.47, away_win_prob: 0.53, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.53, model_version: "1.0.0" },
      "4": { winner: "Belgium", homeTeam: "USA", awayTeam: "Belgium", home_win_prob: 0.45, away_win_prob: 0.55, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.55, model_version: "1.0.0" },
      "5": { winner: "Norway", homeTeam: "Brazil", awayTeam: "Norway", home_win_prob: 0.44, away_win_prob: 0.56, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.56, model_version: "1.0.0" },
      "6": { winner: "England", homeTeam: "Mexico", awayTeam: "England", home_win_prob: 0.39, away_win_prob: 0.61, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.61, model_version: "1.0.0" },
      "7": { winner: "Argentina", homeTeam: "Argentina", awayTeam: "Egypt", home_win_prob: 0.68, away_win_prob: 0.32, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.68, model_version: "1.0.0" },
      "8": { winner: "Switzerland", homeTeam: "Switzerland", awayTeam: "Colombia", home_win_prob: 0.54, away_win_prob: 0.46, draw_prob: 0.0, isShootout: false, round: "ROUND_OF_16", winningProb: 0.54, model_version: "1.0.0" }
    });
    setWcMonteCarloResults(null);
    setWcBracket({
      r16: [
        { id: "1", homeTeam: "Canada", awayTeam: "Morocco", nextMatchId: "qf1", slot: "home", date: "2026-07-04", venue: "MetLife Stadium", stage: "ROUND_OF_16" },
        { id: "2", homeTeam: "Paraguay", awayTeam: "France", nextMatchId: "qf1", slot: "away", date: "2026-07-04", venue: "Hard Rock Stadium", stage: "ROUND_OF_16" },
        { id: "3", homeTeam: "Portugal", awayTeam: "Spain", nextMatchId: "qf2", slot: "home", date: "2026-07-05", venue: "Gillette Stadium", stage: "ROUND_OF_16" },
        { id: "4", homeTeam: "USA", awayTeam: "Belgium", nextMatchId: "qf2", slot: "away", date: "2026-07-05", venue: "Mercedes-Benz Stadium", stage: "ROUND_OF_16" },
        { id: "5", homeTeam: "Brazil", awayTeam: "Norway", nextMatchId: "qf3", slot: "home", date: "2026-07-06", venue: "Arrowhead Stadium", stage: "ROUND_OF_16" },
        { id: "6", homeTeam: "Mexico", awayTeam: "England", nextMatchId: "qf3", slot: "away", date: "2026-07-06", venue: "SoFi Stadium", stage: "ROUND_OF_16" },
        { id: "7", homeTeam: "Argentina", awayTeam: "Egypt", nextMatchId: "qf4", slot: "home", date: "2026-07-07", venue: "Levi's Stadium", stage: "ROUND_OF_16" },
        { id: "8", homeTeam: "Switzerland", awayTeam: "Colombia", nextMatchId: "qf4", slot: "away", date: "2026-07-07", venue: "NRG Stadium", stage: "ROUND_OF_16" }
      ],
      qf: [
        { id: "qf1", homeTeam: "Morocco", awayTeam: "France", nextMatchId: "sf1", slot: "home", date: "2026-07-10", venue: "Gillette Stadium, Boston", stage: "QUARTER_FINALS" },
        { id: "qf2", homeTeam: "Spain", awayTeam: "Belgium", nextMatchId: "sf1", slot: "away", date: "2026-07-10", venue: "Hard Rock Stadium, Miami", stage: "QUARTER_FINALS" },
        { id: "qf3", homeTeam: "Norway", awayTeam: "England", nextMatchId: "sf2", slot: "home", date: "2026-07-11", venue: "Arrowhead Stadium, Kansas City", stage: "QUARTER_FINALS" },
        { id: "qf4", homeTeam: "Argentina", awayTeam: "Switzerland", nextMatchId: "sf2", slot: "away", date: "2026-07-11", venue: "AT&T Stadium, Dallas", stage: "QUARTER_FINALS" }
      ],
      sf: [
        { id: "sf1", homeTeam: "Winner QF (1)", awayTeam: "Winner QF (2)", nextMatchId: "f1", slot: "home", date: "2026-07-14", venue: "AT&T Stadium, Dallas", stage: "SEMI_FINALS" },
        { id: "sf2", homeTeam: "Winner QF (3)", awayTeam: "Winner QF (4)", nextMatchId: "f1", slot: "away", date: "2026-07-15", venue: "Mercedes-Benz Stadium, Atlanta", stage: "SEMI_FINALS" }
      ],
      f1: [
        { id: "f1", homeTeam: "Winner SF (1)", awayTeam: "Winner SF (2)", nextMatchId: "champ", slot: "champ", date: "2026-07-19", venue: "MetLife Stadium, New York", stage: "FINAL" }
      ]
    });
  };

  const advanceWcWinnerInBracket = (nextMatchId: string, slot: string, winnerName: string) => {
    if (nextMatchId === "champ") return;
    setWcBracket((prev: any) => {
      const nextB = JSON.parse(JSON.stringify(prev));
      for (const round of ["qf", "sf", "f1"]) {
        const idx = nextB[round].findIndex((m: any) => m.id === nextMatchId);
        if (idx !== -1) {
          if (slot === "home") {
            nextB[round][idx].homeTeam = winnerName;
          } else {
            nextB[round][idx].awayTeam = winnerName;
          }
          break;
        }
      }
      return nextB;
    });
  };

  const handleWcSimulateMatch = async (match: any) => {
    if (match.homeTeam.includes("Winner") || match.awayTeam.includes("Winner")) {
      alert("Please resolve prior rounds first!");
      return;
    }
    setPredictingFixtureId(match.id);
    try {
      const res = await api.post('api/v1/predict', {
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        tournament: "FIFA World Cup",
        neutral_ground: true,
        knockout: true
      });
      const data = res.data;
      let winnerName = data.predicted_winner;
      let prob = 0;
      let isShootout = false;

      if (winnerName === "Draw") {
        isShootout = true;
        winnerName = data.shootout_analysis.predicted_winner;
        prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
      } else {
        prob = winnerName === match.homeTeam ? data.home_win_prob : data.away_win_prob;
      }

      setWcSimMatches(prev => ({
        ...prev,
        [match.id]: {
          ...data,
          winner: winnerName,
          winningProb: prob,
          isShootout,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          round: match.stage
        }
      }));

      advanceWcWinnerInBracket(match.nextMatchId, match.slot, winnerName);
    } catch (e) {
      console.error(e);
      alert("Failed to predict match.");
    } finally {
      setPredictingFixtureId(null);
    }
  };

  const handleWcAutoSimulate = async () => {
    setSimLoading(true);
    try {
      const nextB = JSON.parse(JSON.stringify(wcBracket));
      const tempMatches = { ...wcSimMatches };

      const predictPair = async (h: string, a: string) => {
        const res = await api.post('api/v1/predict', {
          home_team: h,
          away_team: a,
          tournament: "FIFA World Cup",
          neutral_ground: true,
          knockout: true
        });
        return res.data;
      };

      // 2. QF
      for (const m of nextB.qf) {
        const data = await predictPair(m.homeTeam, m.awayTeam);
        let winnerName = data.predicted_winner;
        let prob = 0;
        let isShootout = false;
        if (winnerName === "Draw") {
          isShootout = true;
          winnerName = data.shootout_analysis.predicted_winner;
          prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
        } else {
          prob = winnerName === m.homeTeam ? data.home_win_prob : data.away_win_prob;
        }
        tempMatches[m.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.stage };
        
        const sfIdx = nextB.sf.findIndex((s: any) => s.id === m.nextMatchId);
        if (m.slot === "home") nextB.sf[sfIdx].homeTeam = winnerName;
        else nextB.sf[sfIdx].awayTeam = winnerName;
      }

      // 3. SF
      for (const m of nextB.sf) {
        const data = await predictPair(m.homeTeam, m.awayTeam);
        let winnerName = data.predicted_winner;
        let prob = 0;
        let isShootout = false;
        if (winnerName === "Draw") {
          isShootout = true;
          winnerName = data.shootout_analysis.predicted_winner;
          prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
        } else {
          prob = winnerName === m.homeTeam ? data.home_win_prob : data.away_win_prob;
        }
        tempMatches[m.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.stage };
        
        const fIdx = nextB.f1.findIndex((f: any) => f.id === m.nextMatchId);
        if (m.slot === "home") nextB.f1[fIdx].homeTeam = winnerName;
        else nextB.f1[fIdx].awayTeam = winnerName;
      }

      // 4. Final
      const f1Match = nextB.f1[0];
      const data = await predictPair(f1Match.homeTeam, f1Match.awayTeam);
      let winnerName = data.predicted_winner;
      let prob = 0;
      let isShootout = false;
      if (winnerName === "Draw") {
        isShootout = true;
        winnerName = data.shootout_analysis.predicted_winner;
        prob = Math.max(data.shootout_analysis.home_win_prob, data.shootout_analysis.away_win_prob);
      } else {
        prob = winnerName === f1Match.homeTeam ? data.home_win_prob : data.away_win_prob;
      }
      tempMatches[f1Match.id] = { ...data, winner: winnerName, winningProb: prob, isShootout, homeTeam: f1Match.homeTeam, awayTeam: f1Match.awayTeam, round: f1Match.stage };

      // Set champion metadata
      tempMatches['champ'] = {
        winner: winnerName,
        runnerUp: winnerName === f1Match.homeTeam ? f1Match.awayTeam : f1Match.homeTeam,
        winningProb: prob
      };

      setWcBracket(nextB);
      setWcSimMatches(tempMatches);
    } catch (e) {
      console.error(e);
      alert("Auto simulation failed.");
    } finally {
      setSimLoading(false);
    }
  };

  const handleWcMonteCarloSimulate = async () => {
    setMonteCarloLoading(true);
    try {
      const res = await api.post('api/v1/simulate-monte-carlo', {
        matches: wcBracket.r16.map((m: any) => ({
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam
        })),
        shuffle: false,
        start_at_qf: true,
        qf_matches: wcBracket.qf.map((m: any) => ({
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam
        }))
      });
      setWcMonteCarloResults(res.data.results);
    } catch (e) {
      console.error(e);
      alert("Monte Carlo simulation failed.");
    } finally {
      setMonteCarloLoading(false);
    }
  };

  const getChampionPath = (champTeam: string) => {
    const path = [];
    const r16Match = bracket.r16.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (r16Match && simMatches[r16Match.id]) {
      const opp = r16Match.homeTeam === champTeam ? r16Match.awayTeam : r16Match.homeTeam;
      path.push(`Beat ${opp} in Round of 16`);
    }
    const qfMatch = bracket.qf.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (qfMatch && simMatches[qfMatch.id]) {
      const opp = qfMatch.homeTeam === champTeam ? qfMatch.awayTeam : qfMatch.homeTeam;
      path.push(`Beat ${opp} in Quarter-Finals`);
    }
    const sfMatch = bracket.sf.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (sfMatch && simMatches[sfMatch.id]) {
      const opp = sfMatch.homeTeam === champTeam ? sfMatch.awayTeam : sfMatch.homeTeam;
      path.push(`Beat ${opp} in Semi-Finals`);
    }
    const fMatch = bracket.f1.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (fMatch && simMatches[fMatch.id]) {
      const opp = fMatch.homeTeam === champTeam ? fMatch.awayTeam : fMatch.homeTeam;
      path.push(`Beat ${opp} in the Final`);
    }
    return path;
  };

  const getWcChampionPath = (champTeam: string) => {
    const path = [];
    const r16Match = wcBracket.r16.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (r16Match && wcSimMatches[r16Match.id]) {
      const opp = r16Match.homeTeam === champTeam ? r16Match.awayTeam : r16Match.homeTeam;
      path.push(`Beat ${opp} in Round of 16`);
    }
    const qfMatch = wcBracket.qf.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (qfMatch && wcSimMatches[qfMatch.id]) {
      const opp = qfMatch.homeTeam === champTeam ? qfMatch.awayTeam : qfMatch.homeTeam;
      path.push(`Beat ${opp} in Quarter-Finals`);
    }
    const sfMatch = wcBracket.sf.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (sfMatch && wcSimMatches[sfMatch.id]) {
      const opp = sfMatch.homeTeam === champTeam ? sfMatch.awayTeam : sfMatch.homeTeam;
      path.push(`Beat ${opp} in Semi-Finals`);
    }
    const fMatch = wcBracket.f1.find((m: any) => m.homeTeam === champTeam || m.awayTeam === champTeam);
    if (fMatch && wcSimMatches[fMatch.id]) {
      const opp = fMatch.homeTeam === champTeam ? fMatch.awayTeam : fMatch.homeTeam;
      path.push(`Beat ${opp} in the Final`);
    }
    return path;
  };


  // Mock data for Model Info
  const modelMetrics = [
    { name: "Logistic Regression", Accuracy: 0.5626, F1: 0.4166, ROC_AUC: 0.7064 },
    { name: "Random Forest", Accuracy: 0.5827, F1: 0.4205, ROC_AUC: 0.7175 },
    { name: "XGBoost", Accuracy: 0.5868, F1: 0.4304, ROC_AUC: 0.7272 },
    { name: "LightGBM", Accuracy: 0.5863, F1: 0.4255, ROC_AUC: 0.7221 },
    { name: "CatBoost (Winner)", Accuracy: 0.5901, F1: 0.4377, ROC_AUC: 0.7286 }
  ];

  const featureImportances = [
    { name: 'Elo Diff', Importance: 28 },
    { name: 'FIFA Rank Diff', Importance: 22 },
    { name: 'FIFA Points Diff', Importance: 18 },
    { name: 'Host status', Importance: 12 },
    { name: 'Recent Goals Scored', Importance: 10 },
    { name: 'H2H Wins', Importance: 6 },
    { name: 'Other', Importance: 4 }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#0B0F19] text-white' : 'bg-[#F3F4F6] text-gray-900'} flex flex-col md:flex-row`}>
      {/* Mobile Header Top Bar */}
      <header className={`md:hidden flex items-center justify-between p-4 border-b sticky top-0 z-40 ${darkMode ? 'border-gray-800 bg-[#151D30]/90 text-white' : 'border-gray-200 bg-white/90 text-gray-900'} backdrop-blur-md`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-base bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">FIFAPredict</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[9px] font-bold">
            {healthStatus === 'Online' ? (
              <>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                  🟢 API Online
                </span>
                <span className={`px-2 py-0.5 rounded-full ${isModelLoaded ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {isModelLoaded ? '🟢 Model Loaded' : '🔴 Model Not Loaded'}
                </span>
              </>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                🔴 API Offline ({healthStatus})
              </span>
            )}
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg bg-gray-800/40 border border-gray-800/60 text-gray-400 hover:text-white transition-all shrink-0"
            title="Toggle Light/Dark Mode"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex justify-around items-center z-50 ${darkMode ? 'border-gray-800 bg-[#151D30]/95 text-white' : 'border-gray-200 bg-white/95 text-gray-900'} backdrop-blur-md`}>
        <button 
          onClick={() => setActiveTab('home')} 
          className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${activeTab === 'home' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <HomeIcon className="w-5 h-5" />
          Home
        </button>
        <button 
          onClick={() => setActiveTab('h2h')} 
          className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${activeTab === 'h2h' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Activity className="w-5 h-5" />
          Predict
        </button>
        <button 
          onClick={() => setActiveTab('simulator')} 
          className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${activeTab === 'simulator' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Trophy className="w-5 h-5" />
          Simulator
        </button>
        <button 
          onClick={() => setActiveTab('wc2026')} 
          className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${activeTab === 'wc2026' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Trophy className="w-5 h-5 text-amber-500" />
          2026 WC
        </button>
        <button 
          onClick={() => setActiveTab('team')} 
          className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${activeTab === 'team' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Users className="w-5 h-5" />
          Teams
        </button>
        <button 
          onClick={() => setActiveTab('model')} 
          className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${activeTab === 'model' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Cpu className="w-5 h-5" />
          Models
        </button>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className={`hidden md:flex md:w-64 border-r flex-col shrink-0 sticky top-0 h-screen z-40 ${darkMode ? 'border-gray-800 bg-[#151D30]/90' : 'border-gray-200 bg-white/90'} backdrop-blur-md`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Award className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-white bg-clip-text text-transparent">
                FIFAPredict
              </h1>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">AI Platform</p>
            </div>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-800/80 text-gray-400 hover:text-white transition-all shrink-0"
            title="Toggle Light/Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('home')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <HomeIcon className="w-5 h-5" />
            Home
          </button>
          <button 
            onClick={() => setActiveTab('h2h')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'h2h' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <Activity className="w-5 h-5" />
            Head-to-Head
          </button>
          <button 
            onClick={() => setActiveTab('simulator')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'simulator' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <Trophy className="w-5 h-5" />
            Simulator
          </button>
          <button 
            onClick={() => setActiveTab('wc2026')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'wc2026' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <Trophy className="w-5 h-5 text-amber-500" />
            2026 World Cup
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'team' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <Users className="w-5 h-5" />
            Team Analytics
          </button>
          <button 
            onClick={() => setActiveTab('model')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'model' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <Cpu className="w-5 h-5" />
            Model Insights
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${activeTab === 'settings' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'}`}
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="p-4 border-t border-gray-800/60 text-[10px] space-y-2">
          <div className="flex flex-col gap-1.5 font-bold">
            {healthStatus === 'Online' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">API Connection:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    🟢 API Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Model Status:</span>
                  <span className={`px-2 py-0.5 rounded-full ${isModelLoaded ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {isModelLoaded ? '🟢 Model Loaded' : '🔴 Model Not Loaded'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">API Connection:</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                  🔴 API Offline
                </span>
              </div>
            )}
          </div>
          <div className="text-gray-500 text-[9px] pt-1">Version: 1.0.0-production</div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 pb-24 md:pb-8">
        
        {/* --- VIEW: HOME --- */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner */}
            <div className="p-8 bg-gradient-to-r from-[#1E293B] to-[#0F172A] rounded-3xl border border-gray-800/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight">AI-Powered Match Outcome Engine</h2>
                <p className="text-gray-400 text-base max-w-xl">
                  Simulate fixtures, analyze historical team forms, and evaluate tournament brackets with our tuned CatBoost machine learning model.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('h2h')}
                className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all text-center shrink-0"
              >
                Launch Predictor
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <h3 className="text-gray-400 font-bold text-sm mb-2">Total Historic Matches</h3>
                <p className="text-4xl font-black text-white">49,481</p>
                <div className="absolute right-4 bottom-4 text-blue-500/10">
                  <TrendingUp className="w-16 h-16" />
                </div>
              </div>
              <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <h3 className="text-gray-400 font-bold text-sm mb-2">Algorithm Test Accuracy</h3>
                <p className="text-4xl font-black text-emerald-400">59.01%</p>
                <div className="absolute right-4 bottom-4 text-emerald-500/10">
                  <CheckCircle className="w-16 h-16" />
                </div>
              </div>
              <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <h3 className="text-gray-400 font-bold text-sm mb-2">Active World Cup Squads</h3>
                <p className="text-4xl font-black text-blue-400">32</p>
                <div className="absolute right-4 bottom-4 text-blue-500/10">
                  <Globe2 className="w-16 h-16" />
                </div>
              </div>
            </div>

            {/* News and updates */}
            <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Model Validation Notice
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Matches are simulated chronologically. All team strength differences (ELO, FIFA points), historical H2H records, and 5-match rolling forms are computed strictly from pre-match data to completely avoid temporal data leakage.
              </p>
            </div>
          </div>
        )}

        {/* --- VIEW: HEAD-TO-HEAD PREDICTOR --- */}
        {activeTab === 'h2h' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Form Column */}
            <div className="lg:col-span-1 bg-[#151D30] border border-gray-800 p-6 rounded-3xl shadow-xl space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sliders className="text-blue-500" />
                  Configure Match
                </h2>
                <p className="text-xs text-gray-400 font-medium">Define parameters for the simulation engine</p>
              </div>

              <form onSubmit={handleH2hPredict} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Home Team</label>
                  <input 
                    type="text"
                    list="teams-datalist"
                    value={homeTeam} 
                    onChange={e => setHomeTeam(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                    placeholder="Search/Select Home Team..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Away Team</label>
                  <input 
                    type="text"
                    list="teams-datalist"
                    value={awayTeam} 
                    onChange={e => setAwayTeam(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                    placeholder="Search/Select Away Team..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Tournament Name</label>
                  <input 
                    type="text" 
                    value={tournament}
                    onChange={e => setTournament(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-xl">
                  <span className="text-sm font-semibold text-gray-300">Neutral Ground</span>
                  <input 
                    type="checkbox" 
                    checked={neutralGround}
                    onChange={e => setNeutralGround(e.target.checked)}
                    className="w-5 h-5 accent-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-xl">
                  <span className="text-sm font-semibold text-gray-300">Knockout Stage Tie-breaker</span>
                  <input 
                    type="checkbox" 
                    checked={knockout}
                    onChange={e => setKnockout(e.target.checked)}
                    className="w-5 h-5 accent-blue-600"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={h2hLoading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {h2hLoading && <RefreshCw className="w-5 h-5 animate-spin" />}
                  {h2hLoading ? 'Running Simulation...' : 'Simulate Match'}
                </button>
              </form>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-2 bg-[#151D30] border border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col justify-center min-h-[400px]">
              {h2hLoading ? (
                <div className="text-center space-y-4 py-12 animate-fade-in">
                  <div className="text-6xl animate-spin inline-block" style={{ animationDuration: '1.2s' }}>⚽</div>
                  <p className="font-extrabold text-lg text-blue-400">Simulating Match Outcomes...</p>
                  <p className="text-xs text-gray-500 font-semibold">Running CatBoost machine learning model...</p>
                </div>
              ) : h2hResult ? (
                <div className="space-y-8 animate-fade-in">
                  <div className="text-center space-y-1">
                    <h3 className="text-sm text-gray-400 uppercase font-bold tracking-widest">Match Winner Prediction</h3>
                    <h2 className="text-4xl font-extrabold text-blue-400 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
                      <span>{getFlagEmoji(h2hResult.predicted_winner)}</span>
                      <span>{h2hResult.predicted_winner}</span>
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold">Engine: {h2hResult.model_version}</p>
                  </div>
 
                  {/* Probabilities Progress Bar */}
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-bold items-center">
                      <span className="text-blue-400 flex items-center gap-1.5">
                        <span>{getFlagEmoji(homeTeam)}</span>
                        <span>{homeTeam}</span>
                        <span>({(h2hResult.home_win_prob * 100).toFixed(1)}%)</span>
                      </span>
                      <span className="text-gray-400">Draw ({(h2hResult.draw_prob * 100).toFixed(1)}%)</span>
                      <span className="text-indigo-400 flex items-center gap-1.5">
                        <span>({(h2hResult.away_win_prob * 100).toFixed(1)}%)</span>
                        <span>{awayTeam}</span>
                        <span>{getFlagEmoji(awayTeam)}</span>
                      </span>
                    </div>
                    
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className="bg-blue-500 transition-all duration-500" style={{ width: `${h2hResult.home_win_prob * 100}%` }}></div>
                      <div className="bg-gray-600 transition-all duration-500" style={{ width: `${h2hResult.draw_prob * 100}%` }}></div>
                      <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${h2hResult.away_win_prob * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Shootout Section */}
                  {h2hResult.shootout_analysis && (
                    <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                      <h4 className="text-amber-400 font-extrabold text-sm flex items-center gap-2 border-b border-amber-500/20 pb-2">
                        <Award className="w-4 h-4" />
                        Penalty Shootout Analysis
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                          <span className="block text-xs text-gray-400 font-semibold uppercase">Home Penalty Win %</span>
                          <span className="text-lg font-bold text-white flex items-center gap-1">
                            <span>{getFlagEmoji(homeTeam)}</span>
                            <span>{homeTeam}: {(h2hResult.shootout_analysis.home_win_prob * 100).toFixed(1)}%</span>
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-semibold uppercase">Away Penalty Win %</span>
                          <span className="text-lg font-bold text-white flex items-center gap-1">
                            <span>{getFlagEmoji(awayTeam)}</span>
                            <span>{awayTeam}: {(h2hResult.shootout_analysis.away_win_prob * 100).toFixed(1)}%</span>
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-semibold uppercase">Predicted Penalty Winner</span>
                          <span className="text-lg font-bold text-amber-400 flex items-center gap-1.5">
                            <span>{getFlagEmoji(h2hResult.shootout_analysis.predicted_winner)}</span>
                            <span>{h2hResult.shootout_analysis.predicted_winner}</span>
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-semibold uppercase">Confidence Score</span>
                          <span className="text-lg font-bold text-emerald-400">
                            {(Math.max(h2hResult.shootout_analysis.home_win_prob, h2hResult.shootout_analysis.away_win_prob) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Explain Prediction Section */}
                  {h2hResult.explanation && (
                    <div className="p-6 bg-gray-800/35 border border-gray-800 rounded-2xl space-y-6">
                      <h4 className="text-blue-400 font-extrabold text-sm flex items-center gap-2 border-b border-gray-800/80 pb-2">
                        <Cpu className="w-4 h-4 text-blue-500" />
                        AI Explanation Model Insights
                      </h4>

                      {/* Comparison Metrics Table */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-300">
                        <div className="bg-[#0B0F19] p-3.5 border border-gray-800/40 rounded-xl space-y-1">
                          <span className="text-gray-500 uppercase tracking-wider text-[10px]">Ratings Comparison</span>
                          <div className="flex justify-between">
                            <span>Elo: {homeTeam} ({h2hResult.explanation.home_elo}) vs {awayTeam} ({h2hResult.explanation.away_elo})</span>
                            <span className="text-blue-400 font-bold">Diff: {h2hResult.explanation.elo_diff > 0 ? `+${h2hResult.explanation.elo_diff}` : h2hResult.explanation.elo_diff}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-800/40 mt-1">
                            <span>FIFA Rank: {homeTeam} (#{h2hResult.explanation.home_fifa_rank}) vs {awayTeam} (#{h2hResult.explanation.away_fifa_rank})</span>
                            <span className="text-indigo-400 font-bold">Diff: {h2hResult.explanation.rank_diff > 0 ? `+${h2hResult.explanation.rank_diff}` : h2hResult.explanation.rank_diff}</span>
                          </div>
                        </div>

                        <div className="bg-[#0B0F19] p-3.5 border border-gray-800/40 rounded-xl space-y-1">
                          <span className="text-gray-500 uppercase tracking-wider text-[10px]">Historical H2H & Form</span>
                          <div className="flex justify-between">
                            <span>H2H Record: {homeTeam} {h2hResult.explanation.h2h_home_wins}W - {h2hResult.explanation.h2h_draws}D - {h2hResult.explanation.h2h_away_wins}L {awayTeam}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-800/40 mt-1">
                            <span>Recent Form Win Rate: {homeTeam} ({(h2hResult.explanation.home_last5_win_rate * 100).toFixed(0)}%) vs {awayTeam} ({(h2hResult.explanation.away_last5_win_rate * 100).toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>

                      {/* SHAP Explanation Visual Chart */}
                      <div className="space-y-3">
                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Feature Contributions (SHAP Values)</span>
                        <div className="h-48 w-full bg-[#0B0F19] border border-gray-800/80 p-2.5 rounded-xl">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={Object.keys(h2hResult.explanation.shap_values).map(k => ({
                                name: k,
                                Contribution: h2hResult.explanation.shap_values[k]
                              }))}
                              layout="vertical"
                            >
                              <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 9 }} />
                              <YAxis dataKey="name" type="category" stroke="#6B7280" tick={{ fontSize: 9 }} width={120} />
                              <Tooltip 
                                contentStyle={darkMode ? { backgroundColor: '#151D30', borderColor: '#1F2937', borderRadius: '12px', color: '#fff' } : { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                                itemStyle={darkMode ? { color: '#D1D5DB' } : { color: '#374151' }}
                                labelStyle={darkMode ? { color: '#F9FAFB', fontWeight: 'bold' } : { color: '#111827', fontWeight: 'bold' }}
                              />
                              <Bar dataKey="Contribution" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <span className="block text-[10px] text-gray-500 leading-normal font-semibold">
                          Positive values push model prediction in favor of {homeTeam}, negative values push in favor of {awayTeam}.
                        </span>
                      </div>

                      {/* Knockout Penalty Explanation */}
                      {h2hResult.shootout_analysis && (
                        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2 text-xs text-gray-300">
                          <span className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">Penalty Outcome Explanation</span>
                          <p className="leading-relaxed">
                            Shootout winner favor <strong className="text-amber-400">{h2hResult.shootout_analysis.predicted_winner}</strong> is calculated from ELO strength rating difference ({h2hResult.explanation.elo_diff > 0 ? `+${h2hResult.explanation.elo_diff}` : h2hResult.explanation.elo_diff} Elo points), FIFA rank difference ({h2hResult.explanation.rank_diff > 0 ? `+${h2hResult.explanation.rank_diff}` : h2hResult.explanation.rank_diff}), and historical shootout win frequencies. Shootout win probability confidence score: <strong className="text-emerald-400">{(Math.max(h2hResult.shootout_analysis.home_win_prob, h2hResult.shootout_analysis.away_win_prob) * 100).toFixed(1)}%</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 space-y-2">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto animate-bounce" />
                  <p className="font-semibold text-base">Prediction results will be displayed here.</p>
                  <p className="text-xs text-gray-600">Select teams and run the simulation engine.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VIEW: KNOCKOUT TOURNAMENT SIMULATOR --- */}
        {activeTab === 'simulator' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="text-blue-500" />
                  FIFA World Cup 2026 Knockout Tournament Simulator
                </h2>
                <p className="text-xs text-gray-400 font-medium">Predict matches individually, simulate the entire bracket, or run a Monte Carlo analysis</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAutoSimulate}
                  disabled={simLoading || predictingFixtureId !== null}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-black text-white transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                >
                  <Play className={`w-4 h-4 ${simLoading ? 'animate-pulse' : ''}`} />
                  {simLoading ? 'Simulating...' : '🏆 Simulate Tournament'}
                </button>
                <button
                  onClick={handleMonteCarloSimulate}
                  disabled={monteCarloLoading}
                  className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-black text-indigo-400 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className={`w-4 h-4 ${monteCarloLoading ? 'animate-spin' : ''}`} />
                  {monteCarloLoading ? 'Calculating...' : '🎲 Simulate 1000 Tournaments'}
                </button>
                <button
                  onClick={handleRandomizeFixtures}
                  className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-black text-blue-400 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                  Shuffle Fixtures
                </button>
                <button
                  onClick={handleResetSimulator}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-black text-gray-400 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>

            {/* Interactive Tournament Bracket */}
            <div className="overflow-x-auto pb-6 scrollbar-thin select-none relative bg-[#151D30]/20 border border-gray-800/40 p-6 rounded-3xl backdrop-blur-md">
              {(simLoading || monteCarloLoading) && (
                <div className="absolute inset-0 bg-[#0B0F19]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 rounded-3xl">
                  <div className="text-7xl animate-spin" style={{ animationDuration: '1.2s' }}>⚽</div>
                  <p className="text-xl font-extrabold text-blue-400">
                    {simLoading ? 'Simulating Tournament Bracket...' : 'Running 1,000 Monte Carlo Simulations...'}
                  </p>
                  <p className="text-xs text-gray-400 font-semibold">Please wait while the CatBoost engine computes probabilities.</p>
                </div>
              )}
              <div className="flex gap-0 justify-between min-w-[1300px] h-[920px] relative">
                
                {/* Round of 16 */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {bracket.r16.map((m: any) => {
                    const pred = simMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-500/5 cursor-pointer' : 'border-gray-800'}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: R16 to QF */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    {/* Pair 1 */}
                    <path d="M 0 57 L 20 57 L 20 115 L 40 115" className={simMatches["1"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 172 L 20 172 L 20 115" className={simMatches["2"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 2 */}
                    <path d="M 0 287 L 20 287 L 20 345 L 40 345" className={simMatches["3"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 402 L 20 402 L 20 345" className={simMatches["4"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 3 */}
                    <path d="M 0 517 L 20 517 L 20 575 L 40 575" className={simMatches["5"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 632 L 20 632 L 20 575" className={simMatches["6"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 4 */}
                    <path d="M 0 747 L 20 747 L 20 805 L 40 805" className={simMatches["7"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 862 L 20 862 L 20 805" className={simMatches["8"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Quarter Finals */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {bracket.qf.map((m: any) => {
                    const pred = simMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    const isPlaceholder = m.homeTeam.includes("Winner") || m.awayTeam.includes("Winner");
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-500/5 cursor-pointer' : 'border-gray-800'} ${isPlaceholder ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span className={m.homeTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span className={m.awayTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && !isPlaceholder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: QF to SF */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    {/* Pair 1 */}
                    <path d="M 0 115 L 20 115 L 20 230 L 40 230" className={simMatches["qf1"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 345 L 20 345 L 20 230" className={simMatches["qf2"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 2 */}
                    <path d="M 0 575 L 20 575 L 20 690 L 40 690" className={simMatches["qf3"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 805 L 20 805 L 20 690" className={simMatches["qf4"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Semi Finals */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {bracket.sf.map((m: any) => {
                    const pred = simMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    const isPlaceholder = m.homeTeam.includes("Winner") || m.awayTeam.includes("Winner");
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-500/5 cursor-pointer' : 'border-gray-800'} ${isPlaceholder ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span className={m.homeTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span className={m.awayTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && !isPlaceholder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: SF to Final */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 0 230 L 20 230 L 20 460 L 40 460" className={simMatches["sf1"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 690 L 20 690 L 20 460" className={simMatches["sf2"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Final */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {bracket.f1.map((m: any) => {
                    const pred = simMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    const isPlaceholder = m.homeTeam.includes("Winner") || m.awayTeam.includes("Winner");
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-4.5 rounded-3xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-amber-500/40 hover:border-amber-400 shadow-xl shadow-amber-500/5 cursor-pointer' : 'border-gray-800'} ${isPlaceholder ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-2">
                          <span>Final</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-2.5 font-bold text-xs">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{getFlagEmoji(m.homeTeam)}</span>
                              <span className={m.homeTeam.includes("Winner") ? 'text-gray-500 italic font-semibold' : ''}>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{getFlagEmoji(m.awayTeam)}</span>
                              <span className={m.awayTeam.includes("Winner") ? 'text-gray-500 italic font-semibold' : ''}>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && !isPlaceholder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict Champion'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: Final to Champ */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 0 460 L 40 460" className={simMatches["f1"] ? "text-amber-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Champion */}
                <div className="flex flex-col justify-center items-center w-[200px] z-10">
                  {simMatches['champ'] ? (
                    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/10 backdrop-blur-md border border-amber-500/30 p-6 rounded-3xl text-center space-y-4 shadow-xl shadow-amber-500/5 border-amber-400/40 relative overflow-hidden group hover:scale-[1.03] transition-all duration-300 animate-bounce">
                      {/* Confetti element overlay effect */}
                      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300 via-transparent to-transparent animate-pulse"></div>
                      <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                      <span className="text-4xl block">{getFlagEmoji(simMatches['champ'].winner)}</span>
                      <h3 className="font-black text-white text-lg tracking-tight leading-tight">{simMatches['champ'].winner}</h3>
                      <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">World Cup Champion</p>
                    </div>
                  ) : (
                    <div className="bg-[#0B0F19]/40 border-2 border-dashed border-gray-800 p-8 rounded-3xl text-center text-gray-500 text-xs font-black w-full">
                      Trophy Pending
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Bottom Champion / Path Cards and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Champion summary info */}
              {simMatches['champ'] && (
                <div className="lg:col-span-1 bg-[#151D30] border border-gray-800 p-6 rounded-3xl space-y-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    🏆 FIFA World Cup Champion
                  </h3>
                  <div className="flex items-center gap-4 bg-[#0B0F19] p-4 border border-gray-800/60 rounded-2xl">
                    <span className="text-5xl">{getFlagEmoji(simMatches['champ'].winner)}</span>
                    <div>
                      <h4 className="text-lg font-black text-white">{simMatches['champ'].winner}</h4>
                      <p className="text-xs text-gray-400 font-bold">Winning Prob: {(simMatches['champ'].winningProb * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-400 font-bold">Runner-up: {simMatches['champ'].runnerUp}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest">Champion Tournament Path</span>
                    <div className="space-y-2 text-xs font-semibold text-gray-300">
                      {getChampionPath(simMatches['champ'].winner).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#0B0F19]/40 p-2.5 rounded-xl border border-gray-800/40">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Monte Carlo Results list and charts */}
              {monteCarloResults && (
                <div className="lg:col-span-2 bg-[#151D30] border border-gray-800 p-6 rounded-3xl space-y-5">
                  <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Monte Carlo simulation (1000 Runs)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Charts representation */}
                    <div className="h-64 bg-[#0B0F19] p-3 border border-gray-800/60 rounded-2xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monteCarloResults.slice(0, 8)}>
                          <XAxis dataKey="team" stroke="#6B7280" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 9 }} />
                          <Tooltip 
                            contentStyle={darkMode ? { backgroundColor: '#151D30', borderColor: '#1F2937', borderRadius: '12px', color: '#fff' } : { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                            itemStyle={darkMode ? { color: '#D1D5DB' } : { color: '#374151' }}
                            labelStyle={darkMode ? { color: '#F9FAFB', fontWeight: 'bold' } : { color: '#111827', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="champion" name="Champion %" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown Listing */}
                    <div className="overflow-y-auto max-h-64 scrollbar-thin space-y-1.5 pr-2">
                      <div className="grid grid-cols-5 text-[9px] text-gray-500 font-extrabold uppercase tracking-widest px-2 mb-1.5">
                        <span className="col-span-2">Team</span>
                        <span className="text-center">QF %</span>
                        <span className="text-center">SF %</span>
                        <span className="text-center">Champ %</span>
                      </div>
                      {monteCarloResults.map((r: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-5 items-center bg-[#0B0F19]/40 border border-gray-800/40 p-2.5 rounded-xl text-xs font-semibold text-gray-200">
                          <span className="col-span-2 flex items-center gap-1.5 font-bold">
                            <span>{getFlagEmoji(r.team)}</span>
                            <span>{r.team}</span>
                          </span>
                          <span className="text-center">{r.qf}%</span>
                          <span className="text-center">{r.sf}%</span>
                          <span className="text-center text-amber-400 font-black">{r.champion}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VIEW: 2026 WORLD CUP DEDICATED FIXED TAB --- */}
        {activeTab === 'wc2026' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="text-amber-500" />
                  2026 World Cup Bracket
                </h2>
                <p className="text-xs text-gray-400 font-medium">Predict matches individually, simulate the entire bracket, or run a Monte Carlo analysis. Shuffling is disabled for this tournament.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleWcAutoSimulate}
                  disabled={simLoading || predictingFixtureId !== null}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-black text-white transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                >
                  <Play className={`w-4 h-4 ${simLoading ? 'animate-pulse' : ''}`} />
                  {simLoading ? 'Simulating...' : '🏆 Simulate Tournament'}
                </button>
                <button
                  onClick={handleWcMonteCarloSimulate}
                  disabled={monteCarloLoading}
                  className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-black text-indigo-400 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className={`w-4 h-4 ${monteCarloLoading ? 'animate-spin' : ''}`} />
                  {monteCarloLoading ? 'Calculating...' : '🎲 Simulate 1000 Tournaments'}
                </button>
                <button
                  onClick={handleWcResetSimulator}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-black text-gray-400 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>

            {/* Interactive Tournament Bracket */}
            <div className="overflow-x-auto pb-6 scrollbar-thin select-none relative bg-[#151D30]/20 border border-gray-800/40 p-6 rounded-3xl backdrop-blur-md">
              {(simLoading || monteCarloLoading) && (
                <div className="absolute inset-0 bg-[#0B0F19]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 rounded-3xl">
                  <div className="text-7xl animate-spin" style={{ animationDuration: '1.2s' }}>⚽</div>
                  <p className="text-xl font-extrabold text-blue-400">
                    {simLoading ? 'Simulating Tournament Bracket...' : 'Running 1,000 Monte Carlo Simulations...'}
                  </p>
                  <p className="text-xs text-gray-400 font-semibold">Please wait while the CatBoost engine computes probabilities.</p>
                </div>
              )}
              <div className="flex gap-0 justify-between min-w-[1300px] h-[920px] relative">
                
                {/* Round of 16 */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {wcBracket.r16.map((m: any) => {
                    const pred = wcSimMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-500/5 cursor-pointer' : 'border-gray-800/80 hover:border-gray-700'}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleWcSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: R16 to QF */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    {/* Pair 1 */}
                    <path d="M 0 57 L 20 57 L 20 115 L 40 115" className={wcSimMatches["1"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 172 L 20 172 L 20 115" className={wcSimMatches["2"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 2 */}
                    <path d="M 0 287 L 20 287 L 20 345 L 40 345" className={wcSimMatches["3"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 402 L 20 402 L 20 345" className={wcSimMatches["4"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 3 */}
                    <path d="M 0 517 L 20 517 L 20 575 L 40 575" className={wcSimMatches["5"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 632 L 20 632 L 20 575" className={wcSimMatches["6"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 4 */}
                    <path d="M 0 747 L 20 747 L 20 805 L 40 805" className={wcSimMatches["7"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 862 L 20 862 L 20 805" className={wcSimMatches["8"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Quarter Finals */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {wcBracket.qf.map((m: any) => {
                    const pred = wcSimMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    const isPlaceholder = m.homeTeam.includes("Winner") || m.awayTeam.includes("Winner");
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-500/5 cursor-pointer' : 'border-gray-800'} ${isPlaceholder ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span className={m.homeTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span className={m.awayTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && !isPlaceholder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleWcSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: QF to SF */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    {/* Pair 1 */}
                    <path d="M 0 115 L 20 115 L 20 230 L 40 230" className={wcSimMatches["qf1"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 345 L 20 345 L 20 230" className={wcSimMatches["qf2"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    
                    {/* Pair 2 */}
                    <path d="M 0 575 L 20 575 L 20 690 L 40 690" className={wcSimMatches["qf3"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 805 L 20 805 L 20 690" className={wcSimMatches["qf4"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Semi Finals */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {wcBracket.sf.map((m: any) => {
                    const pred = wcSimMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    const isPlaceholder = m.homeTeam.includes("Winner") || m.awayTeam.includes("Winner");
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-500/5 cursor-pointer' : 'border-gray-800'} ${isPlaceholder ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span className={m.homeTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span className={m.awayTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && !isPlaceholder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleWcSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: SF to Final */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 0 230 L 20 230 L 20 460 L 40 460" className={wcSimMatches["sf1"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                    <path d="M 0 690 L 20 690 L 20 460" className={wcSimMatches["sf2"] ? "text-indigo-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Final */}
                <div className="flex flex-col justify-around h-full w-[240px] z-10">
                  {wcBracket.f1.map((m: any) => {
                    const pred = wcSimMatches[m.id];
                    const isHomeWinner = pred && pred.winner === m.homeTeam;
                    const isAwayWinner = pred && pred.winner === m.awayTeam;
                    const isEliminatedHome = pred && pred.winner !== m.homeTeam;
                    const isEliminatedAway = pred && pred.winner !== m.awayTeam;
                    const isPlaceholder = m.homeTeam.includes("Winner") || m.awayTeam.includes("Winner");
                    return (
                      <div
                        key={m.id}
                        onClick={() => pred && setActiveModalMatch({ ...m, pred })}
                        className={`bg-[#0B0F19]/60 backdrop-blur-md border p-3 rounded-2xl transition-all duration-300 relative group hover:scale-[1.02] ${pred ? 'border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-500/5 cursor-pointer' : 'border-gray-800'} ${isPlaceholder ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-center text-[7px] text-gray-500 font-black uppercase tracking-wider mb-1.5">
                          <span>Match {m.id}</span>
                          <span>{m.venue}</span>
                        </div>
                        <div className="space-y-1.5 font-bold text-[11px]">
                          <div className={`flex justify-between items-center transition-all ${isEliminatedHome ? 'text-gray-600 line-through' : isHomeWinner ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.homeTeam)}</span>
                              <span className={m.homeTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.homeTeam}</span>
                            </span>
                            {pred && <span>{(pred.home_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                          <div className={`flex justify-between items-center transition-all ${isEliminatedAway ? 'text-gray-600 line-through' : isAwayWinner ? 'text-indigo-400 font-black' : 'text-gray-300'}`}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm">{getFlagEmoji(m.awayTeam)}</span>
                              <span className={m.awayTeam.includes("Winner") ? 'text-gray-500 italic font-medium' : ''}>{m.awayTeam}</span>
                            </span>
                            {pred && <span>{(pred.away_win_prob * 100).toFixed(0)}%</span>}
                          </div>
                        </div>
                        {!pred && !isPlaceholder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleWcSimulateMatch(m); }}
                            disabled={predictingFixtureId === m.id}
                            className="w-full mt-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-black transition-all"
                          >
                            {predictingFixtureId === m.id ? 'Simulating...' : 'Predict Champion'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Connectors: Final to Champ */}
                <div className="w-[40px] h-full relative pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full text-gray-800/80" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 0 460 L 40 460" className={wcSimMatches["f1"] ? "text-amber-500/50 stroke-[3px]" : ""} />
                  </svg>
                </div>

                {/* Champion */}
                <div className="flex flex-col justify-center items-center w-[200px] z-10">
                  {wcSimMatches['champ'] ? (
                    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/10 backdrop-blur-md border border-amber-500/30 p-6 rounded-3xl text-center space-y-4 shadow-xl shadow-amber-500/5 border-amber-400/40 relative overflow-hidden group hover:scale-[1.03] transition-all duration-300 animate-bounce">
                      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300 via-transparent to-transparent animate-pulse"></div>
                      <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                      <span className="text-4xl block">{getFlagEmoji(wcSimMatches['champ'].winner)}</span>
                      <h3 className="font-black text-white text-lg tracking-tight leading-tight">{wcSimMatches['champ'].winner}</h3>
                      <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">World Cup Champion</p>
                    </div>
                  ) : (
                    <div className="bg-[#0B0F19]/40 border-2 border-dashed border-gray-800 p-8 rounded-3xl text-center text-gray-500 text-xs font-black w-full">
                      Trophy Pending
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Bottom Champion / Path Cards and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Champion summary info */}
              {wcSimMatches['champ'] && (
                <div className="lg:col-span-1 bg-[#151D30] border border-gray-800 p-6 rounded-3xl space-y-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    🏆 FIFA World Cup Champion
                  </h3>
                  <div className="flex items-center gap-4 bg-[#0B0F19] p-4 border border-gray-800/60 rounded-2xl">
                    <span className="text-5xl">{getFlagEmoji(wcSimMatches['champ'].winner)}</span>
                    <div>
                      <h4 className="text-lg font-black text-white">{wcSimMatches['champ'].winner}</h4>
                      <p className="text-xs text-gray-400 font-bold">Winning Prob: {(wcSimMatches['champ'].winningProb * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-400 font-bold">Runner-up: {wcSimMatches['champ'].runnerUp}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest">Champion Tournament Path</span>
                    <div className="space-y-2 text-xs font-semibold text-gray-300">
                      {getWcChampionPath(wcSimMatches['champ'].winner).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#0B0F19]/40 p-2.5 rounded-xl border border-gray-800/40">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Monte Carlo Results list and charts */}
              {wcMonteCarloResults && (
                <div className="lg:col-span-2 bg-[#151D30] border border-gray-800 p-6 rounded-3xl space-y-5">
                  <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Monte Carlo simulation (1000 Runs)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Charts representation */}
                    <div className="h-64 bg-[#0B0F19] p-3 border border-gray-800/60 rounded-2xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={wcMonteCarloResults.slice(0, 8)}>
                          <XAxis dataKey="team" stroke="#6B7280" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 9 }} />
                          <Tooltip 
                            contentStyle={darkMode ? { backgroundColor: '#151D30', borderColor: '#1F2937', borderRadius: '12px', color: '#fff' } : { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                            itemStyle={darkMode ? { color: '#D1D5DB' } : { color: '#374151' }}
                            labelStyle={darkMode ? { color: '#F9FAFB', fontWeight: 'bold' } : { color: '#111827', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="champion" name="Champion %" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown Listing */}
                    <div className="overflow-y-auto max-h-64 scrollbar-thin space-y-1.5 pr-2">
                      <div className="grid grid-cols-5 text-[9px] text-gray-500 font-extrabold uppercase tracking-widest px-2 mb-1.5">
                        <span className="col-span-2">Team</span>
                        <span className="text-center">QF %</span>
                        <span className="text-center">SF %</span>
                        <span className="text-center">Champ %</span>
                      </div>
                      {wcMonteCarloResults.map((r: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-5 items-center bg-[#0B0F19]/40 border border-gray-800/40 p-2.5 rounded-xl text-xs font-semibold text-gray-200">
                          <span className="col-span-2 flex items-center gap-1.5 font-bold">
                            <span>{getFlagEmoji(r.team)}</span>
                            <span>{r.team}</span>
                          </span>
                          <span className="text-center">{r.qf}%</span>
                          <span className="text-center">{r.sf}%</span>
                          <span className="text-center text-amber-400 font-black">{r.champion}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- MODAL: DETAILED MATCH ANALYSIS popup --- */}
        {activeModalMatch && (
          <div className="fixed inset-0 bg-[#000]/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#151D30] border border-gray-800 max-w-2xl w-full rounded-3xl p-6 relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Detailed Match Simulation Analysis
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">{activeModalMatch.venue} | {activeModalMatch.stage?.replace('_', ' ')}</p>
                </div>
                <button
                  onClick={() => setActiveModalMatch(null)}
                  className="p-1 text-gray-500 hover:text-white rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Match Teams Row */}
              <div className="flex items-center justify-between gap-4 bg-[#0B0F19] p-4 border border-gray-800/60 rounded-2xl">
                <div className="flex-1 text-center font-bold text-lg flex flex-col items-center gap-1">
                  <span className="text-4xl">{getFlagEmoji(activeModalMatch.homeTeam)}</span>
                  <span>{activeModalMatch.homeTeam}</span>
                  {activeModalMatch.pred && (
                    <span className="text-xs text-blue-400">{(activeModalMatch.pred.home_win_prob * 100).toFixed(0)}% Win Chance</span>
                  )}
                </div>
                <div className="px-3.5 py-1.5 bg-[#151D30] border border-gray-800 rounded-xl text-xs font-black text-gray-500">
                  VS
                </div>
                <div className="flex-1 text-center font-bold text-lg flex flex-col items-center gap-1">
                  <span className="text-4xl">{getFlagEmoji(activeModalMatch.awayTeam)}</span>
                  <span>{activeModalMatch.awayTeam}</span>
                  {activeModalMatch.pred && (
                    <span className="text-xs text-indigo-400">{(activeModalMatch.pred.away_win_prob * 100).toFixed(0)}% Win Chance</span>
                  )}
                </div>
              </div>

              {/* Simulation explanation model metadata */}
              {activeModalMatch.pred && (
                <div className="space-y-4">
                  {/* Model metadata & Shootout Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-[#0B0F19] p-4 border border-gray-800/40 rounded-xl space-y-2">
                      <span className="block font-black text-gray-500 uppercase tracking-widest text-[9px]">Match Metrics Comparison</span>
                      <div className="flex justify-between font-semibold">
                        <span>Fifa Rankings:</span>
                        <span>{activeModalMatch.homeTeam} (#{activeModalMatch.pred.explanation.home_fifa_rank}) vs {activeModalMatch.awayTeam} (#{activeModalMatch.pred.explanation.away_fifa_rank})</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Elo Ratings:</span>
                        <span>{activeModalMatch.pred.explanation.home_elo} vs {activeModalMatch.pred.explanation.away_elo}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Elo Difference:</span>
                        <span className="text-blue-400">{activeModalMatch.pred.explanation.elo_diff} points</span>
                      </div>
                    </div>

                    <div className="bg-[#0B0F19] p-4 border border-gray-800/40 rounded-xl space-y-2">
                      <span className="block font-black text-gray-500 uppercase tracking-widest text-[9px]">Recent Form & Head-to-Head</span>
                      <div className="flex justify-between font-semibold">
                        <span>H2H Record:</span>
                        <span>{activeModalMatch.homeTeam} {activeModalMatch.pred.explanation.h2h_home_wins}W - {activeModalMatch.pred.explanation.h2h_draws}D - {activeModalMatch.pred.explanation.h2h_away_wins}L {activeModalMatch.awayTeam}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Recent Win Rate:</span>
                        <span>{activeModalMatch.homeTeam} ({(activeModalMatch.pred.explanation.home_last5_win_rate * 100).toFixed(0)}%) vs {activeModalMatch.awayTeam} ({(activeModalMatch.pred.explanation.away_last5_win_rate * 100).toFixed(0)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Shootout analysis if predicted */}
                  {activeModalMatch.pred.shootout_analysis && (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-3 text-xs">
                      <span className="block font-black text-amber-400 uppercase tracking-widest text-[9px]">Knockout Penalty Shootout Analysis</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="block font-bold text-gray-400">{activeModalMatch.homeTeam} Record:</span>
                          <div>Wins/Losses: {activeModalMatch.pred.shootout_analysis.home_so_wins}W - {activeModalMatch.pred.shootout_analysis.home_so_losses}L</div>
                          <div>Win Rate: {(activeModalMatch.pred.shootout_analysis.home_so_win_rate * 100).toFixed(0)}%</div>
                        </div>
                        <div className="space-y-1">
                          <span className="block font-bold text-gray-400">{activeModalMatch.awayTeam} Record:</span>
                          <div>Wins/Losses: {activeModalMatch.pred.shootout_analysis.away_so_wins}W - {activeModalMatch.pred.shootout_analysis.away_so_losses}L</div>
                          <div>Win Rate: {(activeModalMatch.pred.shootout_analysis.away_so_win_rate * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-amber-500/10 font-bold mt-1">
                        <span>Predicted Shootout Winner Favorite: <strong className="text-amber-400">{activeModalMatch.pred.shootout_analysis.predicted_winner}</strong></span>
                        <span className="text-emerald-400 font-extrabold">Confidence: {(Math.max(activeModalMatch.pred.shootout_analysis.home_win_prob, activeModalMatch.pred.shootout_analysis.away_win_prob) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}

                  {/* SHAP Chart */}
                  <div className="space-y-3.5">
                    <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">AI Simulation Model - Feature Importance Contributions</span>
                    <div className="h-48 w-full bg-[#0B0F19] border border-gray-800/80 p-2 rounded-xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.keys(activeModalMatch.pred.explanation.shap_values).map(k => ({
                            name: k.replace('_', ' '),
                            Contribution: activeModalMatch.pred.explanation.shap_values[k]
                          }))}
                          layout="vertical"
                        >
                          <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 9 }} />
                          <YAxis dataKey="name" type="category" stroke="#6B7280" tick={{ fontSize: 8 }} width={120} />
                          <Tooltip />
                          <Bar dataKey="Contribution" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-gray-800">
                <button
                  onClick={() => setActiveModalMatch(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-black text-white transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: TEAM ANALYTICS --- */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header with Mode Toggles */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="text-blue-500" />
                  Team Analytics
                </h2>
                <p className="text-xs text-gray-400 font-medium">Historical match metrics and ratings trend</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-[#0B0F19] p-1 rounded-xl border border-gray-800">
                  <button 
                    onClick={() => setAnalyticsMode('single')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${analyticsMode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Single Team
                  </button>
                  <button 
                    onClick={() => setAnalyticsMode('h2h_compare')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${analyticsMode === 'h2h_compare' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    H2H Compare
                  </button>
                </div>

                {analyticsMode === 'single' ? (
                  <input 
                    type="text"
                    list="teams-datalist"
                    value={selectedTeam} 
                    onChange={e => setSelectedTeam(e.target.value)}
                    className="bg-[#151D30] border border-gray-800 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none w-48 text-center"
                    placeholder="Search/Select Team..."
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      list="teams-datalist"
                      value={selectedTeam} 
                      onChange={e => setSelectedTeam(e.target.value)}
                      className="bg-[#151D30] border border-gray-800 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none w-36 text-center"
                      placeholder="Select Team 1..."
                    />
                    <span className="text-gray-500 text-xs font-bold">VS</span>
                    <input 
                      type="text"
                      list="teams-datalist"
                      value={compareTeam} 
                      onChange={e => setCompareTeam(e.target.value)}
                      className="bg-[#151D30] border border-gray-800 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none w-36 text-center"
                      placeholder="Select Team 2..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mode 1: Single Team Mode */}
            {analyticsMode === 'single' && (
              teamLoading ? (
                <div className="h-64 bg-[#151D30] border border-gray-800 rounded-2xl animate-pulse flex items-center justify-center text-gray-500 font-bold">
                  Loading Team Analytics...
                </div>
              ) : teamStats ? (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase">Elo Rating</span>
                      <p className="text-2xl font-black text-white">{teamStats.current_elo}</p>
                    </div>
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase">FIFA Ranking</span>
                      <p className="text-2xl font-black text-blue-400">#{teamStats.fifa_rank}</p>
                    </div>
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase">FIFA Points</span>
                      <p className="text-2xl font-black text-indigo-400">{teamStats.fifa_points}</p>
                    </div>
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase">Goal Difference</span>
                      <p className="text-2xl font-black text-emerald-400">{teamStats.goal_difference > 0 ? `+${teamStats.goal_difference}` : teamStats.goal_difference}</p>
                    </div>
                  </div>

                  {/* Ratings Trend Charts (Line Charts) */}
                  <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/60 pb-3">
                      <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">Ratings Trajectory History</h3>
                      
                      {/* Year filter toggles */}
                      <div className="flex bg-[#0B0F19] p-0.5 rounded-lg border border-gray-800">
                        {[2, 5, 10, 99].map(yr => (
                          <button
                            key={yr}
                            onClick={() => setHistoryYears(yr)}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${historyYears === yr ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          >
                            {yr === 99 ? 'All' : `${yr}Y`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Elo History Chart */}
                      <div className="space-y-2">
                        <span className="text-xs text-gray-400 font-bold">Elo Rating History</span>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(() => {
                              if (!teamStats.elo_history) return [];
                              if (historyYears === 99) return teamStats.elo_history;
                              const cutoffYear = new Date().getFullYear() - historyYears;
                              return teamStats.elo_history.filter((i: any) => new Date(i.date).getFullYear() >= cutoffYear);
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                              <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 9 }} />
                              <YAxis stroke="#6B7280" tick={{ fontSize: 9 }} domain={['dataMin - 50', 'dataMax + 50']} />
                              <Tooltip />
                              <Line type="monotone" dataKey="elo" stroke="#3B82F6" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* FIFA Rank History Chart */}
                      <div className="space-y-2">
                        <span className="text-xs text-gray-400 font-bold">FIFA Ranking History (Inverted)</span>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(() => {
                              if (!teamStats.fifa_rank_history) return [];
                              if (historyYears === 99) return teamStats.fifa_rank_history;
                              const cutoffYear = new Date().getFullYear() - historyYears;
                              return teamStats.fifa_rank_history.filter((i: any) => new Date(i.date).getFullYear() >= cutoffYear);
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                              <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 9 }} />
                              <YAxis stroke="#6B7280" tick={{ fontSize: 9 }} reversed />
                              <Tooltip />
                              <Line type="monotone" dataKey="rank" stroke="#EF4444" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Core Distributions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Outcome Distribution Pie Chart */}
                    <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
                      <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">Win Percentage Breakdown</h3>
                      
                      <div className="h-48 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Wins', value: teamStats.win_rate },
                                { name: 'Draws', value: teamStats.draw_rate },
                                { name: 'Losses', value: teamStats.loss_rate }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10B981" />
                              <Cell fill="#6B7280" />
                              <Cell fill="#EF4444" />
                            </Pie>
                            <Tooltip 
                              formatter={(v: any) => `${(v * 100).toFixed(1)}%`}
                              contentStyle={darkMode ? { backgroundColor: '#151D30', borderColor: '#1F2937', borderRadius: '12px', color: '#fff' } : { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                              itemStyle={darkMode ? { color: '#D1D5DB' } : { color: '#374151' }}
                              labelStyle={darkMode ? { color: '#F9FAFB', fontWeight: 'bold' } : { color: '#111827', fontWeight: 'bold' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex justify-between text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>Wins ({(teamStats.win_rate * 100).toFixed(1)}%)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-gray-500 rounded-full"></span>Draws ({(teamStats.draw_rate * 100).toFixed(1)}%)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>Losses ({(teamStats.loss_rate * 100).toFixed(1)}%)</span>
                      </div>
                    </div>

                    {/* Goal Distribution Bar Chart */}
                    <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
                      <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">Goals Frequency distribution</h3>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={teamStats.goal_distribution}>
                            <XAxis dataKey="goals" stroke="#6B7280" />
                            <YAxis stroke="#6B7280" />
                            <Tooltip 
                              contentStyle={darkMode ? { backgroundColor: '#151D30', borderColor: '#1F2937', borderRadius: '12px', color: '#fff' } : { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                              itemStyle={darkMode ? { color: '#D1D5DB' } : { color: '#374151' }}
                              labelStyle={darkMode ? { color: '#F9FAFB', fontWeight: 'bold' } : { color: '#111827', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <span className="block text-center text-[10px] text-gray-500 font-bold">Number of matches by goals scored</span>
                    </div>

                    {/* Tournament stats and shootout */}
                    <div className="space-y-6">
                      {/* Shootout success Rate */}
                      <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-4">
                        <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
                          <Award className="w-4 h-4" />
                          Penalty Shootout Success
                        </h3>
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>Shootouts Played: <strong className="text-white">{teamStats.shootout_record.played}</strong></div>
                            <div>Wins: <strong className="text-white">{teamStats.shootout_record.wins}</strong></div>
                            <div>Losses: <strong className="text-white">{teamStats.shootout_record.losses}</strong></div>
                          </div>
                          
                          <div className="w-20 h-20 flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Wins', value: teamStats.shootout_record.wins || 1 },
                                    { name: 'Losses', value: teamStats.shootout_record.losses || 0 }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={22}
                                  outerRadius={32}
                                  dataKey="value"
                                >
                                  <Cell fill="#10B981" />
                                  <Cell fill="#EF4444" />
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <span className="absolute text-[11px] font-black text-white">
                              {teamStats.shootout_record.played > 0 ? `${(teamStats.shootout_record.win_rate * 100).toFixed(0)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Form outcomes */}
                      <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-3">
                        <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">Recent Form Timeline</h3>
                        <div className="flex gap-2 justify-center">
                          {teamStats.recent_form.map((outcome: string, idx: number) => (
                            <span 
                              key={idx} 
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                outcome === 'W' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35' : 
                                outcome === 'D' ? 'bg-gray-500/15 text-gray-400 border border-gray-500/35' : 
                                'bg-red-500/15 text-red-400 border border-red-500/35'
                              }`}
                            >
                              {outcome}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tournament Statistics Chart */}
                  <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
                    <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">Tournament Statistics (Top 5 Win Rates)</h3>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamStats.tournament_stats}>
                          <XAxis dataKey="tournament" stroke="#6B7280" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#6B7280" domain={[0, 1]} tickFormatter={(v: any) => `${(v * 100).toFixed(0)}%`} />
                          <Tooltip formatter={(v: any) => `${(v * 100).toFixed(1)}%`} />
                          <Bar dataKey="win_rate" fill="#10B981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 bg-[#151D30] rounded-2xl border border-gray-800">
                  Select a team to display analytics.
                </div>
              )
            )}

            {/* Mode 2: Head-to-Head Compare Mode */}
            {analyticsMode === 'h2h_compare' && (
              h2hStatsLoading ? (
                <div className="h-64 bg-[#151D30] border border-gray-800 rounded-2xl animate-pulse flex items-center justify-center text-gray-500 font-bold">
                  Analyzing Head-to-Head History...
                </div>
              ) : h2hStats ? (
                <div className="space-y-6">
                  {/* Quick summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase">Total H2H Matches</span>
                      <p className="text-2xl font-black text-white">{h2hStats.total_matches}</p>
                    </div>
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase flex items-center gap-1">
                        <span>{getFlagEmoji(selectedTeam)}</span>
                        <span>{selectedTeam} Wins</span>
                      </span>
                      <p className="text-2xl font-black text-emerald-400">{h2hStats.team1_wins}</p>
                    </div>
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase flex items-center gap-1">
                        <span>{getFlagEmoji(compareTeam)}</span>
                        <span>{compareTeam} Wins</span>
                      </span>
                      <p className="text-2xl font-black text-blue-400">{h2hStats.team2_wins}</p>
                    </div>
                    <div className="bg-[#151D30] border border-gray-800 p-5 rounded-2xl space-y-2">
                      <span className="text-gray-400 font-bold text-xs uppercase">Draws</span>
                      <p className="text-2xl font-black text-gray-400">{h2hStats.draws}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Wins Breakdown Chart */}
                    <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
                      <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">H2H Outcome Comparison</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: `${selectedTeam} Wins`, Wins: h2hStats.team1_wins },
                            { name: `${compareTeam} Wins`, Wins: h2hStats.team2_wins },
                            { name: 'Draws', Wins: h2hStats.draws }
                          ]}>
                            <XAxis dataKey="name" stroke="#6B7280" />
                            <YAxis stroke="#6B7280" />
                            <Tooltip />
                            <Bar dataKey="Wins" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Goals Breakdown Chart */}
                    <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
                      <h3 className="font-extrabold text-sm text-gray-400 uppercase tracking-wider">H2H Goals Scored</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: selectedTeam, Goals: h2hStats.goals_scored[selectedTeam] },
                            { name: compareTeam, Goals: h2hStats.goals_scored[compareTeam] }
                          ]}>
                            <XAxis dataKey="name" stroke="#6B7280" />
                            <YAxis stroke="#6B7280" />
                            <Tooltip />
                            <Bar dataKey="Goals" fill="#10B981" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 bg-[#151D30] rounded-2xl border border-gray-800">
                  Configure comparison parameters to analyze Head-to-Head history.
                </div>
              )
            )}
          </div>
        )}


        {/* --- VIEW: MODEL INSIGHTS --- */}
        {activeTab === 'model' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Candidate Comparison */}
            <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-indigo-400">Tuned Model Candidates Performance</h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelMetrics} layout="vertical">
                    <XAxis type="number" stroke="#6B7280" domain={[0, 1]} />
                    <YAxis dataKey="name" type="category" stroke="#6B7280" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Accuracy" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="F1" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Feature Importances */}
            <div className="bg-[#151D30] border border-gray-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-base text-indigo-400">Feature Importance (CatBoost)</h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportances}>
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip />
                    <Bar dataKey="Importance" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="bg-[#151D30] border border-gray-800 p-8 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold border-b border-gray-800 pb-3 flex items-center gap-2">
              <SettingsIcon className="text-blue-500" />
              Platform Settings
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#0B0F19] border border-gray-800 rounded-2xl">
                <div>
                  <h3 className="font-bold text-sm">Theme Settings</h3>
                  <p className="text-xs text-gray-500">Toggle dark first mode</p>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>
              </div>

            </div>
          </div>
        )}

        <datalist id="teams-datalist">
          {teamsList.map(t => <option key={t} value={t} />)}
        </datalist>
      </main>
    </div>
  );
}

export default App;
