import mongoose from 'mongoose';
import {
  IUserData,
  IFixtureData,
  IPredictionData,
  ITicketData,
  IH2HHistoryData,
  ITeamStatsData,
  IUsageTrackingData,
} from '../../types/models.types';

export const createUserFactory = (
  overrides?: Partial<IUserData>,
): Partial<IUserData> => ({
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedPassword123',
  role: 'user',
  isActive: true,
  ...overrides,
});

export const createFixtureFactory = (
  overrides?: Partial<IFixtureData>,
): Partial<IFixtureData> => ({
  fixtureId: `fixture-${Date.now()}`,
  homeTeam: { id: '1', name: 'Home Team', logo: 'logo.png' },
  awayTeam: { id: '2', name: 'Away Team', logo: 'logo.png' },
  league: { id: '1', name: 'Premier League', country: 'England', logo: 'logo.png' },
  kickoff: new Date(Date.now() + 86400000),
  season: '2024',
  venue: 'Stamford Bridge',
  status: 'NS',
  predictionGenerated: false,
  ...overrides,
});

export const createPredictionFactory = (
  overrides?: Partial<IPredictionData>,
): Partial<IPredictionData> => ({
  fixtureId: new mongoose.Types.ObjectId(),
  generatedBy: new mongoose.Types.ObjectId(),
  userId: null,
  mode: 'shared',
  markets: {
    result: { prediction: 'HOME', confidence: 75 },
    bts: { prediction: true, confidence: 60 },
  },
  outcome: { resolved: false },
  ...overrides,
});

export const createTicketFactory = (
  overrides?: Partial<ITicketData>,
): Partial<ITicketData> => ({
  createdBy: new mongoose.Types.ObjectId(),
  label: 'Test Ticket',
  status: 'PENDING',
  legs: [],
  summary: { totalLegs: 0, averageConfidence: 0 },
  ...overrides,
});

export const createH2HHistoryFactory = (
  overrides?: Partial<IH2HHistoryData>,
): Partial<IH2HHistoryData> => ({
  teamIds: ['1', '2'],
  matches: [],
  lastUpdated: new Date(),
  ...overrides,
});

export const createTeamStatsFactory = (
  overrides?: Partial<ITeamStatsData>,
): Partial<ITeamStatsData> => ({
  teamId: 'team-1',
  season: '2024',
  league: 'Premier League',
  stats: {
    played: 10,
    form: 'WWDLL',
    goalsFor: { home: 15, away: 12, total: 27 },
    goalsAgainst: { home: 8, away: 10, total: 18 },
    cleanSheets: { home: 3, away: 2 },
    avgCorners: 5.5,
    avgYellowCards: 2.1,
  },
  ...overrides,
});

export const createUsageTrackingFactory = (
  overrides?: Partial<IUsageTrackingData>,
): Partial<IUsageTrackingData> => ({
  userId: new mongoose.Types.ObjectId(),
  month: '2024-01',
  predictionsGenerated: 5,
  tokensUsed: 1000,
  estimatedCost: 0.05,
  ...overrides,
});
