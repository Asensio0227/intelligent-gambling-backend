import { Document, Schema, Types, model } from 'mongoose';

export interface IH2HMatch {
  fixtureId?: Types.ObjectId;
  date?: Date;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  gptReasoning?: string;
  predictionAccuracy?: unknown;
}

export interface IH2HHistory {
  teamIds: string[];
  matches?: IH2HMatch[];
  lastUpdated?: Date;
}

export interface IH2HHistoryDocument extends IH2HHistory, Document {}

const h2hMatchSchema = new Schema<IH2HMatch>(
  {
    fixtureId: { type: Schema.Types.ObjectId, ref: 'Fixture' },
    date: Date,
    homeTeam: String,
    awayTeam: String,
    score: String,
    gptReasoning: String,
    predictionAccuracy: Schema.Types.Mixed,
  },
  { _id: false },
);

const h2hSchema = new Schema<IH2HHistoryDocument>(
  {
    teamIds: [{ type: String, required: true }],
    matches: [h2hMatchSchema],
    lastUpdated: Date,
  },
  { timestamps: true },
);

h2hSchema.index({ teamIds: 1 });

h2hSchema.pre('save', async function () {
  if (Array.isArray((this as any).teamIds)) {
    (this as any).teamIds = (this as any).teamIds.slice().sort();
  }
});

export const H2HHistory = model<IH2HHistoryDocument>('H2HHistory', h2hSchema);
