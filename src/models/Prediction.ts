import { Document, Schema, Types, model } from 'mongoose';

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
    doubleChance?: string;
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

export interface IPrediction {
  fixtureId: Types.ObjectId;
  generatedBy: Types.ObjectId;
  userId?: Types.ObjectId | null;
  mode?: 'shared' | 'personal';
  dataSnapshot?: IDataSnapshot;
  markets?: IMarkets;
  reasoning?: IReasoning;
  tokensUsed?: ITokensUsed;
  outcome?: IOutcome;
  embedding?: { vector?: number[]; generatedAt?: Date };
}

export interface IPredictionDocument extends IPrediction, Document {}

const dataSnapshotSchema = new Schema<IDataSnapshot>(
  {
    homeForm: [String],
    awayForm: [String],
    h2hHistory: [Schema.Types.Mixed],
    homeAvgGoals: Number,
    awayAvgGoals: Number,
    leagueAvgGoals: Number,
    homeAvgCorners: Number,
    awayAvgCorners: Number,
    homeAvgYellowCards: Number,
    awayAvgYellowCards: Number,
  },
  { _id: false },
);

const marketPredictionSchema = new Schema<IMarketPrediction>(
  {
    prediction: Schema.Types.Mixed,
    confidence: Number,
    line: Number,
  },
  { _id: false },
);

const marketsSchema = new Schema<IMarkets>(
  {
    result: marketPredictionSchema,
    correctScore: marketPredictionSchema,
    goalsOverUnder: marketPredictionSchema,
    bts: marketPredictionSchema,
    cornersOverUnder: marketPredictionSchema,
    yellowCards: marketPredictionSchema,
    highestScoringHalf: marketPredictionSchema,
  },
  { _id: false },
);

const reasoningSchema = new Schema<IReasoning>(
  {
    summary: String,
    perMarket: {
      result: String,
      correctScore: String,
      goalsOverUnder: String,
      bts: String,
      cornersOverUnder: String,
      yellowCards: String,
      highestScoringHalf: String,
      doubleChance: String,
    },
  },
  { _id: false },
);

const tokensUsedSchema = new Schema<ITokensUsed>(
  {
    input: Number,
    output: Number,
    totalCost: Number,
  },
  { _id: false },
);

const outcomeSchema = new Schema<IOutcome>(
  {
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    accuracy: {
      result: Boolean,
      correctScore: Boolean,
      goalsOverUnder: Boolean,
      bts: Boolean,
      cornersOverUnder: Boolean,
      yellowCards: Boolean,
      highestScoringHalf: Boolean,
      doubleChance: Boolean,
    },
  },
  { _id: false },
);

// Atlas Vector Search index required on this collection when EMBEDDINGS_ENABLED=true:
// Field: embedding.vector | Type: vector | Dimensions: 1536 | Similarity: cosine
// Create manually in MongoDB Atlas dashboard under Search Indexes
const embeddingSchema = new Schema<{ vector?: number[]; generatedAt?: Date }>(
  {
    vector: { type: [Number], default: undefined },
    generatedAt: { type: Date, default: undefined },
  },
  { _id: false },
);

const predictionSchema = new Schema<IPredictionDocument>(
  {
    fixtureId: {
      type: Schema.Types.ObjectId,
      ref: 'Fixture',
      required: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    mode: { type: String, enum: ['shared', 'personal'], default: 'shared' },
    dataSnapshot: dataSnapshotSchema,
    markets: marketsSchema,
    reasoning: reasoningSchema,
    tokensUsed: tokensUsedSchema,
    outcome: outcomeSchema,
    embedding: embeddingSchema,
  },
  { timestamps: true },
);

predictionSchema.index({ fixtureId: 1 });
predictionSchema.index({ userId: 1 });
predictionSchema.index({ fixtureId: 1, userId: 1 });
predictionSchema.index({ 'embedding.vector': 1 }, { sparse: true });

export const Prediction = model<IPredictionDocument>(
  'Prediction',
  predictionSchema,
);
