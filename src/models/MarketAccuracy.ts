import { Schema, model, Document } from 'mongoose';

export interface IMarketAccuracyDocument extends Document {
  market: string;
  totalResolved: number;
  correct: number;
  accuracyPct: number;
  updatedAt: Date;
}

const marketAccuracySchema = new Schema<IMarketAccuracyDocument>(
  {
    market: { type: String, required: true, unique: true },
    totalResolved: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    accuracyPct: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const MarketAccuracy = model<IMarketAccuracyDocument>('MarketAccuracy', marketAccuracySchema);
