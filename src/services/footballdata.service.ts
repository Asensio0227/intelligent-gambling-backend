import axios from 'axios';
import config from '../config/footballdata';
import { ApiFootballFixture } from '../types/apifootball.types';
import logger from '../utils/logger';

// football-data.org competition codes mapped to league info
const COMPETITIONS = [
  { code: 'WC', name: 'World Cup', country: 'World', leagueId: 1 },
  { code: 'CL', name: 'Champions League', country: 'Europe', leagueId: 2 },
  { code: 'PL', name: 'Premier League', country: 'England', leagueId: 39 },
  { code: 'PD', name: 'La Liga', country: 'Spain', leagueId: 140 },
  { code: 'SA', name: 'Serie A', country: 'Italy', leagueId: 135 },
  { code: 'BL1', name: 'Bundesliga', country: 'Germany', leagueId: 78 },
  { code: 'FL1', name: 'Ligue 1', country: 'France', leagueId: 61 },
  { code: 'PPL', name: 'Primeira Liga', country: 'Portugal', leagueId: 94 },
  { code: 'DED', name: 'Eredivisie', country: 'Netherlands', leagueId: 88 },
];

// Map football-data.org status to API-Football status format
const mapStatus = (status: string): string => {
  switch (status) {
    case 'SCHEDULED':
    case 'TIMED':
      return 'NS';
    case 'IN_PLAY':
    case 'PAUSED':
      return 'LIVE';
    case 'FINISHED':
      return 'FT';
    case 'POSTPONED':
      return 'PST';
    case 'CANCELLED':
    case 'SUSPENDED':
      return 'CANC';
    default:
      return 'NS';
  }
};

// Map football-data.org match to existing ApiFootballFixture shape
// so the rest of the codebase needs zero changes
const mapToApiFootballFixture = (
  match: any,
  competition: (typeof COMPETITIONS)[0],
): ApiFootballFixture => ({
  fixture: {
    id: match.id,
    referee: match.referees?.[0]?.name ?? null,
    timezone: 'Africa/Johannesburg',
    date: match.utcDate,
    timestamp: new Date(match.utcDate).getTime() / 1000,
    venue: {
      id: match.venue ? match.id : null,
      name: match.venue ?? null,
    },
    status: {
      long: match.status,
      short: mapStatus(match.status),
      elapsed: match.minute ?? null,
    },
  },
  league: {
    id: competition.leagueId,
    name: competition.name,
    country: competition.country,
    logo: `https://media.api-sports.io/football/leagues/${competition.leagueId}.png`,
    season: match.season?.startDate
      ? new Date(match.season.startDate).getFullYear()
      : 2026,
    round: match.matchday ? `Regular Season - ${match.matchday}` : 'Unknown',
  } as any,
  teams: {
    home: {
      id: match.homeTeam?.id,
      name: match.homeTeam?.name,
      logo: match.homeTeam?.crest ?? null,
      winner:
        match.score?.winner === 'HOME_TEAM'
          ? true
          : match.score?.winner === 'AWAY_TEAM'
            ? false
            : null,
    } as any,
    away: {
      id: match.awayTeam?.id,
      name: match.awayTeam?.name,
      logo: match.awayTeam?.crest ?? null,
      winner:
        match.score?.winner === 'AWAY_TEAM'
          ? true
          : match.score?.winner === 'HOME_TEAM'
            ? false
            : null,
    } as any,
  },
  goals: {
    home: match.score?.fullTime?.home ?? null,
    away: match.score?.fullTime?.away ?? null,
  },
  score: {
    halftime: {
      home: match.score?.halfTime?.home ?? null,
      away: match.score?.halfTime?.away ?? null,
    },
    fulltime: {
      home: match.score?.fullTime?.home ?? null,
      away: match.score?.fullTime?.away ?? null,
    },
    extratime: { home: null, away: null },
    penalty: { home: null, away: null },
  },
});

export const fetchUpcomingFixturesFromFootballData = async (
  fromDate: string,
  toDate: string,
): Promise<ApiFootballFixture[]> => {
  if (!config.apiKey) {
    logger.warn('football-data.org API key not configured');
    return [];
  }

  const allFixtures: ApiFootballFixture[] = [];

  for (const competition of COMPETITIONS) {
    try {
      const url = `${config.baseUrl}/competitions/${competition.code}/matches`;
      const response = await axios.get(url, {
        headers: { 'X-Auth-Token': config.apiKey },
        params: {
          dateFrom: fromDate,
          dateTo: toDate,
          status: 'SCHEDULED,IN_PLAY,PAUSED,TIMED,FINISHED',
        },
      });

      const matches: ApiFootballFixture[] = (response.data?.matches ?? []).map(
        (match: any) => mapToApiFootballFixture(match, competition),
      );

      allFixtures.push(...matches);

      logger.info('football-data.org fixtures fetched', {
        competition: competition.name,
        count: matches.length,
      });

      // Respect 10 calls/minute rate limit — 6 second delay between calls
      await new Promise((resolve) => setTimeout(resolve, 6000));
    } catch (err) {
      logger.error('football-data.org fetch failed', {
        competition: competition.name,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
  }

  return allFixtures;
};
