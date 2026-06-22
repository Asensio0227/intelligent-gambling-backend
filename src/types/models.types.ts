import { Document, Types } from 'mongoose';

// User types
export interface IBillingData {
  stripeCustomerId?: string;
  plan?: 'free' | 'basic' | 'pro';
  creditsRemaining?: number;
  creditsUsed?: number;
  billingCycleStart?: Date;
  stripeSubscriptionId?: string;
  stripeEnabled?: boolean;
}

export interface IUserData {
  name: string;
  email: string;
  password: string;
  role?: 'superadmin' | 'admin' | 'user';
  isActive?: boolean;
  billing?: IBillingData;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUserData, Document {}

// Fixture types
export interface ITeamInfo {
  id?: string;
  name?: string;
  logo?: string;
}

export interface ILeagueInfo {
  id?: string;
  name?: string;
  country?: string;
  logo?: string;
}

export interface IFixtureResult {
  homeGoals?: number;
  awayGoals?: number;
  htHomeGoals?: number;
  htAwayGoals?: number;
  corners?: { home?: number; away?: number };
  yellowCards?: { home?: number; away?: number };
}

export interface IFixtureData {
  fixtureId: string;
  homeTeam?: ITeamInfo;
  awayTeam?: ITeamInfo;
  league?: ILeagueInfo;
  kickoff?: Date;
  season?: string;
  venue?: string;
  status?: 'NS' | 'LIVE' | 'FT' | 'PST' | 'CANC';
  result?: IFixtureResult;
  predictionGenerated?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFixtureDocument extends IFixtureData, Document {}

// Prediction types
export interface IDataSnapshot {
  homeForm?: string[];
  awayForm?: string[];
  h2hHistory?: unknown[];
  homeAvgGoals?: number;
  awayAvgGoals?: number;
  leagueAvgGoals?: number;
  homeAvgCorners?: number;
  awayAvgCorners?: number;
  homeAvgYellowCards?: number;
  awayAvgYellowCards?: number;
}

export interface IMarketPrediction {
  prediction: string | boolean;
  confidence?: number;
  line?: number;
}

export interface IMarkets {
  result?: IMarketPrediction;
  correctScore?: IMarketPrediction;
  goalsOverUnder?: IMarketPrediction & { line?: number };
  bts?: IMarketPrediction;
  cornersOverUnder?: IMarketPrediction & { line?: number };
  yellowCards?: IMarketPrediction & { line?: number };
  highestScoringHalf?: IMarketPrediction;
}

export interface IReasoning {
  summary?: string;
  perMarket?: {
    result?: string;
    correctScore?: string;
    goalsOverUnder?: string;
    bts?: string;
    cornersOverUnder?: string;
    yellowCards?: string;
    highestScoringHalf?: string;
  };
}

export interface ITokensUsed {
  input?: number;
  output?: number;
  totalCost?: number;
}

export interface IOutcome {
  resolved?: boolean;
  resolvedAt?: Date;
  accuracy?: {
    result?: boolean;
    correctScore?: boolean;
    goalsOverUnder?: boolean;
    bts?: boolean;
    cornersOverUnder?: boolean;
    yellowCards?: boolean;
    highestScoringHalf?: boolean;
  };
}

export interface IPredictionData {
  fixtureId: Types.ObjectId;
  generatedBy: Types.ObjectId;
  userId?: Types.ObjectId | null;
  mode?: 'shared' | 'personal';
  dataSnapshot?: IDataSnapshot;
  markets?: IMarkets;
  reasoning?: IReasoning;
  tokensUsed?: ITokensUsed;
  outcome?: IOutcome;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPredictionDocument extends IPredictionData, Document {}

// H2H History types
export interface IH2HMatch {
  fixtureId?: Types.ObjectId;
  date?: Date;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  gptReasoning?: string;
  predictionAccuracy?: unknown;
}

export interface IH2HHistoryData {
  teamIds: string[];
  matches?: IH2HMatch[];
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IH2HHistoryDocument extends IH2HHistoryData, Document {}

// Ticket types
export interface ITicketLeg {
  predictionId: Types.ObjectId;
  fixtureId: Types.ObjectId;
  market?: string;
  selection?: string;
  confidence?: number;
  outcome?: boolean | null;
}

export interface ITicketSummary {
  totalLegs?: number;
  averageConfidence?: number;
  legsWon?: number | null;
  legsLost?: number | null;
}

export interface ITicketData {
  createdBy: Types.ObjectId;
  label?: string;
  status?: 'PENDING' | 'WON' | 'LOST' | 'PARTIAL';
  legs?: ITicketLeg[];
  summary?: ITicketSummary;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITicketDocument extends ITicketData, Document {}

// Team Stats types
export interface ITeamStatsStats {
  played?: number;
  form?: string;
  goalsFor?: { home?: number; away?: number; total?: number };
  goalsAgainst?: { home?: number; away?: number; total?: number };
  cleanSheets?: { home?: number; away?: number };
  btsPct?: number;
  avgCorners?: number;
  avgYellowCards?: number;
  firstHalfGoalsPct?: number;
}

export interface ITeamStatsData {
  teamId: string;
  season: string;
  league?: string;
  lastUpdated?: Date;
  stats?: ITeamStatsStats;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeamStatsDocument extends ITeamStatsData, Document {}

// Usage Tracking types
export interface IUsageTrackingData {
  userId: Types.ObjectId;
  month: string;
  predictionsGenerated?: number;
  tokensUsed?: number;
  estimatedCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUsageTrackingDocument extends IUsageTrackingData, Document {}

// Auto-Ticket types
export interface IAutoGenerateTicketParams {
  numberOfTickets: number;
  legsPerTicket: number;
  minConfidence: number;
  diversify: boolean;
  preferredMarkets?: string[];
}

export interface IProposedLeg {
  predictionId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: Date;
  market: string;
  selection: string;
  confidence: number;
}

export interface ITicketProposal {
  legs: IProposedLeg[];
  averageConfidence: number;
  totalLegs: number;
  label: string;
}

// Natural Language Query types
export interface IAskQueryParams {
  query: string;
}

// Embedding types
export interface IEmbeddingDocument {
  vector: number[];
  generatedAt: Date;
}

export interface ISimilarFixtureResult {
  predictionId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  date: Date;
  similarityScore: number;
  markets: Record<string, any>;
  reasoning: string;
}
