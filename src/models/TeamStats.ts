import { Schema, model, Document } from 'mongoose';

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

export interface ITeamStats {
  teamId: string;
  season: string;
  league?: string;
  lastUpdated?: Date;
  stats?: ITeamStatsStats;
}

export interface ITeamStatsDocument extends ITeamStats, Document {}

const statsSchema = new Schema<ITeamStatsStats>(
  {
    played: Number,
    form: String,
    goalsFor: { home: Number, away: Number, total: Number },
    goalsAgainst: { home: Number, away: Number, total: Number },
    cleanSheets: { home: Number, away: Number },
    btsPct: Number,
    avgCorners: Number,
    avgYellowCards: Number,
    firstHalfGoalsPct: Number,
  },
  { _id: false },
);

const teamStatsSchema = new Schema<ITeamStatsDocument>(
  {
    teamId: { type: String, required: true },
    season: { type: String, required: true },
    league: String,
    lastUpdated: Date,
    stats: statsSchema,
  },
  { timestamps: true },
);

teamStatsSchema.index({ teamId: 1, season: 1 }, { unique: true });

export const TeamStats = model<ITeamStatsDocument>('TeamStats', teamStatsSchema);
