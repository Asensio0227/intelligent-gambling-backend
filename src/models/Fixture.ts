import { Schema, model, Document } from 'mongoose';

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

export interface IFixture {
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
}

export interface IFixtureDocument extends IFixture, Document {}

const teamSchema = new Schema<ITeamInfo>(
  {
    id: String,
    name: String,
    logo: String,
  },
  { _id: false },
);

const leagueSchema = new Schema<ILeagueInfo>(
  {
    id: String,
    name: String,
    country: String,
    logo: String,
  },
  { _id: false },
);

const resultSchema = new Schema<IFixtureResult>(
  {
    homeGoals: Number,
    awayGoals: Number,
    htHomeGoals: Number,
    htAwayGoals: Number,
    corners: { home: Number, away: Number },
    yellowCards: { home: Number, away: Number },
  },
  { _id: false },
);

const fixtureSchema = new Schema<IFixtureDocument>(
  {
    fixtureId: { type: String, unique: true, required: true },
    homeTeam: teamSchema,
    awayTeam: teamSchema,
    league: leagueSchema,
    kickoff: Date,
    season: String,
    venue: String,
    status: {
      type: String,
      enum: ['NS', 'LIVE', 'FT', 'PST', 'CANC'],
      default: 'NS',
    },
    result: resultSchema,
    predictionGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

fixtureSchema.index({ kickoff: 1 });
fixtureSchema.index({ status: 1 });

export const Fixture = model<IFixtureDocument>('Fixture', fixtureSchema);
