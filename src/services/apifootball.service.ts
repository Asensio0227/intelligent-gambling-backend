import axios from 'axios';
import logger from '../utils/logger';
import config from '../config/apifootball';
import { ApiFootballFixture, ApiFootballTeamStatsResponse } from '../types/apifootball.types';

const headers = {
  'x-rapidapi-key': config.apiKey,
  'x-rapidapi-host': config.host,
};

export const fetchUpcomingFixtures = async (
  fromDate: string,
  toDate: string,
  leagueId?: number,
  season?: number,
): Promise<ApiFootballFixture[]> => {
  if (!config.apiKey || !config.host) {
    logger.warn('API-Football credentials are not configured');
    return [];
  }

  const params: Record<string, string | number> = {
    from: fromDate,
    to: toDate,
    season: season ?? 2025,
    timezone: 'Africa/Johannesburg',
  };
  if (leagueId) {
    params.league = leagueId;
  }
  const url = `${config.baseUrl}/fixtures`;
  const response = await axios.get<{ response: ApiFootballFixture[] }>(url, {
    headers,
    params,
  });
  logger.info('API-Football fixtures fetched', {
    endpoint: url,
    status: response.status,
  });
  return response.data?.response || [];
};

export const fetchTeamStatistics = async (
  teamId: string,
  season: string,
): Promise<ApiFootballTeamStatsResponse | null> => {
  if (!config.apiKey || !config.host) {
    logger.warn('API-Football credentials are not configured');
    return null;
  }

  const url = `${config.baseUrl}/teams/statistics`;
  const params = { team: teamId, season };
  const response = await axios.get<{ response: ApiFootballTeamStatsResponse }>(
    url,
    { headers, params },
  );
  logger.info('API-Football team stats fetched', {
    endpoint: url,
    status: response.status,
    teamId,
    season,
  });
  return response.data?.response || null;
};
